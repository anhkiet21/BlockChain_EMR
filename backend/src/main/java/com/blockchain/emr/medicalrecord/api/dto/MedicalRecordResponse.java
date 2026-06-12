package com.blockchain.emr.medicalrecord.api.dto;

import java.math.BigInteger;
import java.time.Instant;
import java.util.List;

import com.blockchain.emr.medicalrecord.domain.MedicalRecordStatus;

public record MedicalRecordResponse(
        Long id, Long patientProfileId, Long authorDoctorProfileId, String title, String recordType,
        BigInteger onChainRecordId, MedicalRecordStatus status, Long previousRecordId, Long successorRecordId,
        String correctionReason, Instant correctedAt, Instant createdAt, List<MedicalFileResponse> files) {}
