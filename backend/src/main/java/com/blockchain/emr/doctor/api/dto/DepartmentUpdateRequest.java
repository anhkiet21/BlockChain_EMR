package com.blockchain.emr.doctor.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartmentUpdateRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 500) String description,
        boolean active) {
}

