package com.blockchain.emr.audit;

import java.time.Instant;

public record SystemAuditEventResponse(
        Long id,
        String action,
        Long actorUserId,
        String actorName,
        String actorRole,
        String targetType,
        String targetId,
        String targetName,
        String reason,
        String previousState,
        String newState,
        String transactionHash,
        Instant occurredAt) {
}
