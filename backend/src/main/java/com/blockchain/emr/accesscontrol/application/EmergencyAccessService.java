package com.blockchain.emr.accesscontrol.application;

import java.time.Instant;
import java.util.Locale;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.web3j.crypto.Hash;

import com.blockchain.emr.accesscontrol.api.dto.*;
import com.blockchain.emr.accesscontrol.domain.EmergencyAccessRecord;
import com.blockchain.emr.accesscontrol.infrastructure.EmergencyAccessRepository;
import com.blockchain.emr.auth.domain.WalletAddress;
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
public class EmergencyAccessService {

    private static final long MAX_DURATION_SECONDS = 24 * 60 * 60L; // 24 hours

    private final EmergencyAccessRepository emergencyRepository;
    private final PatientProfileRepository patients;
    private final DoctorProfileRepository doctors;
    private final WalletAddressRepository wallets;

    public EmergencyAccessService(
            EmergencyAccessRepository emergencyRepository,
            PatientProfileRepository patients,
            DoctorProfileRepository doctors,
            WalletAddressRepository wallets) {
        this.emergencyRepository = emergencyRepository;
        this.patients = patients;
        this.doctors = doctors;
        this.wallets = wallets;
    }

    /**
     * Doctor verifies an emergency access transaction that they signed with MetaMask.
     * Stores the plaintext reason in MySQL; only the keccak256 hash goes on-chain.
     */
    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #doctorUserId == authentication.principal.id")
    public EmergencyAccessResponse verify(Long doctorUserId, VerifyEmergencyAccessRequest request) {
        DoctorProfile doctor = doctors.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        PatientProfile patient = patients.findById(request.patientProfileId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        if (request.durationSeconds() <= 0 || request.durationSeconds() > MAX_DURATION_SECONDS) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Duration must be between 1 and 86400 seconds");
        }

        String normalizedPatientWallet = normalize(request.patientWallet());
        String normalizedDoctorWallet  = normalize(request.doctorWallet());

        requireWalletOwner(patient.getUser().getId(), normalizedPatientWallet);
        requireWalletOwner(doctor.getUser().getId(), normalizedDoctorWallet);

        String reasonHash = keccak256(request.reason().trim());
        Instant expiresAt = Instant.now().plusSeconds(request.durationSeconds());

        EmergencyAccessRecord record = new EmergencyAccessRecord(
                patient, doctor, normalizedPatientWallet, normalizedDoctorWallet,
                request.reason().trim(), reasonHash, request.transactionHash().trim(), expiresAt);
        return toResponse(emergencyRepository.save(record));
    }

    /**
     * Patient views all emergency accesses triggered against their account.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #patientUserId == authentication.principal.id")
    public PageResponse<EmergencyAccessResponse> listForPatient(Long patientUserId, int page, int size) {
        PatientProfile patient = patients.findByUserId(patientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
        var result = emergencyRepository.findByPatientProfileIdOrderByCreatedAtDesc(
                patient.getId(), PageRequest.of(Math.max(page, 0), Math.min(size, 50)));
        return PageResponse.from(result.map(this::toResponse));
    }

    /**
     * Doctor views their own emergency access records.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('DOCTOR') and #doctorUserId == authentication.principal.id")
    public PageResponse<EmergencyAccessResponse> listForDoctor(Long doctorUserId, int page, int size) {
        DoctorProfile doctor = doctors.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        var result = emergencyRepository.findByDoctorProfileIdOrderByCreatedAtDesc(
                doctor.getId(), PageRequest.of(Math.max(page, 0), Math.min(size, 50)));
        return PageResponse.from(result.map(this::toResponse));
    }

    private void requireWalletOwner(Long userId, String address) {
        boolean owned = wallets.findByAddress(address).map(WalletAddress::getUser)
                .map(u -> u.getId().equals(userId)).orElse(false);
        if (!owned) throw new AccessDeniedException("Wallet does not belong to the expected account");
    }

    private EmergencyAccessResponse toResponse(EmergencyAccessRecord r) {
        boolean active = r.getExpiresAt().isAfter(Instant.now());
        return new EmergencyAccessResponse(
                r.getId(),
                r.getPatientProfile().getId(),
                r.getPatientProfile().getUser().getFullName(),
                r.getDoctorProfile().getId(),
                r.getDoctorProfile().getUser().getFullName(),
                r.getPatientWallet(),
                r.getDoctorWallet(),
                r.getReason(),
                r.getTransactionHash(),
                r.getExpiresAt(),
                r.getCreatedAt(),
                active);
    }

    private String normalize(String address) {
        return address == null ? "" : address.toLowerCase(Locale.ROOT);
    }

    private String keccak256(String input) {
        return Hash.sha3String(input);
    }
}
