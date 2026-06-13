package com.blockchain.emr.patient.api.dto;

import java.time.LocalDate;

import com.blockchain.emr.patient.domain.Gender;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PatientProfileRequest(
        @NotBlank @Size(max = 150) String fullName,
        @Past LocalDate dateOfBirth,
        Gender gender,
        @Pattern(regexp = "^$|^[0-9+() .-]{7,20}$") String phone,
        @Size(max = 500) String address,
        @Size(max = 150) String emergencyContactName,
        @Pattern(regexp = "^$|^[0-9+() .-]{7,20}$") String emergencyContactPhone,
        @Pattern(regexp = "^$|^(A|B|AB|O)[+-]$") String bloodType) {
}

