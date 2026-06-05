package com.blockchain.emr.auth.application;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import com.blockchain.emr.auth.api.dto.WalletNonceResponse;
import com.blockchain.emr.auth.api.dto.WalletResponse;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.domain.WalletNonce;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.auth.infrastructure.WalletNonceRepository;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;

@Service
public class WalletVerificationService {

    private final SecureRandom secureRandom = new SecureRandom();
    private final UserRepository userRepository;
    private final WalletAddressRepository walletAddressRepository;
    private final WalletNonceRepository walletNonceRepository;
    private final Duration nonceExpiration;

    public WalletVerificationService(
            UserRepository userRepository,
            WalletAddressRepository walletAddressRepository,
            WalletNonceRepository walletNonceRepository,
            @Value("${app.wallet.nonce-expiration}") Duration nonceExpiration) {
        this.userRepository = userRepository;
        this.walletAddressRepository = walletAddressRepository;
        this.walletNonceRepository = walletNonceRepository;
        this.nonceExpiration = nonceExpiration;
    }

    @Transactional
    @PreAuthorize("#userId == authentication.principal.id")
    public WalletNonceResponse createNonce(Long userId, String requestedAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String address = normalizeAddress(requestedAddress);
        walletAddressRepository.findByAddress(address)
                .filter(wallet -> !wallet.getUser().getId().equals(userId))
                .ifPresent(wallet -> {
                    throw new ApplicationException(ErrorCode.WALLET_ALREADY_LINKED);
                });

        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        String nonce = HexFormat.of().formatHex(bytes);
        Instant expiresAt = Instant.now().plus(nonceExpiration);
        String message = "Blockchain EMR wallet verification\n"
                + "User ID: " + userId + "\n"
                + "Wallet: " + address + "\n"
                + "Nonce: " + nonce;

        WalletNonce walletNonce = walletNonceRepository.findByUserId(userId)
                .map(existing -> {
                    existing.replace(address, nonce, message, expiresAt);
                    return existing;
                })
                .orElseGet(() -> new WalletNonce(user, address, nonce, message, expiresAt));
        walletNonceRepository.save(walletNonce);
        return new WalletNonceResponse(address, message, expiresAt);
    }

    @Transactional
    @PreAuthorize("#userId == authentication.principal.id")
    public WalletResponse verify(Long userId, String requestedAddress, String signature) {
        String address = normalizeAddress(requestedAddress);
        WalletNonce nonce = walletNonceRepository.findByUserId(userId)
                .filter(value -> value.getWalletAddress().equals(address) && value.isUsable())
                .orElseThrow(() -> new ApplicationException(ErrorCode.WALLET_VERIFICATION_FAILED));
        if (!recoverAddress(nonce.getMessage(), signature).equals(address)) {
            throw new ApplicationException(ErrorCode.WALLET_VERIFICATION_FAILED);
        }

        walletAddressRepository.findByAddress(address).ifPresentOrElse(existing -> {
            if (!existing.getUser().getId().equals(userId)) {
                throw new ApplicationException(ErrorCode.WALLET_ALREADY_LINKED);
            }
        }, () -> walletAddressRepository.save(new WalletAddress(nonce.getUser(), address)));
        nonce.markUsed();
        return new WalletResponse(address, true);
    }

    private String recoverAddress(String message, String signature) {
        try {
            byte[] bytes = Numeric.hexStringToByteArray(signature);
            if (bytes.length != 65) {
                throw new IllegalArgumentException("Invalid signature length");
            }
            byte v = bytes[64];
            if (v < 27) {
                v += 27;
            }
            Sign.SignatureData signatureData = new Sign.SignatureData(
                    v,
                    java.util.Arrays.copyOfRange(bytes, 0, 32),
                    java.util.Arrays.copyOfRange(bytes, 32, 64));
            BigInteger publicKey = Sign.signedPrefixedMessageToKey(
                    message.getBytes(StandardCharsets.UTF_8),
                    signatureData);
            return "0x" + Keys.getAddress(publicKey).toLowerCase(Locale.ROOT);
        } catch (Exception exception) {
            throw new ApplicationException(ErrorCode.WALLET_VERIFICATION_FAILED);
        }
    }

    private String normalizeAddress(String address) {
        return address.trim().toLowerCase(Locale.ROOT);
    }
}
