package com.blockchain.emr.institution.api.dto;

import java.time.Instant;

public record InstitutionProfileResponse(
        Long id,
        String institutionCode,
        String institutionName,
        String licenseNumber,
        String address,
        String phone,
        String website,
        boolean active,
        Instant createdAt
) {}
