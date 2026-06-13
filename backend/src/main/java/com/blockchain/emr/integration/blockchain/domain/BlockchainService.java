package com.blockchain.emr.integration.blockchain.domain;

import java.math.BigInteger;
import java.time.Instant;
import java.util.List;

public interface BlockchainService {

    boolean hasAccess(String patientWallet, String granteeWallet);
    boolean hasFacilityAccess(String patientWallet, String facilityId);
    PreparedTransaction prepareAccessTransaction(String patientWallet, String granteeWallet, boolean granted);
    PreparedTransaction prepareFacilityAccessTransaction(String patientWallet, String facilityId, boolean granted);
    PreparedTransaction prepareRecordTransaction(
            String uploaderWallet, String patientWallet, String cid, String contentHash,
            String sourceType, String facilityId);
    PreparedTransaction prepareRecordVersionTransaction(
            String uploaderWallet, BigInteger previousRecordId, String cid, String contentHash,
            String facilityId);
    AccessTransaction getAccessTransaction(String transactionHash);
    FacilityAccessTransaction getFacilityAccessTransaction(String transactionHash);
    RecordTransaction getRecordTransaction(String transactionHash);
    OnChainRecord getRecord(BigInteger recordId, String callerWallet);
    OnChainRecordMetadata getRecordMetadata(BigInteger recordId, String callerWallet);
    TransactionState getTransactionState(String transactionHash);
    BigInteger latestBlock();
    List<AccessEvent> readAccessEvents(BigInteger fromBlock, BigInteger toBlock);
    List<RecordEvent> readRecordEvents(BigInteger fromBlock, BigInteger toBlock);

    record OnChainRecord(
            BigInteger recordId, String cid, String contentHash, String patientWallet, String authorWallet,
            Instant createdAt, BigInteger previousRecordId, boolean latestVersion) {
        public OnChainRecord(
                BigInteger recordId, String cid, String patientWallet, String authorWallet, Instant createdAt) {
            this(recordId, cid, null, patientWallet, authorWallet, createdAt, null, true);
        }
    }
    record OnChainRecordMetadata(
            String sourceType, String uploaderWallet, String facilityId) {}
    record PreparedTransaction(String from, String to, String data, BigInteger chainId, String value) {}
    record AccessTransaction(
            String transactionHash, String from, String to, String input, TransactionState.Status status,
            BigInteger blockNumber, String failureReason, AccessEvent accessEvent) {}
    record FacilityAccessTransaction(
            String transactionHash, String from, String to, String input, TransactionState.Status status,
            BigInteger blockNumber, String failureReason, FacilityAccessEvent facilityAccessEvent) {}
    record RecordTransaction(
            String transactionHash, String from, String to, String input, TransactionState.Status status,
            BigInteger blockNumber, String failureReason, RecordEvent recordEvent) {}
    record TransactionState(String transactionHash, Status status, BigInteger blockNumber, String failureReason) {
        public enum Status { PENDING, SUCCESS, FAILED }
    }
    record AccessEvent(
            String transactionHash, long logIndex, BigInteger blockNumber,
            String patientWallet, String granteeWallet, boolean granted, Instant occurredAt) {}
    record FacilityAccessEvent(
            String transactionHash, long logIndex, BigInteger blockNumber,
            String patientWallet, String facilityId, boolean granted, Instant occurredAt) {}
    record RecordEvent(
            String transactionHash, long logIndex, BigInteger blockNumber, BigInteger recordId,
            String patientWallet, String authorWallet, String cid, Instant occurredAt) {}
}
