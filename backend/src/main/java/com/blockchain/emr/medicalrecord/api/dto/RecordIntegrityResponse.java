package com.blockchain.emr.medicalrecord.api.dto;

import java.time.Instant;

public record RecordIntegrityResponse(
        Long recordId,
        Long medicalFileId,
        boolean valid,
        String status,
        String message,
        boolean storageReadable,
        boolean blockchainReadable,
        boolean cidMatches,
        boolean databaseHashMatchesOnChain,
        boolean computedHashMatchesOnChain,
        String databaseCid,
        String onChainCid,
        String databaseHash,
        String onChainHash,
        String computedHash,
        Instant checkedAt) {

    public RecordIntegrityResponse {
        if ("ON_CHAIN_UNREADABLE".equals(status)) {
            message = "Không đọc được dữ liệu on-chain của bệnh án";
        }
    }
}
