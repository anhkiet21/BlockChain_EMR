package com.blockchain.emr.patient.api.dto;

import java.time.LocalDate;

import com.blockchain.emr.patient.domain.Gender;

public record PatientProfileResponse(
        Long id,
        Long userId,
        String patientCode,
        String email,
        String fullName,
        LocalDate dateOfBirth,
        Gender gender,
        String phone,
        String address,
        String emergencyContactName,
        String emergencyContactPhone,
        String bloodType) {
}

