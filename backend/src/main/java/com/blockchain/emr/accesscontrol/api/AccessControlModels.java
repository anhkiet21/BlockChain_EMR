package com.blockchain.emr.accesscontrol.api;

import java.math.BigInteger;
import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;

public final class AccessControlModels {
    private AccessControlModels() {}

    public record AccessTransactionRequest(
            @NotNull @Positive Long doctorProfileId,
            @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{40}$") String patientWallet,
            @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{40}$") String doctorWallet,
            boolean granted) {}

    public record VerifyAccessTransactionRequest(
            @NotNull @Positive Long doctorProfileId,
            @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{40}$") String patientWallet,
            @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{40}$") String doctorWallet,
            boolean granted,
            @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{64}$") String transactionHash) {}

    public record PreparedAccessTransactionResponse(
            String from, String to, String data, BigInteger chainId, String value,
            Long doctorProfileId, boolean granted) {}

    public record AccessGrantResponse(
            Long doctorProfileId, String doctorCode, String doctorName, boolean active,
            boolean granted, String transactionHash, BigInteger blockNumber, Instant occurredAt) {}

    public record AccessHistoryResponse(
            Long id, Long doctorProfileId, String doctorCode, String doctorName, boolean granted,
            String transactionHash, BigInteger blockNumber, Instant occurredAt, Instant verifiedAt) {}
}
