package com.blockchain.emr.medicalrecord.api.dto;

import java.math.BigInteger;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ConfirmRecordCorrectionRequest(
        @NotNull Long medicalFileId,
        @NotNull @PositiveOrZero BigInteger onChainRecordId,
        @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{64}$") String transactionHash,
        @NotBlank @Size(max = 500) String correctionReason) {
}
