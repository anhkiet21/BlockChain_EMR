package com.blockchain.emr.patient.api.dto;

import java.time.LocalDate;

import com.blockchain.emr.patient.domain.Gender;

public record PatientSummaryResponse(
        Long id,
        String patientCode,
        String fullName,
        LocalDate dateOfBirth,
        Gender gender) {
}

