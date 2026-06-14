package com.blockchain.emr.accesscontrol.application;

import static com.blockchain.emr.accesscontrol.api.FacilityAccessModels.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.accesscontrol.FacilityAccessGrant;
import com.blockchain.emr.accesscontrol.FacilityAccessAudit;
import com.blockchain.emr.accesscontrol.FacilityAccessAuditRepository;
import com.blockchain.emr.accesscontrol.EmergencyAccessGrant;
import com.blockchain.emr.accesscontrol.EmergencyAccessGrantRepository;
import com.blockchain.emr.accesscontrol.api.AdminFacilityAccessAuditResponse;
import com.blockchain.emr.accesscontrol.FacilityAccessGrantRepository;
import com.blockchain.emr.accesscontrol.FacilityAccessRequest;
import com.blockchain.emr.accesscontrol.FacilityAccessRequestRepository;
import com.blockchain.emr.accesscontrol.FacilityAccessRequestStatus;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.facility.application.HealthcareFacilityService;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

@Service
public class FacilityAccessService {
    private final PatientProfileRepository patients;
    private final DoctorProfileRepository doctors;
    private final WalletAddressRepository wallets;
    private final HealthcareFacilityService facilities;
    private final FacilityAccessRequestRepository requests;
    private final FacilityAccessGrantRepository grants;
    private final FacilityAccessAuditRepository audits;
    private final EmergencyAccessGrantRepository emergencyAccess;
    private final BlockchainService blockchain;

    public FacilityAccessService(
            PatientProfileRepository patients,
            DoctorProfileRepository doctors,
            WalletAddressRepository wallets,
            HealthcareFacilityService facilities,
            FacilityAccessRequestRepository requests,
            FacilityAccessGrantRepository grants,
            FacilityAccessAuditRepository audits,
            EmergencyAccessGrantRepository emergencyAccess,
            BlockchainService blockchain) {
        this.patients = patients;
        this.doctors = doctors;
        this.wallets = wallets;
        this.facilities = facilities;
        this.requests = requests;
        this.grants = grants;
        this.audits = audits;
        this.emergencyAccess = emergencyAccess;
        this.blockchain = blockchain;
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #doctorUserId == authentication.principal.id")
    public AccessRequestResponse createRequest(Long doctorUserId, CreateAccessRequest request) {
        DoctorProfile doctor = requireEligibleDoctor(doctorUserId);
        requireWallet(doctorUserId);
        String identifier = request.patientIdentifier().trim();
        PatientProfile patient = patients.findByUserIdentityNumberIgnoreCase(identifier)
                .or(() -> patients.findByPatientCodeIgnoreCase(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        requireWallet(patient.getUser().getId());
        var facility = doctor.getHealthcareFacility();
        if (grants.existsByPatientProfileIdAndFacilityIdAndActiveTrue(patient.getId(), facility.getId())) {
            throw new ApplicationException(
                    ErrorCode.CONFLICT,
                    "Cơ sở y tế đã được cấp quyền truy cập hồ sơ bệnh nhân này.");
        }
        if (requests.existsByPatientProfileIdAndFacilityIdAndStatus(
                patient.getId(), facility.getId(), FacilityAccessRequestStatus.PENDING)) {
            throw new ApplicationException(
                    ErrorCode.CONFLICT,
                    "Cơ sở y tế đã gửi yêu cầu truy cập và đang chờ bệnh nhân phản hồi.");
        }
        return response(requests.save(new FacilityAccessRequest(
                patient, facility, doctor, request.reason())));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public PageResponse<AccessRequestResponse> patientRequests(Long patientUserId, int page, int size) {
        requirePatient(patientUserId);
        int safeSize = Math.max(1, Math.min(size, 100));
        return PageResponse.from(requests.findByPatientProfileUserId(
                        patientUserId,
                        PageRequest.of(Math.max(page, 0), safeSize, Sort.by("createdAt").descending()))
                .map(this::response));
    }

    @Transactional
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public AccessRequestResponse reject(Long patientUserId, Long requestId) {
        FacilityAccessRequest request = requireOwnedRequest(patientUserId, requestId);
        try {
            request.reject();
        } catch (IllegalStateException exception) {
            throw new ApplicationException(ErrorCode.CONFLICT, exception.getMessage());
        }
        return response(request);
    }

    @Transactional
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public AccessRequestResponse approve(Long patientUserId, Long requestId, String transactionHash) {
        FacilityAccessRequest request = requireOwnedRequest(patientUserId, requestId);
        PatientProfile patient = request.getPatientProfile();
        String patientWallet = requireWallet(patientUserId).getAddress();
        verifyFacilityTransaction(patientWallet, request.getFacility().getFacilityId(), transactionHash, true);
        syncGrant(patient, patientWallet, request.getFacility(), true, transactionHash);
        try {
            request.approve(transactionHash);
        } catch (IllegalStateException exception) {
            throw new ApplicationException(ErrorCode.CONFLICT, exception.getMessage());
        }
        return response(request);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public PreparedFacilityTransactionResponse prepare(
            Long patientUserId, FacilityAccessChangeRequest request) {
        requirePatient(patientUserId);
        String patientWallet = requireWallet(patientUserId).getAddress();
        var facility = findFacilityForChange(request);
        boolean currentlyGranted = blockchain.hasFacilityAccess(patientWallet, facility.getFacilityId());
        if (currentlyGranted == request.granted()) {
            String message = request.granted()
                    ? "Cơ sở y tế đã được cấp quyền trên blockchain."
                    : "Cơ sở y tế đã được thu hồi quyền trên blockchain.";
            throw new ApplicationException(ErrorCode.CONFLICT, message);
        }
        var prepared = blockchain.prepareFacilityAccessTransaction(
                patientWallet, facility.getFacilityId(), request.granted());
        return new PreparedFacilityTransactionResponse(
                prepared.from(), prepared.to(), prepared.data(), prepared.chainId(), prepared.value(),
                facility.getFacilityId(), request.granted());
    }

    @Transactional
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public FacilityGrantResponse confirm(
            Long patientUserId,
            FacilityAccessChangeRequest request,
            String transactionHash) {
        PatientProfile patient = requirePatient(patientUserId);
        String patientWallet = requireWallet(patientUserId).getAddress();
        var facility = findFacilityForChange(request);
        verifyFacilityTransaction(patientWallet, facility.getFacilityId(), transactionHash, request.granted());
        return grantResponse(syncGrant(patient, patientWallet, facility, request.granted(), transactionHash));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public List<FacilityGrantResponse> grants(Long patientUserId) {
        requirePatient(patientUserId);
        return grants.findByPatientProfileUserIdOrderByFacilityNameAsc(patientUserId).stream()
                .map(this::grantResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('DOCTOR') and #doctorUserId == authentication.principal.id")
    public PageResponse<AuthorizedPatientResponse> authorizedPatients(
            Long doctorUserId, int page, int size) {
        DoctorProfile doctor = requireEligibleDoctor(doctorUserId);
        int safeSize = Math.max(1, Math.min(size, 50));
        return PageResponse.from(grants.findActivePatientsByFacilityId(
                        doctor.getHealthcareFacility().getId(),
                        PageRequest.of(Math.max(page, 0), safeSize))
                .map(grant -> {
                    PatientProfile patient = grant.getPatientProfile();
                    return new AuthorizedPatientResponse(
                            patient.getId(),
                            patient.getPatientCode(),
                            patient.getUser().getFullName(),
                            patient.getDateOfBirth(),
                            patient.getGender());
                }));
    }

    @Transactional(readOnly = true)
    public boolean canDoctorAccessPatient(Long doctorUserId, Long patientProfileId) {
        DoctorProfile doctor = doctors.findByUserId(doctorUserId).orElse(null);
        PatientProfile patient = patients.findById(patientProfileId).orElse(null);
        if (doctor == null || patient == null || !doctor.isVerified()
                || doctor.getHealthcareFacility() == null || !doctor.getHealthcareFacility().isActive()) {
            return false;
        }
        var doctorWallet = wallets.findFirstByUserIdOrderByIdAsc(doctorUserId);
        var patientWallet = wallets.findFirstByUserIdOrderByIdAsc(patient.getUser().getId());
        if (doctorWallet.isEmpty() || patientWallet.isEmpty()) {
            return false;
        }
        boolean synchronizedGrant = grants.existsByPatientProfileIdAndFacilityIdAndActiveTrue(
                patient.getId(), doctor.getHealthcareFacility().getId());
        return synchronizedGrant && blockchain.hasFacilityAccess(
                patientWallet.get().getAddress(), doctor.getHealthcareFacility().getFacilityId());
    }

    @Transactional(readOnly = true)
    public boolean canDoctorReadPatient(Long doctorUserId, Long patientProfileId) {
        return canDoctorAccessPatient(doctorUserId, patientProfileId)
                || hasActiveEmergencyAccess(doctorUserId, patientProfileId);
    }

    @Transactional(readOnly = true)
    public boolean hasActiveEmergencyAccess(Long doctorUserId, Long patientProfileId) {
        DoctorProfile doctor = doctors.findByUserId(doctorUserId).orElse(null);
        if (doctor == null || !doctor.isVerified()
                || doctor.getHealthcareFacility() == null || !doctor.getHealthcareFacility().isActive()) {
            return false;
        }
        return emergencyAccess.existsByPatientProfileIdAndFacilityIdAndEndedAtIsNullAndExpiresAtAfter(
                patientProfileId,
                doctor.getHealthcareFacility().getId(),
                Instant.now());
    }

    @Transactional(readOnly = true)
    public Optional<EmergencyAccessResponse> activeEmergencyAccess(Long doctorUserId, Long patientProfileId) {
        DoctorProfile doctor = requireEligibleDoctor(doctorUserId);
        return emergencyAccess.findFirstByPatientProfileIdAndFacilityIdAndEndedAtIsNullAndExpiresAtAfterOrderByExpiresAtDesc(
                        patientProfileId,
                        doctor.getHealthcareFacility().getId(),
                        Instant.now())
                .map(grant -> emergencyResponse(grant, Instant.now()));
    }

    @Transactional(readOnly = true)
    public Optional<EmergencyAccessResponse> emergencyAccessContextForAudit(
            Long doctorUserId,
            Long patientProfileId,
            Instant occurredAt) {
        return emergencyAccess.findEmergencyContextForAudit(patientProfileId, doctorUserId, occurredAt).stream()
                .findFirst()
                .map(grant -> emergencyResponse(grant, occurredAt));
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #doctorUserId == authentication.principal.id")
    public EmergencyAccessResponse activateEmergencyAccess(Long doctorUserId, EmergencyAccessRequest request) {
        DoctorProfile doctor = requireEligibleDoctor(doctorUserId);
        String identifier = request.patientIdentifier().trim();
        PatientProfile patient = patients.findByUserIdentityNumberIgnoreCase(identifier)
                .or(() -> patients.findByPatientCodeIgnoreCase(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        requireWallet(doctorUserId);
        requireWallet(patient.getUser().getId());
        var facility = doctor.getHealthcareFacility();
        Instant now = Instant.now();
        if (emergencyAccess.existsByPatientProfileIdAndFacilityIdAndEndedAtIsNullAndExpiresAtAfter(
                patient.getId(), facility.getId(), now)) {
            throw new ApplicationException(
                    ErrorCode.CONFLICT,
                    "Cơ sở y tế đang có quyền truy cập khẩn cấp còn hiệu lực với bệnh nhân này.");
        }
        int durationMinutes = request.durationMinutes() == null ? 120 : request.durationMinutes();
        if (durationMinutes < 15 || durationMinutes > 360) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Thời hạn khẩn cấp phải từ 15 đến 360 phút.");
        }
        EmergencyAccessGrant saved = emergencyAccess.save(new EmergencyAccessGrant(
                patient,
                facility,
                doctor,
                request.caseCode().trim(),
                request.reason().trim(),
                now.plusSeconds(durationMinutes * 60L)));
        return emergencyResponse(saved, now);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public PageResponse<EmergencyAccessResponse> patientEmergencyAccessLogs(Long patientUserId, int page, int size) {
        requirePatient(patientUserId);
        int safeSize = Math.max(1, Math.min(size, 100));
        Instant now = Instant.now();
        return PageResponse.from(emergencyAccess.findByPatientProfileUserIdOrderByCreatedAtDescIdDesc(
                        patientUserId,
                        PageRequest.of(Math.max(page, 0), safeSize))
                .map(grant -> emergencyResponse(grant, now)));
    }

    private DoctorProfile requireEligibleDoctor(Long userId) {
        DoctorProfile doctor = doctors.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        if (!doctor.isVerified() || doctor.getHealthcareFacility() == null
                || !doctor.getHealthcareFacility().isActive()) {
            throw new AccessDeniedException("Verified doctor with an active facility is required");
        }
        return doctor;
    }

    private PatientProfile requirePatient(Long userId) {
        return patients.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
    }

    private WalletAddress requireWallet(Long userId) {
        return wallets.findFirstByUserIdOrderByIdAsc(userId)
                .orElseThrow(() -> new AccessDeniedException("A verified wallet is required"));
    }

    private FacilityAccessRequest requireOwnedRequest(Long userId, Long requestId) {
        FacilityAccessRequest request = requests.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Access request not found"));
        if (!request.getPatientProfile().getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Access request does not belong to the current patient");
        }
        return request;
    }

    private void verifyFacilityTransaction(
            String patientWallet, String facilityId, String transactionHash, boolean expectedGranted) {
        var expected = blockchain.prepareFacilityAccessTransaction(patientWallet, facilityId, expectedGranted);
        var transaction = blockchain.getFacilityAccessTransaction(transactionHash);
        if (transaction.status() == BlockchainService.TransactionState.Status.PENDING) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Transaction has not been mined");
        }
        var event = transaction.facilityAccessEvent();
        boolean valid = transaction.status() == BlockchainService.TransactionState.Status.SUCCESS
                && equalsIgnoreCase(transaction.from(), expected.from())
                && equalsIgnoreCase(transaction.to(), expected.to())
                && equalsIgnoreCase(transaction.input(), expected.data())
                && event != null
                && equalsIgnoreCase(event.transactionHash(), transaction.transactionHash())
                && equalsIgnoreCase(event.patientWallet(), patientWallet)
                && event.facilityId().equalsIgnoreCase(facilityId)
                && event.granted() == expectedGranted
                && blockchain.hasFacilityAccess(patientWallet, facilityId) == expectedGranted;
        if (!valid) {
            throw new AccessDeniedException("Blockchain facility access does not match the request");
        }
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<AdminFacilityAccessAuditResponse> adminAudit(int page, int size) {
        int safeSize = Math.max(1, Math.min(size, 100));
        return PageResponse.from(audits.findAllByOrderByOccurredAtDescIdDesc(
                        PageRequest.of(Math.max(page, 0), safeSize))
                .map(audit -> new AdminFacilityAccessAuditResponse(
                        audit.getId(),
                        audit.isGranted() ? "GRANT_ACCESS" : "REVOKE_ACCESS",
                        audit.getPatientProfile().getUser().getFullName(),
                        audit.getPatientWallet(),
                        audit.getFacility().getFacilityId(),
                        audit.getFacility().getName(),
                        audit.getBlockchainTxHash(),
                        audit.getOccurredAt())));
    }

    private boolean equalsIgnoreCase(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }

    private FacilityAccessGrant syncGrant(
            PatientProfile patient,
            String patientWallet,
            com.blockchain.emr.facility.domain.HealthcareFacility facility,
            boolean active,
            String transactionHash) {
        FacilityAccessGrant grant = grants.findByPatientProfileIdAndFacilityId(
                        patient.getId(), facility.getId())
                .orElseGet(() -> new FacilityAccessGrant(patient, facility, active, transactionHash));
        grant.update(active, transactionHash);
        FacilityAccessGrant saved = grants.save(grant);
        audits.save(new FacilityAccessAudit(patient, facility, patientWallet, active, transactionHash));
        return saved;
    }

    private com.blockchain.emr.facility.domain.HealthcareFacility findFacilityForChange(
            FacilityAccessChangeRequest request) {
        return request.granted()
                ? facilities.findActiveByFacilityId(request.facilityId())
                : facilities.findByFacilityId(request.facilityId());
    }

    private AccessRequestResponse response(FacilityAccessRequest request) {
        return new AccessRequestResponse(
                request.getId(), request.getFacility().getFacilityId(), request.getFacility().getName(),
                request.getRequestedByDoctor().getUser().getFullName(), request.getReason(), request.getStatus(),
                request.getBlockchainTxHash(), request.getCreatedAt(), request.getRespondedAt());
    }

    private FacilityGrantResponse grantResponse(FacilityAccessGrant grant) {
        return new FacilityGrantResponse(
                grant.getFacility().getFacilityId(), grant.getFacility().getName(), grant.isActive(),
                grant.getBlockchainTxHash(), grant.getUpdatedAt());
    }

    private EmergencyAccessResponse emergencyResponse(EmergencyAccessGrant grant, Instant now) {
        return new EmergencyAccessResponse(
                grant.getId(),
                grant.getPatientProfile().getId(),
                grant.getPatientProfile().getPatientCode(),
                grant.getPatientProfile().getUser().getFullName(),
                grant.getFacility().getFacilityId(),
                grant.getFacility().getName(),
                grant.getDoctorProfile().getUser().getFullName(),
                grant.getCaseCode(),
                grant.getReason(),
                grant.getCreatedAt(),
                grant.getExpiresAt(),
                grant.isActive(now));
    }
}
