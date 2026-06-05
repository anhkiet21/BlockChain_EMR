package com.blockchain.emr.integration.blockchain;

import java.math.BigInteger;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "blockchain_sync_states")
@Getter
@NoArgsConstructor
class BlockchainSyncState {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "contract_address", nullable = false, unique = true, length = 42) private String contractAddress;
    @Column(name = "last_synced_block", nullable = false, precision = 65) private BigInteger lastSyncedBlock;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    BlockchainSyncState(String contractAddress, BigInteger lastSyncedBlock) {
        this.contractAddress = contractAddress;
        advanceTo(lastSyncedBlock);
    }

    void advanceTo(BigInteger block) {
        this.lastSyncedBlock = block;
        this.updatedAt = Instant.now();
    }
}
