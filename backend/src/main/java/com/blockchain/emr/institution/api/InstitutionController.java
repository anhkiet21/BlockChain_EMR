package com.blockchain.emr.institution.api;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.institution.api.dto.*;
import com.blockchain.emr.institution.application.InstitutionProfileService;

@RestController
@RequestMapping("/institutions")
public class InstitutionController {

    private final InstitutionProfileService service;

    public InstitutionController(InstitutionProfileService service) {
        this.service = service;
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('INSTITUTION')")
    ApiResponse<InstitutionProfileResponse> getMe(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.success(service.getMyProfile(user.id()));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('INSTITUTION')")
    ApiResponse<InstitutionProfileResponse> updateMe(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody InstitutionProfileRequest request) {
        return ApiResponse.success(service.upsertMyProfile(user.id(), request));
    }

    @GetMapping
    ApiResponse<List<InstitutionProfileResponse>> listActive() {
        return ApiResponse.success(service.listActive());
    }

    @GetMapping("/me/doctors")
    @PreAuthorize("hasRole('INSTITUTION')")
    ApiResponse<List<DoctorAssociationResponse>> listDoctors(
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.success(service.listDoctors(user.id()));
    }

    @PutMapping("/me/doctors/{doctorId}/approve")
    @PreAuthorize("hasRole('INSTITUTION')")
    ApiResponse<DoctorAssociationResponse> approveDoctor(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long doctorId) {
        return ApiResponse.success(service.approveDoctor(user.id(), doctorId));
    }

    @PutMapping("/me/doctors/{doctorId}/reject")
    @PreAuthorize("hasRole('INSTITUTION')")
    ApiResponse<DoctorAssociationResponse> rejectDoctor(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long doctorId) {
        return ApiResponse.success(service.rejectDoctor(user.id(), doctorId));
    }
}
