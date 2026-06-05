package com.blockchain.emr.integration.blockchain;

import java.math.BigInteger;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "blockchain_access_events")
@NoArgsConstructor
class BlockchainAccessEventEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "transaction_hash", nullable = false, length = 66) private String transactionHash;
    @Column(name = "log_index", nullable = false) private Long logIndex;
    @Column(name = "block_number", nullable = false, precision = 65) private BigInteger blockNumber;
    @Column(name = "patient_wallet", nullable = false, length = 42) private String patientWallet;
    @Column(name = "grantee_wallet", nullable = false, length = 42) private String granteeWallet;
    @Column(nullable = false) private boolean granted;
    @Column(name = "occurred_at", nullable = false) private Instant occurredAt;

    BlockchainAccessEventEntity(BlockchainService.AccessEvent event) {
        transactionHash = event.transactionHash(); logIndex = event.logIndex(); blockNumber = event.blockNumber();
        patientWallet = event.patientWallet(); granteeWallet = event.granteeWallet(); granted = event.granted();
        occurredAt = event.occurredAt();
    }
}
