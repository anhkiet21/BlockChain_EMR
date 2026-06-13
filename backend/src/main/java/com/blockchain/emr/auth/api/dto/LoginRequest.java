package com.blockchain.emr.auth.api.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        String identityNumber,
        String email,
        @NotBlank String password) {
}
