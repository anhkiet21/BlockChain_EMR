package com.blockchain.emr.institution.application;

import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.institution.api.dto.DoctorAssociationResponse;
import com.blockchain.emr.institution.api.dto.InstitutionProfileRequest;
import com.blockchain.emr.institution.api.dto.InstitutionProfileResponse;
import com.blockchain.emr.institution.domain.InstitutionProfile;
import com.blockchain.emr.institution.infrastructure.InstitutionProfileRepository;

@Service
public class InstitutionProfileService {

    private final InstitutionProfileRepository institutionRepository;
    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorRepository;

    public InstitutionProfileService(
            InstitutionProfileRepository institutionRepository,
            UserRepository userRepository,
            DoctorProfileRepository doctorRepository) {
        this.institutionRepository = institutionRepository;
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
    }

    @Transactional
    @PreAuthorize("hasRole('INSTITUTION') and #userId == authentication.principal.id")
    public InstitutionProfileResponse upsertMyProfile(Long userId, InstitutionProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        InstitutionProfile existing = institutionRepository.findByUserId(userId).orElse(null);

        String licenseNumber = request.licenseNumber().trim();
        boolean duplicateLicense = existing == null
                ? institutionRepository.existsByLicenseNumber(licenseNumber)
                : institutionRepository.existsByLicenseNumberAndUserIdNot(licenseNumber, userId);
        if (duplicateLicense) {
            throw new ApplicationException(ErrorCode.CONFLICT, "License number already in use by another institution");
        }

        InstitutionProfile profile;
        if (existing == null) {
            profile = new InstitutionProfile(user, request.institutionName().trim(), licenseNumber);
        } else {
            profile = existing;
            profile.update(
                    request.institutionName().trim(),
                    licenseNumber,
                    blankToNull(request.address()),
                    blankToNull(request.phone()),
                    blankToNull(request.website()));
        }
        return toResponse(institutionRepository.save(profile));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('INSTITUTION') and #userId == authentication.principal.id")
    public InstitutionProfileResponse getMyProfile(Long userId) {
        return institutionRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Institution profile not found"));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public List<InstitutionProfileResponse> listActive() {
        return institutionRepository.findAll().stream()
                .filter(InstitutionProfile::isActive)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('INSTITUTION') and #userId == authentication.principal.id")
    public List<DoctorAssociationResponse> listDoctors(Long userId) {
        InstitutionProfile institution = requireMyInstitution(userId);
        return doctorRepository.findByInstitutionProfileId(institution.getId())
                .stream().map(this::toDoctorResponse).toList();
    }

    @Transactional
    @PreAuthorize("hasRole('INSTITUTION') and #userId == authentication.principal.id")
    public DoctorAssociationResponse approveDoctor(Long userId, Long doctorId) {
        InstitutionProfile institution = requireMyInstitution(userId);
        DoctorProfile doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        if (doctor.getInstitutionProfile() == null
                || !doctor.getInstitutionProfile().getId().equals(institution.getId())) {
            throw new AccessDeniedException("Doctor does not belong to this institution");
        }
        doctor.setInstitutionStatus("APPROVED");
        return toDoctorResponse(doctorRepository.save(doctor));
    }

    @Transactional
    @PreAuthorize("hasRole('INSTITUTION') and #userId == authentication.principal.id")
    public DoctorAssociationResponse rejectDoctor(Long userId, Long doctorId) {
        InstitutionProfile institution = requireMyInstitution(userId);
        DoctorProfile doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        if (doctor.getInstitutionProfile() == null
                || !doctor.getInstitutionProfile().getId().equals(institution.getId())) {
            throw new AccessDeniedException("Doctor does not belong to this institution");
        }
        doctor.setInstitutionStatus("REJECTED");
        return toDoctorResponse(doctorRepository.save(doctor));
    }

    private InstitutionProfile requireMyInstitution(Long userId) {
        return institutionRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution profile not found"));
    }

    public InstitutionProfileResponse toResponse(InstitutionProfile p) {
        return new InstitutionProfileResponse(
                p.getId(), p.getInstitutionCode(), p.getInstitutionName(),
                p.getLicenseNumber(), p.getAddress(), p.getPhone(), p.getWebsite(),
                p.isActive(), p.getCreatedAt());
    }

    private DoctorAssociationResponse toDoctorResponse(DoctorProfile d) {
        return new DoctorAssociationResponse(
                d.getId(), d.getDoctorCode(), d.getUser().getFullName(),
                d.getSpecialization(), d.getLicenseNumber(),
                d.getInstitutionStatus(), d.getCreatedAt());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
