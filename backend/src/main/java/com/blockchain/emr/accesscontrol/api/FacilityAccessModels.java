package com.blockchain.emr.accesscontrol.api;

import java.math.BigInteger;
import java.time.Instant;
import java.time.LocalDate;

import com.blockchain.emr.accesscontrol.FacilityAccessRequestStatus;
import com.blockchain.emr.patient.domain.Gender;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class FacilityAccessModels {
    private FacilityAccessModels() {}

    public record CreateAccessRequest(
            @NotBlank @Size(max = 50) String patientIdentifier,
            @NotBlank @Size(max = 500) String reason) {}

    public record AccessRequestResponse(
            Long requestId,
            String facilityId,
            String facilityName,
            String doctorName,
            String reason,
            FacilityAccessRequestStatus status,
            String blockchainTxHash,
            Instant createdAt,
            Instant respondedAt) {}

    public record TransactionHashRequest(
            @NotBlank @Pattern(regexp = "^0x[0-9a-fA-F]{64}$") String transactionHash) {}

    public record FacilityAccessChangeRequest(
            @NotBlank @Size(max = 30) String facilityId,
            boolean granted) {}

    public record PreparedFacilityTransactionResponse(
            String from,
            String to,
            String data,
            BigInteger chainId,
            String value,
            String facilityId,
            boolean granted) {}

    public record FacilityGrantResponse(
            String facilityId,
            String facilityName,
            boolean active,
            String blockchainTxHash,
            Instant updatedAt) {}

    public record AuthorizedPatientResponse(
            Long id,
            String patientCode,
            String fullName,
            LocalDate dateOfBirth,
            Gender gender) {}
}

