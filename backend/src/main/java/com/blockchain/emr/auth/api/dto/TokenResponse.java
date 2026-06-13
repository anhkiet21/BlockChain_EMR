package com.blockchain.emr.auth.api.dto;

public record TokenResponse(
        String tokenType,
        String accessToken,
        long expiresIn,
        String refreshToken,
        UserResponse user) {
}

