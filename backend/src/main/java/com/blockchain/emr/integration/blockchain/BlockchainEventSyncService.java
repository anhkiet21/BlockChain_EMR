package com.blockchain.emr.integration.blockchain;

import java.math.BigInteger;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BlockchainEventSyncService {

    private final BlockchainService blockchainService;
    private final BlockchainSyncStateRepository stateRepository;
    private final BlockchainAccessEventRepository accessRepository;
    private final BlockchainRecordEventRepository recordRepository;
    private final String contractAddress;
    private final BigInteger startBlock;

    public BlockchainEventSyncService(
            BlockchainService blockchainService,
            BlockchainSyncStateRepository stateRepository,
            BlockchainAccessEventRepository accessRepository,
            BlockchainRecordEventRepository recordRepository,
            @Value("${app.blockchain.contract-address:}") String contractAddress,
            @Value("${app.blockchain.sync-start-block:0}") BigInteger startBlock) {
        this.blockchainService = blockchainService;
        this.stateRepository = stateRepository;
        this.accessRepository = accessRepository;
        this.recordRepository = recordRepository;
        this.contractAddress = contractAddress.toLowerCase(Locale.ROOT);
        this.startBlock = startBlock;
    }

    @Transactional
    public SyncResult sync() {
        BigInteger latest = blockchainService.latestBlock();
        BlockchainSyncState state = stateRepository.findByContractAddress(contractAddress)
                .orElseGet(() -> new BlockchainSyncState(contractAddress, startBlock.subtract(BigInteger.ONE)));
        BigInteger from = state.getLastSyncedBlock().add(BigInteger.ONE);
        if (from.compareTo(latest) > 0) {
            return new SyncResult(from, latest, 0, 0);
        }

        int accessCount = 0;
        for (var event : blockchainService.readAccessEvents(from, latest)) {
            if (!accessRepository.existsByTransactionHashAndLogIndex(event.transactionHash(), event.logIndex())) {
                accessRepository.save(new BlockchainAccessEventEntity(event));
                accessCount++;
            }
        }
        int recordCount = 0;
        for (var event : blockchainService.readRecordEvents(from, latest)) {
            if (!recordRepository.existsByTransactionHashAndLogIndex(event.transactionHash(), event.logIndex())) {
                recordRepository.save(new BlockchainRecordEventEntity(event));
                recordCount++;
            }
        }
        state.advanceTo(latest);
        stateRepository.save(state);
        return new SyncResult(from, latest, accessCount, recordCount);
    }

    public record SyncResult(BigInteger fromBlock, BigInteger toBlock, int accessEvents, int recordEvents) {}
}
