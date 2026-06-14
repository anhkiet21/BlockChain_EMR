package com.blockchain.emr.doctor.api;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.auth.api.dto.AccountStatusResponse;
import com.blockchain.emr.auth.application.AdminAccountService;
import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.doctor.api.dto.DoctorProfileResponse;
import com.blockchain.emr.doctor.api.dto.DoctorReviewRequest;
import com.blockchain.emr.doctor.application.DoctorProfileService;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDoctorController {

    private final DoctorProfileService doctorProfileService;
    private final AdminAccountService adminAccountService;

    public AdminDoctorController(
            DoctorProfileService doctorProfileService,
            AdminAccountService adminAccountService) {
        this.doctorProfileService = doctorProfileService;
        this.adminAccountService = adminAccountService;
    }

    @GetMapping("/doctors/pending")
    ApiResponse<PageResponse<DoctorProfileResponse>> pendingDoctors(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(doctorProfileService.listPending(page, size));
    }

    @PostMapping("/doctors/{id}/verify")
    ApiResponse<DoctorProfileResponse> verifyDoctor(
            @AuthenticationPrincipal AuthenticatedUser admin,
            @PathVariable Long id,
            @RequestBody(required = false) DoctorReviewRequest request) {
        return ApiResponse.success(doctorProfileService.verify(
                admin.id(), id, request == null ? null : request.reason()));
    }

    @PostMapping("/doctors/{id}/reject")
    ApiResponse<DoctorProfileResponse> rejectDoctor(
            @AuthenticationPrincipal AuthenticatedUser admin,
            @PathVariable Long id,
            @RequestBody(required = false) DoctorReviewRequest request) {
        return ApiResponse.success(doctorProfileService.reject(
                admin.id(), id, request == null ? null : request.reason()));
    }

    @PostMapping("/users/{id}/lock")
    ApiResponse<AccountStatusResponse> lockUser(
            @AuthenticationPrincipal AuthenticatedUser admin,
            @PathVariable Long id) {
        return ApiResponse.success(adminAccountService.setLocked(admin.id(), id, true));
    }

    @PostMapping("/users/{id}/unlock")
    ApiResponse<AccountStatusResponse> unlockUser(
            @AuthenticationPrincipal AuthenticatedUser admin,
            @PathVariable Long id) {
        return ApiResponse.success(adminAccountService.setLocked(admin.id(), id, false));
    }
}
