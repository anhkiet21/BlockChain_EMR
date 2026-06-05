package com.blockchain.emr.patient.application;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;
import com.blockchain.emr.patient.api.dto.PatientProfileRequest;
import com.blockchain.emr.patient.api.dto.PatientProfileResponse;
import com.blockchain.emr.patient.api.dto.PatientSummaryResponse;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

@Service
public class PatientProfileService {

    private final PatientProfileRepository patientProfileRepository;
    private final UserRepository userRepository;

    public PatientProfileService(
            PatientProfileRepository patientProfileRepository,
            UserRepository userRepository) {
        this.patientProfileRepository = patientProfileRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    public PatientProfileResponse upsertMyProfile(Long userId, PatientProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.updateFullName(request.fullName().trim());
        PatientProfile profile = patientProfileRepository.findByUserId(userId)
                .orElseGet(() -> new PatientProfile(user));
        profile.update(
                request.dateOfBirth(),
                request.gender(),
                blankToNull(request.phone()),
                blankToNull(request.address()),
                blankToNull(request.emergencyContactName()),
                blankToNull(request.emergencyContactPhone()),
                blankToNull(request.bloodType()));
        return toResponse(patientProfileRepository.save(profile));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    public PatientProfileResponse getMyProfile(Long userId) {
        return patientProfileRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public PatientProfileResponse getById(Long profileId) {
        return patientProfileRepository.findById(profileId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN') or @profileAuthorization.isVerifiedDoctor(authentication)")
    public PageResponse<PatientSummaryResponse> search(String query, int page, int size) {
        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.length() < 3) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Search query must contain at least 3 characters");
        }
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 20));
        Page<PatientSummaryResponse> result = patientProfileRepository
                .search(
                        normalizedQuery,
                        PageRequest.of(safePage, safeSize, Sort.by("patientCode").ascending()))
                .map(this::toSummary);
        return PageResponse.from(result);
    }

    private PatientSummaryResponse toSummary(PatientProfile profile) {
        return new PatientSummaryResponse(
                profile.getId(),
                profile.getPatientCode(),
                profile.getUser().getFullName(),
                profile.getDateOfBirth(),
                profile.getGender());
    }

    private PatientProfileResponse toResponse(PatientProfile profile) {
        User user = profile.getUser();
        return new PatientProfileResponse(
                profile.getId(),
                user.getId(),
                profile.getPatientCode(),
                user.getEmail(),
                user.getFullName(),
                profile.getDateOfBirth(),
                profile.getGender(),
                profile.getPhone(),
                profile.getAddress(),
                profile.getEmergencyContactName(),
                profile.getEmergencyContactPhone(),
                profile.getBloodType());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
