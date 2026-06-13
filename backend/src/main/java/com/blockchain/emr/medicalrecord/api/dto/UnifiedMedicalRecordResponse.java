package com.blockchain.emr.medicalrecord.api.dto;

import java.math.BigInteger;
import java.time.Instant;

import com.blockchain.emr.medicalrecord.domain.MedicalRecordSourceType;

public record UnifiedMedicalRecordResponse(
        Long recordId,
        Long patientProfileId,
        Long medicalFileId,
        String originalFileName,
        String mimeType,
        long fileSize,
        String cid,
        String contentHash,
        MedicalRecordSourceType sourceType,
        String uploaderName,
        String uploadedByWallet,
        String facilityId,
        String facilityName,
        BigInteger onChainRecordId,
        String blockchainTxHash,
        Instant createdAt) {
}

