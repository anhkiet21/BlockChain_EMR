package com.blockchain.emr.accesscontrol.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TriggerEmergencyAccessRequest(
        @NotNull Long patientProfileId,
        @NotBlank @Size(max = 42) String patientWallet,
        @NotBlank @Size(max = 42) String doctorWallet,
        @NotBlank @Size(max = 2000) String reason,
        @NotNull Long durationSeconds
) {}
