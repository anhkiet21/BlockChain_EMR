package com.blockchain.emr.accesscontrol.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendAccessRequestRequest(
        @NotNull Long patientProfileId,
        @NotBlank @Size(max = 1000) String reason
) {}
