package com.blockchain.emr.medicalrecord.api.dto;

import com.blockchain.emr.medicalrecord.domain.MedicalRecordSourceType;

public record PendingRecordUploadResponse(
        Long medicalFileId,
        String cid,
        String contentHash,
        MedicalRecordSourceType sourceType,
        String patientWallet,
        String uploaderWallet,
        String facilityId) {
}

