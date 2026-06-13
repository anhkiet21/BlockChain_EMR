package com.blockchain.emr.institution.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InstitutionProfileRequest(
        @NotBlank @Size(max = 200) String institutionName,
        @NotBlank @Size(max = 100) String licenseNumber,
        @Size(max = 500) String address,
        @Size(max = 20) String phone,
        @Size(max = 255) String website
) {}
