package com.blockchain.emr.medicalrecord.api.dto;

import java.math.BigInteger;
import jakarta.validation.constraints.*;

public record CreateMedicalRecordRequest(
        @NotNull Long patientProfileId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 30) String recordType,
        @NotNull Long medicalFileId,
        @NotNull @PositiveOrZero BigInteger onChainRecordId,
        @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{40}$") String patientWallet,
        @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{40}$") String doctorWallet) {}
