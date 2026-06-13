package com.blockchain.emr.accesscontrol.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ApproveAccessRequestRequest(
        @NotBlank @Size(max = 66) String transactionHash
) {}
