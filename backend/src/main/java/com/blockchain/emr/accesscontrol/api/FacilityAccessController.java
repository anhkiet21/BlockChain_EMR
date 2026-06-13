package com.blockchain.emr.accesscontrol.api;

import static com.blockchain.emr.accesscontrol.api.FacilityAccessModels.*;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.accesscontrol.application.FacilityAccessService;
import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;

import jakarta.validation.Valid;

@RestController
public class FacilityAccessController {
    private final FacilityAccessService service;

    public FacilityAccessController(FacilityAccessService service) {
        this.service = service;
    }

    @PostMapping("/doctor/access-requests")
    ApiResponse<AccessRequestResponse> createRequest(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody CreateAccessRequest request) {
        return ApiResponse.success(service.createRequest(user.id(), request));
    }

    @GetMapping("/patient/access-requests")
    ApiResponse<PageResponse<AccessRequestResponse>> patientRequests(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.patientRequests(user.id(), page, size));
    }

    @PostMapping("/patient/access-requests/{id}/reject")
    ApiResponse<AccessRequestResponse> reject(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id) {
        return ApiResponse.success(service.reject(user.id(), id));
    }

    @PostMapping("/patient/access-requests/{id}/approve")
    ApiResponse<AccessRequestResponse> approve(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id,
            @Valid @RequestBody TransactionHashRequest request) {
        return ApiResponse.success(service.approve(user.id(), id, request.transactionHash()));
    }

    @PostMapping("/patient/access/transactions/prepare")
    ApiResponse<PreparedFacilityTransactionResponse> prepare(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody FacilityAccessChangeRequest request) {
        return ApiResponse.success(service.prepare(user.id(), request));
    }

    @PostMapping("/patient/access/transactions/confirm")
    ApiResponse<FacilityGrantResponse> confirm(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam String transactionHash,
            @Valid @RequestBody FacilityAccessChangeRequest request) {
        return ApiResponse.success(service.confirm(user.id(), request, transactionHash));
    }

    @GetMapping("/patient/access/grants")
    ApiResponse<List<FacilityGrantResponse>> grants(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.success(service.grants(user.id()));
    }
}
