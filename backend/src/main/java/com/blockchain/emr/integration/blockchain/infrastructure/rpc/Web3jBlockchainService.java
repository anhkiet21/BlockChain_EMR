package com.blockchain.emr.integration.blockchain.infrastructure.rpc;

import java.io.IOException;
import java.math.BigInteger;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.Callable;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.crypto.WalletUtils;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.exceptions.ClientConnectionException;
import org.web3j.protocol.core.DefaultBlockParameterNumber;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.Transaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.ReadonlyTransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.utils.Numeric;

import com.blockchain.emr.integration.blockchain.generated.MedicalRecordRegistry;
import com.blockchain.emr.integration.blockchain.domain.BlockchainException;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;

@Service
public class Web3jBlockchainService implements BlockchainService {

    private final Web3j web3j;
    private final String contractAddress;

    public Web3jBlockchainService(Web3j web3j, @Value("${app.blockchain.contract-address:}") String contractAddress) {
        this.web3j = web3j;
        this.contractAddress = contractAddress.toLowerCase(Locale.ROOT);
    }

    @Override
    public boolean hasAccess(String patientWallet, String granteeWallet) {
        validateAddress(patientWallet);
        validateAddress(granteeWallet);
        return execute(() -> contract(patientWallet).accessGrants(patientWallet, granteeWallet).send());
    }

    @Override
    public PreparedTransaction prepareAccessTransaction(String patientWallet, String granteeWallet, boolean granted) {
        validateAddress(patientWallet);
        validateAddress(granteeWallet);
        Function function = new Function(granted ? "grantAccess" : "revokeAccess",
                List.of(new Address(granteeWallet)), List.of());
        BigInteger chainId = execute(() -> web3j.ethChainId().send().getChainId());
        return new PreparedTransaction(normalize(patientWallet), contractAddress,
                FunctionEncoder.encode(function), chainId, "0x0");
    }

    @Override
    public AccessTransaction getAccessTransaction(String transactionHash) {
        validateTransactionHash(transactionHash);
        Transaction transaction = execute(() -> web3j.ethGetTransactionByHash(transactionHash).send().getTransaction())
                .orElseThrow(BlockchainException::readFailed);
        Optional<TransactionReceipt> receipt = execute(() ->
                web3j.ethGetTransactionReceipt(transactionHash).send().getTransactionReceipt());
        if (receipt.isEmpty()) {
            return new AccessTransaction(transactionHash, normalize(transaction.getFrom()), normalize(transaction.getTo()),
                    transaction.getInput(), TransactionState.Status.PENDING, null, null, null);
        }
        TransactionReceipt value = receipt.get();
        AccessEvent event = value.getLogs().stream()
                .filter(log -> normalize(log.getAddress()).equals(contractAddress))
                .filter(this::isAccessEvent)
                .findFirst().map(this::accessEvent).orElse(null);
        return new AccessTransaction(transactionHash, normalize(transaction.getFrom()), normalize(transaction.getTo()),
                transaction.getInput(), value.isStatusOK() ? TransactionState.Status.SUCCESS : TransactionState.Status.FAILED,
                value.getBlockNumber(), value.isStatusOK() ? null : value.getRevertReason(), event);
    }

    @Override
    public OnChainRecord getRecord(BigInteger recordId, String callerWallet) {
        validateAddress(callerWallet);
        var record = execute(() -> contract(callerWallet).getRecord(recordId).send());
        boolean latest = execute(() -> contract(callerWallet).isLatestVersion(recordId).send());
        return new OnChainRecord(
                recordId, record.cid, Numeric.toHexString(record.contentHash), normalize(record.patient),
                normalize(record.author), Instant.ofEpochSecond(record.createdAt.longValueExact()),
                record.previousRecordId, latest);
    }

    @Override
    public TransactionState getTransactionState(String transactionHash) {
        validateTransactionHash(transactionHash);
        Optional<TransactionReceipt> receipt = execute(() ->
                web3j.ethGetTransactionReceipt(transactionHash).send().getTransactionReceipt());
        if (receipt.isEmpty()) {
            return new TransactionState(transactionHash, TransactionState.Status.PENDING, null, null);
        }
        TransactionReceipt value = receipt.get();
        return new TransactionState(
                transactionHash,
                value.isStatusOK() ? TransactionState.Status.SUCCESS : TransactionState.Status.FAILED,
                value.getBlockNumber(),
                value.isStatusOK() ? null : value.getRevertReason());
    }

    @Override
    public BigInteger latestBlock() {
        validateConfiguredContract();
        return execute(() -> web3j.ethBlockNumber().send().getBlockNumber());
    }

    @Override
    public List<AccessEvent> readAccessEvents(BigInteger fromBlock, BigInteger toBlock) {
        var granted = logs(fromBlock, toBlock, MedicalRecordRegistry.ACCESSGRANTED_EVENT).stream()
                .map(this::accessEvent);
        var revoked = logs(fromBlock, toBlock, MedicalRecordRegistry.ACCESSREVOKED_EVENT).stream()
                .map(this::accessEvent);
        return java.util.stream.Stream.concat(granted, revoked)
                .sorted(java.util.Comparator.comparing(AccessEvent::blockNumber).thenComparingLong(AccessEvent::logIndex))
                .toList();
    }

    @Override
    public List<RecordEvent> readRecordEvents(BigInteger fromBlock, BigInteger toBlock) {
        return logs(fromBlock, toBlock, MedicalRecordRegistry.RECORDCREATED_EVENT).stream()
                .map(log -> {
                    var data = FunctionReturnDecoder.decode(
                            log.getData(), MedicalRecordRegistry.RECORDCREATED_EVENT.getNonIndexedParameters());
                    return new RecordEvent(
                            log.getTransactionHash(), log.getLogIndex().longValueExact(), log.getBlockNumber(),
                            Numeric.toBigInt(log.getTopics().get(1)), decodeAddress(log.getTopics().get(2)),
                            decodeAddress(log.getTopics().get(3)), (String) data.get(0).getValue(),
                            blockTime(log.getBlockNumber()));
                }).toList();
    }

    private List<Log> logs(BigInteger fromBlock, BigInteger toBlock, org.web3j.abi.datatypes.Event event) {
        validateConfiguredContract();
        EthFilter filter = new EthFilter(
                new DefaultBlockParameterNumber(fromBlock), new DefaultBlockParameterNumber(toBlock), contractAddress);
        filter.addSingleTopic(EventEncoder.encode(event));
        return execute(() -> web3j.ethGetLogs(filter).send().getLogs().stream()
                .map(result -> (Log) result.get()).toList());
    }

    private Instant blockTime(BigInteger blockNumber) {
        return Instant.ofEpochSecond(execute(() ->
                web3j.ethGetBlockByNumber(new DefaultBlockParameterNumber(blockNumber), false)
                        .send().getBlock().getTimestamp().longValueExact()));
    }

    private AccessEvent accessEvent(Log log) {
        boolean granted = log.getTopics().get(0).equals(EventEncoder.encode(MedicalRecordRegistry.ACCESSGRANTED_EVENT));
        return new AccessEvent(
                log.getTransactionHash(), log.getLogIndex().longValueExact(), log.getBlockNumber(),
                decodeAddress(log.getTopics().get(1)), decodeAddress(log.getTopics().get(2)),
                granted, blockTime(log.getBlockNumber()));
    }

    private boolean isAccessEvent(Log log) {
        if (log.getTopics().isEmpty()) return false;
        String signature = log.getTopics().get(0);
        return signature.equals(EventEncoder.encode(MedicalRecordRegistry.ACCESSGRANTED_EVENT))
                || signature.equals(EventEncoder.encode(MedicalRecordRegistry.ACCESSREVOKED_EVENT));
    }

    private MedicalRecordRegistry contract(String caller) {
        return MedicalRecordRegistry.load(
                contractAddress, web3j, new ReadonlyTransactionManager(web3j, caller), new DefaultGasProvider());
    }

    private void validateConfiguredContract() {
        if (!WalletUtils.isValidAddress(contractAddress) || Numeric.toBigInt(contractAddress).signum() == 0) {
            throw BlockchainException.unavailable();
        }
    }

    private void validateAddress(String address) {
        validateConfiguredContract();
        if (!WalletUtils.isValidAddress(address) || Numeric.toBigInt(address).signum() == 0) {
            throw BlockchainException.readFailed();
        }
    }

    private void validateTransactionHash(String transactionHash) {
        validateConfiguredContract();
        if (transactionHash == null || !transactionHash.matches("^0x[0-9a-fA-F]{64}$")) {
            throw BlockchainException.readFailed();
        }
    }

    private String decodeAddress(String topic) {
        return "0x" + topic.substring(topic.length() - 40).toLowerCase(Locale.ROOT);
    }

    private String normalize(String address) {
        return address == null ? "" : address.toLowerCase(Locale.ROOT);
    }

    private <T> T execute(Callable<T> action) {
        try {
            return action.call();
        } catch (BlockchainException exception) {
            throw exception;
        } catch (IOException | ClientConnectionException exception) {
            throw BlockchainException.unavailable();
        } catch (Exception exception) {
            throw BlockchainException.readFailed();
        }
    }
}
