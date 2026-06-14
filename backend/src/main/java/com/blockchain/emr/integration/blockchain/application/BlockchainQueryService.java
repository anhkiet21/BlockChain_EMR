package com.blockchain.emr.integration.blockchain.application;

import java.math.BigInteger;
import java.util.Locale;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService.OnChainRecord;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService.TransactionState;

@Service
public class BlockchainQueryService {

    private final BlockchainService blockchainService;
    private final WalletAddressRepository walletRepository;

    public BlockchainQueryService(BlockchainService blockchainService, WalletAddressRepository walletRepository) {
        this.blockchainService = blockchainService;
        this.walletRepository = walletRepository;
    }

    public boolean hasFacilityAccess(Long userId, boolean admin, String patientWallet, String facilityId) {
        requireOwnedWallet(userId, admin, patientWallet);
        return blockchainService.hasFacilityAccess(normalize(patientWallet), facilityId);
    }

    public OnChainRecord getRecord(Long userId, boolean admin, BigInteger recordId, String callerWallet) {
        requireOwnedWallet(userId, admin, callerWallet);
        return blockchainService.getRecord(recordId, normalize(callerWallet));
    }

    public TransactionState getTransactionState(String transactionHash) {
        return blockchainService.getTransactionState(transactionHash);
    }

    private void requireOwnedWallet(Long userId, boolean admin, String... candidateWallets) {
        if (admin) {
            return;
        }
        for (String wallet : candidateWallets) {
            if (walletRepository.findByAddress(normalize(wallet))
                    .filter(linked -> linked.getUser().getId().equals(userId))
                    .isPresent()) {
                return;
            }
        }
        throw new AccessDeniedException("Wallet does not belong to authenticated user");
    }

    private String normalize(String address) {
        return address == null ? "" : address.toLowerCase(Locale.ROOT);
    }
}
