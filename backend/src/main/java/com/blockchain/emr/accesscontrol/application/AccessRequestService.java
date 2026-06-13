package com.blockchain.emr.accesscontrol.application;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.accesscontrol.api.dto.*;
import com.blockchain.emr.accesscontrol.domain.AccessRequest;
import com.blockchain.emr.accesscontrol.infrastructure.AccessRequestRepository;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

@Service
public class AccessRequestService {

    private final AccessRequestRepository accessRequests;
    private final PatientProfileRepository patients;
    private final DoctorProfileRepository doctors;
    private final WalletAddressRepository wallets;

    public AccessRequestService(
            AccessRequestRepository accessRequests,
            PatientProfileRepository patients,
            DoctorProfileRepository doctors,
            WalletAddressRepository wallets) {
        this.accessRequests = accessRequests;
        this.patients = patients;
        this.doctors = doctors;
        this.wallets = wallets;
    }

    /**
     * Doctor sends a request to access a patient's records.
     * Identity comes from JWT principal, never from client-supplied userId.
     */
    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #doctorUserId == authentication.principal.id")
    public AccessRequestResponse sendRequest(Long doctorUserId, SendAccessRequestRequest request) {
        DoctorProfile doctor = doctors.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        if (!doctor.isVerified()) {
            throw new ApplicationException(ErrorCode.ACCESS_DENIED, "Doctor must be verified to send access requests");
        }
        PatientProfile patient = patients.findById(request.patientProfileId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        // Prevent duplicate PENDING requests
        boolean alreadyPending = accessRequests.findByPatientProfileIdAndDoctorProfileIdAndStatus(
                patient.getId(), doctor.getId(), "PENDING").isPresent();
        if (alreadyPending) {
            throw new ApplicationException(ErrorCode.CONFLICT, "A pending request already exists");
        }

        AccessRequest saved = accessRequests.save(new AccessRequest(patient, doctor, request.reason().trim()));
        return toResponse(saved);
    }

    /**
     * Patient views all access requests directed to them.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public PageResponse<AccessRequestResponse> listForPatient(Long patientUserId, int page, int size) {
        PatientProfile patient = patients.findByUserId(patientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
        var result = accessRequests.findByPatientProfileIdOrderByCreatedAtDesc(
                patient.getId(), PageRequest.of(Math.max(page, 0), Math.min(size, 50)));
        return PageResponse.from(result.map(this::toResponse));
    }

    /**
     * Doctor views all their own sent requests.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('DOCTOR') and #doctorUserId == authentication.principal.id")
    public PageResponse<AccessRequestResponse> listForDoctor(Long doctorUserId, int page, int size) {
        DoctorProfile doctor = doctors.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        var result = accessRequests.findByDoctorProfileIdOrderByCreatedAtDesc(
                doctor.getId(), PageRequest.of(Math.max(page, 0), Math.min(size, 50)));
        return PageResponse.from(result.map(this::toResponse));
    }

    /**
     * Patient approves the request (they already signed the blockchain tx themselves).
     * The transactionHash confirms the on-chain grant was made.
     */
    @Transactional
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public AccessRequestResponse approve(Long patientUserId, Long requestId, ApproveAccessRequestRequest body) {
        AccessRequest request = findAndVerifyOwnership(requestId, patientUserId);
        if (!"PENDING".equals(request.getStatus())) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Request is no longer pending");
        }
        request.approve(body.transactionHash().trim());
        return toResponse(accessRequests.save(request));
    }

    /**
     * Patient rejects the request.
     */
    @Transactional
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public AccessRequestResponse reject(Long patientUserId, Long requestId, RejectAccessRequestRequest body) {
        AccessRequest request = findAndVerifyOwnership(requestId, patientUserId);
        if (!"PENDING".equals(request.getStatus())) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Request is no longer pending");
        }
        request.reject(body.rejectedReason() == null ? "" : body.rejectedReason().trim());
        return toResponse(accessRequests.save(request));
    }

    private AccessRequest findAndVerifyOwnership(Long requestId, Long patientUserId) {
        AccessRequest request = accessRequests.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Access request not found"));
        // Object-level authorization: patient owns this request
        if (!request.getPatientProfile().getUser().getId().equals(patientUserId)) {
            throw new AccessDeniedException("Access request does not belong to current patient");
        }
        return request;
    }

    private AccessRequestResponse toResponse(AccessRequest r) {
        PatientProfile patient = r.getPatientProfile();
        DoctorProfile doctor = r.getDoctorProfile();
        return new AccessRequestResponse(
                r.getId(),
                patient.getId(),
                patient.getUser().getFullName(),
                doctor.getId(),
                doctor.getDoctorCode(),
                doctor.getUser().getFullName(),
                firstWallet(doctor),
                r.getReason(),
                r.getStatus(),
                r.getTransactionHash(),
                r.getRejectedReason(),
                r.getRespondedAt(),
                r.getCreatedAt());
    }

    private String firstWallet(DoctorProfile doctor) {
        return wallets.findAllByUserId(doctor.getUser().getId()).stream()
                .findFirst()
                .map(wallet -> wallet.getAddress())
                .orElse(null);
    }
}
