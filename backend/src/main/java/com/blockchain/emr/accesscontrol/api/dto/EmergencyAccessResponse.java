package com.blockchain.emr.accesscontrol.api.dto;

import java.time.Instant;

public record EmergencyAccessResponse(
        Long id,
        Long patientProfileId,
        String patientName,
        Long doctorProfileId,
        String doctorName,
        String patientWallet,
        String doctorWallet,
        String reason,
        String transactionHash,
        Instant expiresAt,
        Instant createdAt,
        boolean active
) {}
