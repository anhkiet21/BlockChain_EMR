package com.blockchain.emr.auth.api.dto;

import java.time.LocalDate;

import com.blockchain.emr.patient.domain.Gender;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PatientRegistrationRequest(
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9.-]{6,50}$") String identityNumber,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 150) String fullName,
        @NotNull @Past LocalDate dateOfBirth,
        @NotNull Gender gender,
        @NotBlank @Pattern(regexp = "^[0-9+() .-]{7,20}$") String phoneNumber,
        @NotBlank @Size(max = 500) String address) {
}

