package com.blockchain.emr.accesscontrol.api;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.blockchain.emr.accesscontrol.api.dto.*;
import com.blockchain.emr.accesscontrol.application.AccessRequestService;
import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;

@RestController
@RequestMapping("/access-requests")
public class AccessRequestController {

    private final AccessRequestService service;

    public AccessRequestController(AccessRequestService service) {
        this.service = service;
    }

    /** Doctor sends an access request to a patient. */
    @PostMapping
    ApiResponse<AccessRequestResponse> send(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody SendAccessRequestRequest request) {
        return ApiResponse.success(service.sendRequest(user.id(), request));
    }

    /** Patient views incoming access requests (pending/approved/rejected). */
    @GetMapping("/patients/me")
    ApiResponse<PageResponse<AccessRequestResponse>> listForPatient(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.listForPatient(user.id(), page, size));
    }

    /** Doctor views their own sent requests. */
    @GetMapping("/doctors/me")
    ApiResponse<PageResponse<AccessRequestResponse>> listForDoctor(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.listForDoctor(user.id(), page, size));
    }

    /** Patient approves a pending request (provides txHash from their MetaMask signature). */
    @PutMapping("/{requestId}/approve")
    ApiResponse<AccessRequestResponse> approve(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long requestId,
            @Valid @RequestBody ApproveAccessRequestRequest body) {
        return ApiResponse.success(service.approve(user.id(), requestId, body));
    }

    /** Patient rejects a pending request. */
    @PutMapping("/{requestId}/reject")
    ApiResponse<AccessRequestResponse> reject(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long requestId,
            @Valid @RequestBody RejectAccessRequestRequest body) {
        return ApiResponse.success(service.reject(user.id(), requestId, body));
    }
}
