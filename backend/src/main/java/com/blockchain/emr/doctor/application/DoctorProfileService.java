package com.blockchain.emr.doctor.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.prepost.PreAuthorize;

import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;
import com.blockchain.emr.doctor.api.dto.DoctorProfileRequest;
import com.blockchain.emr.doctor.api.dto.DoctorProfileResponse;
import com.blockchain.emr.doctor.domain.Department;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.doctor.domain.DoctorVerificationStatus;
import com.blockchain.emr.facility.application.HealthcareFacilityService;
import com.blockchain.emr.common.api.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.audit.SystemAuditService;

@Service
public class DoctorProfileService {

    private final DoctorProfileRepository doctorProfileRepository;
    private final UserRepository userRepository;
    private final DepartmentService departmentService;
    private final HealthcareFacilityService facilityService;
    private final WalletAddressRepository walletAddressRepository;
    private final SystemAuditService auditService;

    public DoctorProfileService(
            DoctorProfileRepository doctorProfileRepository,
            UserRepository userRepository,
            DepartmentService departmentService,
            HealthcareFacilityService facilityService,
            WalletAddressRepository walletAddressRepository,
            SystemAuditService auditService) {
        this.doctorProfileRepository = doctorProfileRepository;
        this.userRepository = userRepository;
        this.departmentService = departmentService;
        this.facilityService = facilityService;
        this.walletAddressRepository = walletAddressRepository;
        this.auditService = auditService;
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public DoctorProfileResponse upsertMyProfile(Long userId, DoctorProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        DoctorProfile existing = doctorProfileRepository.findByUserId(userId).orElse(null);
        boolean duplicateLicense = existing == null
                ? doctorProfileRepository.existsByLicenseNumber(request.licenseNumber().trim())
                : doctorProfileRepository.existsByLicenseNumberAndUserIdNot(request.licenseNumber().trim(), userId);
        if (duplicateLicense) {
            throw new ApplicationException(ErrorCode.CONFLICT, "License number already exists");
        }
        Department department = request.departmentId() == null
                ? null
                : departmentService.findEntity(request.departmentId());
        user.updateFullName(request.fullName().trim());
        DoctorProfile profile = existing == null
                ? new DoctorProfile(user, request.licenseNumber().trim(), request.specialization().trim())
                : existing;
        profile.update(
                request.licenseNumber().trim(),
                request.specialization().trim(),
                department,
                blankToNull(request.phone()),
                blankToNull(request.biography()));
        return toResponse(doctorProfileRepository.save(profile));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public DoctorProfileResponse getMyProfile(Long userId) {
        return doctorProfileRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public DoctorProfileResponse getById(Long profileId) {
        return doctorProfileRepository.findById(profileId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<DoctorProfileResponse> listPending(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 100));
        return PageResponse.from(doctorProfileRepository.findAllByVerificationStatus(
                        DoctorVerificationStatus.PENDING_VERIFICATION,
                        PageRequest.of(safePage, safeSize, Sort.by("createdAt").ascending()))
                .map(this::toResponse));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') and #adminUserId == authentication.principal.id")
    public DoctorProfileResponse verify(Long adminUserId, Long profileId, String reason) {
        DoctorProfile profile = findProfile(profileId);
        if (walletAddressRepository.findFirstByUserIdOrderByIdAsc(profile.getUser().getId()).isEmpty()) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Doctor must verify a wallet before approval");
        }
        if (profile.getHealthcareFacility() == null || !profile.getHealthcareFacility().isActive()) {
            throw new ApplicationException(ErrorCode.INVALID_FACILITY);
        }
        DoctorVerificationStatus previous = profile.getVerificationStatus();
        try {
            profile.verify(adminUserId);
        } catch (IllegalStateException exception) {
            throw new ApplicationException(ErrorCode.CONFLICT, exception.getMessage());
        }
        auditService.record(
                "DOCTOR_VERIFIED",
                adminUserId,
                actorName(adminUserId),
                "ADMIN",
                "DOCTOR_PROFILE",
                profile.getId().toString(),
                profile.getUser().getFullName(),
                reason,
                previous.name(),
                profile.getVerificationStatus().name(),
                null);
        return toResponse(profile);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') and #adminUserId == authentication.principal.id")
    public DoctorProfileResponse reject(Long adminUserId, Long profileId, String reason) {
        DoctorProfile profile = findProfile(profileId);
        String normalizedReason = reason == null || reason.isBlank()
                ? "Hồ sơ chưa đáp ứng yêu cầu xác thực."
                : reason.trim();
        DoctorVerificationStatus previous = profile.getVerificationStatus();
        try {
            profile.reject(adminUserId, normalizedReason);
        } catch (IllegalStateException exception) {
            throw new ApplicationException(ErrorCode.CONFLICT, exception.getMessage());
        }
        auditService.record(
                "DOCTOR_REJECTED",
                adminUserId,
                actorName(adminUserId),
                "ADMIN",
                "DOCTOR_PROFILE",
                profile.getId().toString(),
                profile.getUser().getFullName(),
                normalizedReason,
                previous.name(),
                profile.getVerificationStatus().name(),
                null);
        return toResponse(profile);
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public DoctorProfileResponse resubmit(Long userId) {
        DoctorProfile profile = doctorProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        DoctorVerificationStatus previous = profile.getVerificationStatus();
        try {
            profile.resubmit();
        } catch (IllegalStateException exception) {
            throw new ApplicationException(ErrorCode.CONFLICT, exception.getMessage());
        }
        auditService.record(
                "DOCTOR_RESUBMITTED",
                userId,
                profile.getUser().getFullName(),
                "DOCTOR",
                "DOCTOR_PROFILE",
                profile.getId().toString(),
                profile.getUser().getFullName(),
                null,
                previous.name(),
                profile.getVerificationStatus().name(),
                null);
        return toResponse(profile);
    }

    private DoctorProfileResponse toResponse(DoctorProfile profile) {
        User user = profile.getUser();
        return new DoctorProfileResponse(
                profile.getId(),
                user.getId(),
                profile.getDoctorCode(),
                user.getEmail(),
                maskIdentityNumber(user.getIdentityNumber()),
                user.getFullName(),
                profile.getLicenseNumber(),
                profile.getSpecialization(),
                profile.getDepartment() == null ? null : departmentService.toResponse(profile.getDepartment()),
                profile.getPhone(),
                profile.getBiography(),
                profile.isVerified(),
                profile.getVerificationStatus(),
                profile.getRejectionReason(),
                profile.getReviewedAt(),
                profile.getReviewedByAdminUserId(),
                profile.getDateOfBirth(),
                profile.getGender(),
                profile.getHealthcareFacility() == null
                        ? null
                        : facilityService.toResponse(profile.getHealthcareFacility()),
                walletAddressRepository.findAllByUserId(user.getId()).stream()
                        .map(wallet -> wallet.getAddress()).toList(),
                user.isEnabled() ? "ACTIVE" : "LOCKED");
    }

    private String actorName(Long userId) {
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Quản trị viên #" + userId);
    }

    private DoctorProfile findProfile(Long profileId) {
        return doctorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String maskIdentityNumber(String identityNumber) {
        if (identityNumber == null) {
            return null;
        }
        int visibleLength = Math.min(4, identityNumber.length());
        return "*".repeat(identityNumber.length() - visibleLength)
                + identityNumber.substring(identityNumber.length() - visibleLength);
    }
}
