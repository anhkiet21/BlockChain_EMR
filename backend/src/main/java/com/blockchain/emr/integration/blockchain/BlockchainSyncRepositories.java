package com.blockchain.emr.integration.blockchain;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface BlockchainSyncStateRepository extends JpaRepository<BlockchainSyncState, Long> {
    Optional<BlockchainSyncState> findByContractAddress(String contractAddress);
}

interface BlockchainAccessEventRepository extends JpaRepository<BlockchainAccessEventEntity, Long> {
    boolean existsByTransactionHashAndLogIndex(String transactionHash, Long logIndex);
}

interface BlockchainRecordEventRepository extends JpaRepository<BlockchainRecordEventEntity, Long> {
    boolean existsByTransactionHashAndLogIndex(String transactionHash, Long logIndex);
}
