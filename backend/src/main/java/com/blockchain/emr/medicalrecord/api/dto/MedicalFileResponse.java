package com.blockchain.emr.medicalrecord.api.dto;

import java.time.Instant;

public record MedicalFileResponse(
        Long id,
        String originalFilename,
        String contentType,
        long originalSize,
        String storageProvider,
        Instant createdAt) {
}
