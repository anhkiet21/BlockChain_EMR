package com.blockchain.emr.institution.api.dto;

import java.time.Instant;

public record DoctorAssociationResponse(
        Long doctorId,
        String doctorCode,
        String fullName,
        String specialization,
        String licenseNumber,
        String institutionStatus,
        Instant createdAt
) {}
