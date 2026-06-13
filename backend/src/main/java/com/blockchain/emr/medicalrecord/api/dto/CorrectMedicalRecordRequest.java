package com.blockchain.emr.medicalrecord.api.dto;

import java.math.BigInteger;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CorrectMedicalRecordRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 30) String recordType,
        @NotNull Long medicalFileId,
        @NotNull @PositiveOrZero BigInteger onChainRecordId,
        @NotBlank @Size(max = 500) String correctionReason,
        @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{40}$") String patientWallet,
        @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{40}$") String doctorWallet) {}
