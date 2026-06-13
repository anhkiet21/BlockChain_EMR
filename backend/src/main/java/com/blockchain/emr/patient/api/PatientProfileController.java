package com.blockchain.emr.patient.api;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.patient.api.dto.PatientProfileRequest;
import com.blockchain.emr.patient.api.dto.PatientProfileResponse;
import com.blockchain.emr.patient.api.dto.PatientSummaryResponse;
import com.blockchain.emr.patient.application.PatientProfileService;

import com.blockchain.emr.patient.api.dto.RecordAccessLogResponse;

@RestController
@RequestMapping("/patients")
public class PatientProfileController {

    private final PatientProfileService patientProfileService;

    public PatientProfileController(PatientProfileService patientProfileService) {
        this.patientProfileService = patientProfileService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    ApiResponse<PatientProfileResponse> me(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.success(patientProfileService.getMyProfile(user.id()));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    ApiResponse<PatientProfileResponse> updateMe(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody PatientProfileRequest request) {
        return ApiResponse.success(patientProfileService.upsertMyProfile(user.id(), request));
    }

    @GetMapping("/me/access-history")
    @PreAuthorize("hasRole('PATIENT')")
    ApiResponse<PageResponse<RecordAccessLogResponse>> myAccessHistory(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(patientProfileService.getMyAccessHistory(user.id(), page, size));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or @profileAuthorization.isVerifiedDoctor(authentication)")
    ApiResponse<PageResponse<PatientSummaryResponse>> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(patientProfileService.search(query, page, size));
    }

    @GetMapping("/{profileId}")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<PatientProfileResponse> getById(@PathVariable Long profileId) {
        return ApiResponse.success(patientProfileService.getById(profileId));
    }
}

