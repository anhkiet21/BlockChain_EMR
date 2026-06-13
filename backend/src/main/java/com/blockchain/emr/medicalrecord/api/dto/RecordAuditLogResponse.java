package com.blockchain.emr.medicalrecord.api.dto;

import java.time.Instant;
import java.util.List;

public record RecordAuditLogResponse(
        Long id,
        Long recordId,
        Long medicalFileId,
        String medicalFileName,
        String action,
        String actorName,
        List<String> actorRoles,
        String facilityId,
        String facilityName,
        Instant createdAt) {
}
