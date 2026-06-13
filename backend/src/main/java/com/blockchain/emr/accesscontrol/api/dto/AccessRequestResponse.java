package com.blockchain.emr.accesscontrol.api.dto;

import java.time.Instant;

public record AccessRequestResponse(
        Long id,
        Long patientProfileId,
        String patientName,
        Long doctorProfileId,
        String doctorCode,
        String doctorName,
        String doctorWallet,
        String reason,
        String status,
        String transactionHash,
        String rejectedReason,
        Instant respondedAt,
        Instant createdAt
) {}
