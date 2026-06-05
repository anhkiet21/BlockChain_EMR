package com.blockchain.emr.medicalrecord.api.dto;

public record MedicalRecordFileUploadResponse(Long fileId, String cid, String contentHash) {}
