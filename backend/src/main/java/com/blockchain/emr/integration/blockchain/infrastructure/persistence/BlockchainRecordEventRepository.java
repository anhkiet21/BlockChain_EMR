package com.blockchain.emr.integration.blockchain.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BlockchainRecordEventRepository extends JpaRepository<BlockchainRecordEventEntity, Long> {
    boolean existsByTransactionHashAndLogIndex(String transactionHash, Long logIndex);
}
