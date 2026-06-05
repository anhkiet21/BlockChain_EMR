package com.blockchain.emr.auth.infrastructure;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.auth.domain.WalletNonce;

public interface WalletNonceRepository extends JpaRepository<WalletNonce, Long> {
    Optional<WalletNonce> findByUserId(Long userId);
}

