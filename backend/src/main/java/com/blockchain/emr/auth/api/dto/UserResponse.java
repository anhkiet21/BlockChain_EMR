package com.blockchain.emr.auth.api.dto;

import java.util.List;
import java.util.Set;

public record UserResponse(
        Long id,
        String email,
        String identityNumberMasked,
        String fullName,
        String status,
        Set<String> roles,
        List<String> wallets) {
}
