package com.blockchain.emr.accesscontrol.api;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.blockchain.emr.accesscontrol.api.dto.*;
import com.blockchain.emr.accesscontrol.application.EmergencyAccessService;
import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;

@RestController
@RequestMapping("/access-control/emergency")
public class EmergencyAccessController {

    private final EmergencyAccessService service;

    public EmergencyAccessController(EmergencyAccessService service) {
        this.service = service;
    }

    /**
     * Doctor verifies an emergency access transaction (after signing with MetaMask).
     * The frontend calls triggerEmergencyAccess() on the smart contract first,
     * then posts the transaction hash here for backend audit logging.
     */
    @PostMapping("/verify")
    ApiResponse<EmergencyAccessResponse> verify(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody VerifyEmergencyAccessRequest request) {
        return ApiResponse.success(service.verify(user.id(), request));
    }

    /**
     * Patient views all emergency accesses triggered on their records.
     */
    @GetMapping("/patients/me")
    ApiResponse<PageResponse<EmergencyAccessResponse>> listForPatient(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.listForPatient(user.id(), page, size));
    }

    /**
     * Doctor views their own emergency access records.
     */
    @GetMapping("/doctors/me")
    ApiResponse<PageResponse<EmergencyAccessResponse>> listForDoctor(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.listForDoctor(user.id(), page, size));
    }
}
