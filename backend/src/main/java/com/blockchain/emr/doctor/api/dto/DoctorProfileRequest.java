package com.blockchain.emr.doctor.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DoctorProfileRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Size(max = 100) String licenseNumber,
        @NotBlank @Size(max = 150) String specialization,
        Long departmentId,
        Long institutionId,
        @Pattern(regexp = "^$|^[0-9+() .-]{7,20}$") String phone,
        @Size(max = 1000) String biography) {
}


