package com.blockchain.emr.auth.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.blockchain.emr.auth.domain.RefreshToken;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.infrastructure.RefreshTokenRepository;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;

@Service
public class TokenService {

    private final SecureRandom secureRandom = new SecureRandom();
    private final RefreshTokenRepository refreshTokenRepository;
    private final Duration refreshTokenExpiration;

    public TokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${app.jwt.refresh-token-expiration}") Duration refreshTokenExpiration) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenExpiration = refreshTokenExpiration;
    }

    public String issueRefreshToken(User user) {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokenRepository.save(new RefreshToken(
                user,
                hash(rawToken),
                Instant.now().plus(refreshTokenExpiration)));
        return rawToken;
    }

    public RefreshToken consume(String rawToken) {
        RefreshToken token = refreshTokenRepository.findByTokenHashForUpdate(hash(rawToken))
                .orElseThrow(() -> new ApplicationException(ErrorCode.INVALID_TOKEN));
        if (!token.isUsable()) {
            throw new ApplicationException(ErrorCode.INVALID_TOKEN);
        }
        token.revoke();
        return token;
    }

    public void revoke(String rawToken, Long userId) {
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .filter(token -> token.getUser().getId().equals(userId))
                .ifPresent(RefreshToken::revoke);
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
