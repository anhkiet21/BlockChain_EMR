package com.blockchain.emr.medicalrecord.api.dto;

import java.math.BigInteger;
import java.time.Instant;
import java.util.List;

public record MedicalRecordResponse(
        Long id, Long patientProfileId, Long authorDoctorProfileId, String title, String recordType,
        BigInteger onChainRecordId, Instant createdAt, List<MedicalFileResponse> files) {}
