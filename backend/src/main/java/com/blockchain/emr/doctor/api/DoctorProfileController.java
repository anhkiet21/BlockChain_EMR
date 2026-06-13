package com.blockchain.emr.doctor.api;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.doctor.api.dto.DoctorProfileRequest;
import com.blockchain.emr.doctor.api.dto.DoctorProfileResponse;
import com.blockchain.emr.doctor.api.dto.DoctorVerificationRequest;
import com.blockchain.emr.doctor.application.DoctorProfileService;

@RestController
@RequestMapping("/doctors")
public class DoctorProfileController {

    private final DoctorProfileService doctorProfileService;

    public DoctorProfileController(DoctorProfileService doctorProfileService) {
        this.doctorProfileService = doctorProfileService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('DOCTOR')")
    ApiResponse<DoctorProfileResponse> me(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.success(doctorProfileService.getMyProfile(user.id()));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('DOCTOR')")
    ApiResponse<DoctorProfileResponse> updateMe(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody DoctorProfileRequest request) {
        return ApiResponse.success(doctorProfileService.upsertMyProfile(user.id(), request));
    }

    @GetMapping("/{profileId}")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<DoctorProfileResponse> getById(@PathVariable Long profileId) {
        return ApiResponse.success(doctorProfileService.getById(profileId));
    }

    @PutMapping("/{profileId}/verification")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<DoctorProfileResponse> verify(
            @PathVariable Long profileId,
            @RequestBody DoctorVerificationRequest request) {
        return ApiResponse.success(doctorProfileService.setVerified(profileId, request.verified()));
    }
}
