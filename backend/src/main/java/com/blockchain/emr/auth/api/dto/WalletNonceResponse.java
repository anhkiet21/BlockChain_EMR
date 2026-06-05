package com.blockchain.emr.auth.api.dto;

import java.time.Instant;

public record WalletNonceResponse(
        String address,
        String message,
        Instant expiresAt) {
}

