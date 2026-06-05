package com.blockchain.emr.auth.infrastructure;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.auth.domain.WalletAddress;

public interface WalletAddressRepository extends JpaRepository<WalletAddress, Long> {
    boolean existsByAddress(String address);
    Optional<WalletAddress> findByAddress(String address);
    List<WalletAddress> findAllByUserId(Long userId);
}
