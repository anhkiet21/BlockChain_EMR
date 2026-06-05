package com.blockchain.emr.integration.blockchain.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BlockchainAccessEventRepository extends JpaRepository<BlockchainAccessEventEntity, Long> {
    boolean existsByTransactionHashAndLogIndex(String transactionHash, Long logIndex);
}
