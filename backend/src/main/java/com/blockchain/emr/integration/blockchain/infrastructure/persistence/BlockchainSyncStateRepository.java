package com.blockchain.emr.integration.blockchain.infrastructure.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlockchainSyncStateRepository extends JpaRepository<BlockchainSyncState, Long> {
    Optional<BlockchainSyncState> findByContractAddress(String contractAddress);
}
