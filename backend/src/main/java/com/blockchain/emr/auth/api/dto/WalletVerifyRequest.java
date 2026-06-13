package com.blockchain.emr.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record WalletVerifyRequest(
        @NotBlank
        @Pattern(regexp = "^0x[0-9a-fA-F]{40}$", message = "Invalid Ethereum address")
        String address,
        @NotBlank
        @Pattern(regexp = "^0x[0-9a-fA-F]{130}$", message = "Invalid Ethereum signature")
        String signature) {
}

