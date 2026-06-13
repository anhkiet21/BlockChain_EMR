package com.blockchain.emr.auth.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "wallet_nonces")
@Getter
@NoArgsConstructor
public class WalletNonce {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "wallet_address", nullable = false, length = 42)
    private String walletAddress;

    @Column(nullable = false, length = 100)
    private String nonce;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public WalletNonce(User user, String walletAddress, String nonce, String message, Instant expiresAt) {
        this.user = user;
        this.walletAddress = walletAddress;
        this.nonce = nonce;
        this.message = message;
        this.expiresAt = expiresAt;
    }

    public void replace(String walletAddress, String nonce, String message, Instant expiresAt) {
        this.walletAddress = walletAddress;
        this.nonce = nonce;
        this.message = message;
        this.expiresAt = expiresAt;
        this.usedAt = null;
    }

    public boolean isUsable() {
        return usedAt == null && expiresAt.isAfter(Instant.now());
    }

    public void markUsed() {
        usedAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}

