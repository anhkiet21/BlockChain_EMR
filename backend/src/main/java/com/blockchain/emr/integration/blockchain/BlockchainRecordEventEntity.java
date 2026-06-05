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
@Table(name = "blockchain_record_events")
@NoArgsConstructor
class BlockchainRecordEventEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "transaction_hash", nullable = false, length = 66) private String transactionHash;
    @Column(name = "log_index", nullable = false) private Long logIndex;
    @Column(name = "block_number", nullable = false, precision = 65) private BigInteger blockNumber;
    @Column(name = "on_chain_record_id", nullable = false, precision = 65) private BigInteger onChainRecordId;
    @Column(name = "patient_wallet", nullable = false, length = 42) private String patientWallet;
    @Column(name = "author_wallet", nullable = false, length = 42) private String authorWallet;
    @Column(nullable = false, length = 255) private String cid;
    @Column(name = "occurred_at", nullable = false) private Instant occurredAt;

    BlockchainRecordEventEntity(BlockchainService.RecordEvent event) {
        transactionHash = event.transactionHash(); logIndex = event.logIndex(); blockNumber = event.blockNumber();
        onChainRecordId = event.recordId(); patientWallet = event.patientWallet(); authorWallet = event.authorWallet();
        cid = event.cid(); occurredAt = event.occurredAt();
    }
}
