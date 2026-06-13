package com.blockchain.emr.patient.api.dto;

import java.time.Instant;

public record RecordAccessLogResponse(
        Long id,
        Long medicalRecordId,
        String medicalRecordTitle,
        String actorFullName,
        String action,
        Instant createdAt
) {}
