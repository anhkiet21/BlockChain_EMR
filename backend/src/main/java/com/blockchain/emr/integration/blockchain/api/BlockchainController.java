package com.blockchain.emr.integration.blockchain.api;

import java.math.BigInteger;
import java.time.Instant;

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
import com.blockchain.emr.medicalrecord.application.MedicalRecordBlockchainQueryService;

@RestController
@RequestMapping("/blockchain")
public class BlockchainController {

    private final BlockchainQueryService queryService;
    private final BlockchainEventSyncService eventSyncService;
    private final MedicalRecordBlockchainQueryService medicalRecordQueryService;

    public BlockchainController(
            BlockchainQueryService queryService,
            BlockchainEventSyncService eventSyncService,
            MedicalRecordBlockchainQueryService medicalRecordQueryService) {
        this.queryService = queryService;
        this.eventSyncService = eventSyncService;
        this.medicalRecordQueryService = medicalRecordQueryService;
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

    @GetMapping("/facility-access")
    ApiResponse<FacilityAccessResponse> facilityAccess(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam String patientWallet,
            @RequestParam String facilityId) {
        return ApiResponse.success(new FacilityAccessResponse(
                patientWallet, facilityId,
                queryService.hasFacilityAccess(user.id(), user.roles().contains("ADMIN"), patientWallet, facilityId)));
    }

    @GetMapping("/records/{onChainRecordId}")
    ApiResponse<OnChainRecordResponse> record(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable BigInteger onChainRecordId) {
        return ApiResponse.success(OnChainRecordResponse.from(
                medicalRecordQueryService.getByOnChainRecordId(
                        user.id(), user.roles().contains("ADMIN"), onChainRecordId)));
    }

    @GetMapping("/records/by-system-id/{recordId}")
    ApiResponse<OnChainRecordResponse> recordBySystemId(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long recordId) {
        return ApiResponse.success(OnChainRecordResponse.from(
                medicalRecordQueryService.getBySystemRecordId(
                        user.id(), user.roles().contains("ADMIN"), recordId)));
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
    record FacilityAccessResponse(String patientWallet, String facilityId, boolean granted) {}

    record OnChainRecordResponse(
            String recordId,
            String cid,
            String contentHash,
            String patientWallet,
            String authorWallet,
            Instant createdAt,
            String previousRecordId,
            boolean latestVersion) {

        static OnChainRecordResponse from(BlockchainService.OnChainRecord record) {
            return new OnChainRecordResponse(
                    record.recordId().toString(),
                    record.cid(),
                    record.contentHash(),
                    record.patientWallet(),
                    record.authorWallet(),
                    record.createdAt(),
                    record.previousRecordId() == null ? null : record.previousRecordId().toString(),
                    record.latestVersion());
        }
    }
}
