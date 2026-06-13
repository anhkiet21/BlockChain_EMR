package com.blockchain.emr.patient.api.dto;

public record AdminPatientSummaryResponse(
        Long id,
        Long userId,
        String patientCode,
        String fullName,
        String identityNumberMasked,
        String phone,
        boolean walletLinked,
        String accountStatus) {
}
