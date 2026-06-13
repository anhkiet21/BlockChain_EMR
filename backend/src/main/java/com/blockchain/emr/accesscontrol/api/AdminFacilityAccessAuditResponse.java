package com.blockchain.emr.accesscontrol.api;

import java.time.Instant;

public record AdminFacilityAccessAuditResponse(
        Long id,
        String action,
        String actorName,
        String actorWallet,
        String facilityId,
        String facilityName,
        String transactionHash,
        Instant occurredAt) {
}
