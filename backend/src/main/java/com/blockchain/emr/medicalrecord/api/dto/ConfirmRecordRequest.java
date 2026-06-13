package com.blockchain.emr.medicalrecord.api.dto;

import java.math.BigInteger;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

public record ConfirmRecordRequest(
        @NotNull Long medicalFileId,
        @NotNull @PositiveOrZero BigInteger onChainRecordId,
        @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{64}$") String transactionHash) {
}

