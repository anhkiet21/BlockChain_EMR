package com.blockchain.emr.accesscontrol.api;

import static com.blockchain.emr.accesscontrol.api.AccessControlModels.*;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.blockchain.emr.accesscontrol.application.AccessControlService;
import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/access-control")
@PreAuthorize("hasRole('PATIENT')")
public class AccessControlController {
    private final AccessControlService service;

    public AccessControlController(AccessControlService service) {
        this.service = service;
    }

    @PostMapping("/transactions/prepare")
    ApiResponse<PreparedAccessTransactionResponse> prepare(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody AccessTransactionRequest request) {
        return ApiResponse.success(service.prepare(user.id(), request));
    }

    @PostMapping("/transactions/verify")
    ApiResponse<AccessGrantResponse> verify(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody VerifyAccessTransactionRequest request) {
        return ApiResponse.success(service.verify(user.id(), request));
    }

    @GetMapping("/history")
    ApiResponse<PageResponse<AccessHistoryResponse>> history(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.history(user.id(), page, size));
    }
}
