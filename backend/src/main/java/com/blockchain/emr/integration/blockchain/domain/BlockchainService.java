package com.blockchain.emr.integration.blockchain.domain;

import java.math.BigInteger;
import java.time.Instant;
import java.util.List;

public interface BlockchainService {

    boolean hasAccess(String patientWallet, String granteeWallet);
    PreparedTransaction prepareAccessTransaction(String patientWallet, String granteeWallet, boolean granted);
    AccessTransaction getAccessTransaction(String transactionHash);
    OnChainRecord getRecord(BigInteger recordId, String callerWallet);
    TransactionState getTransactionState(String transactionHash);
    BigInteger latestBlock();
    List<AccessEvent> readAccessEvents(BigInteger fromBlock, BigInteger toBlock);
    List<RecordEvent> readRecordEvents(BigInteger fromBlock, BigInteger toBlock);

    record OnChainRecord(BigInteger recordId, String cid, String patientWallet, String authorWallet, Instant createdAt) {}
    record PreparedTransaction(String from, String to, String data, BigInteger chainId, String value) {}
    record AccessTransaction(
            String transactionHash, String from, String to, String input, TransactionState.Status status,
            BigInteger blockNumber, String failureReason, AccessEvent accessEvent) {}
    record TransactionState(String transactionHash, Status status, BigInteger blockNumber, String failureReason) {
        public enum Status { PENDING, SUCCESS, FAILED }
    }
    record AccessEvent(
            String transactionHash, long logIndex, BigInteger blockNumber,
            String patientWallet, String granteeWallet, boolean granted, Instant occurredAt) {}
    record RecordEvent(
            String transactionHash, long logIndex, BigInteger blockNumber, BigInteger recordId,
            String patientWallet, String authorWallet, String cid, Instant occurredAt) {}
}
