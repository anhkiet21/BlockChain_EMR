package com.blockchain.emr.integration.blockchain.api;

import java.math.BigInteger;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.integration.blockchain.application.BlockchainEventSyncService;
import com.blockchain.emr.integration.blockchain.application.BlockchainQueryService;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;

@RestController
@RequestMapping("/blockchain")
public class BlockchainController {

    private final BlockchainQueryService queryService;
    private final BlockchainEventSyncService eventSyncService;

    public BlockchainController(BlockchainQueryService queryService, BlockchainEventSyncService eventSyncService) {
        this.queryService = queryService;
        this.eventSyncService = eventSyncService;
    }

    @GetMapping("/access")
    ApiResponse<AccessResponse> access(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam String patientWallet,
            @RequestParam String granteeWallet) {
        return ApiResponse.success(new AccessResponse(
                patientWallet, granteeWallet,
                queryService.hasAccess(user.id(), user.roles().contains("ADMIN"), patientWallet, granteeWallet)));
    }

    @GetMapping("/records/{recordId}")
    ApiResponse<BlockchainService.OnChainRecord> record(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable BigInteger recordId,
            @RequestParam String callerWallet) {
        return ApiResponse.success(
                queryService.getRecord(user.id(), user.roles().contains("ADMIN"), recordId, callerWallet));
    }

    @GetMapping("/transactions/{transactionHash}")
    ApiResponse<BlockchainService.TransactionState> transaction(@PathVariable String transactionHash) {
        return ApiResponse.success(queryService.getTransactionState(transactionHash));
    }

    @PostMapping("/events/sync")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<BlockchainEventSyncService.SyncResult> sync() {
        return ApiResponse.success(eventSyncService.sync());
    }

    record AccessResponse(String patientWallet, String granteeWallet, boolean granted) {}
}
