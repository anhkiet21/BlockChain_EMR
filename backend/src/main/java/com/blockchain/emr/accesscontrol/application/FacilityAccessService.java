package com.blockchain.emr.accesscontrol.application;

import static com.blockchain.emr.accesscontrol.api.FacilityAccessModels.*;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.accesscontrol.FacilityAccessGrant;
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
    private final BlockchainService blockchain;

    public FacilityAccessService(
            PatientProfileRepository patients,
            DoctorProfileRepository doctors,
            WalletAddressRepository wallets,
            HealthcareFacilityService facilities,
            FacilityAccessRequestRepository requests,
            FacilityAccessGrantRepository grants,
            BlockchainService blockchain) {
        this.patients = patients;
        this.doctors = doctors;
        this.wallets = wallets;
        this.facilities = facilities;
        this.requests = requests;
        this.grants = grants;
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
        if (canDoctorAccessPatient(doctorUserId, patient.getId())) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Facility already has patient access");
        }
        if (requests.existsByPatientProfileIdAndFacilityIdAndStatus(
                patient.getId(), facility.getId(), FacilityAccessRequestStatus.PENDING)) {
            throw new ApplicationException(ErrorCode.CONFLICT, "A pending request already exists");
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
        syncGrant(patient, request.getFacility(), true, transactionHash);
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
        return grantResponse(syncGrant(patient, facility, request.granted(), transactionHash));
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
        var state = blockchain.getTransactionState(transactionHash);
        if (state.status() == BlockchainService.TransactionState.Status.PENDING) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Transaction has not been mined");
        }
        if (state.status() != BlockchainService.TransactionState.Status.SUCCESS
                || blockchain.hasFacilityAccess(patientWallet, facilityId) != expectedGranted) {
            throw new AccessDeniedException("Blockchain facility access does not match the request");
        }
    }

    private FacilityAccessGrant syncGrant(
            PatientProfile patient,
            com.blockchain.emr.facility.domain.HealthcareFacility facility,
            boolean active,
            String transactionHash) {
        FacilityAccessGrant grant = grants.findByPatientProfileIdAndFacilityId(
                        patient.getId(), facility.getId())
                .orElseGet(() -> new FacilityAccessGrant(patient, facility, active, transactionHash));
        grant.update(active, transactionHash);
        return grants.save(grant);
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
}
