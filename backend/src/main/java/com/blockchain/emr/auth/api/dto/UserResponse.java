package com.blockchain.emr.auth.api.dto;

import java.util.List;
import java.util.Set;

public record UserResponse(
        Long id,
        String email,
        String fullName,
        Set<String> roles,
        List<String> wallets) {
}

