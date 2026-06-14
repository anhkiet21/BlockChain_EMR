package com.blockchain.emr.blockchain;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.integration.blockchain.application.BlockchainQueryService;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;

@ExtendWith(MockitoExtension.class)
class BlockchainQueryServiceTests {
    private final BlockchainService blockchain = mock(BlockchainService.class);
    private final WalletAddressRepository wallets = mock(WalletAddressRepository.class);
    private final BlockchainQueryService service = new BlockchainQueryService(blockchain, wallets);

    @Test
    void checksFacilityAccessUsingOwnedPatientWalletAndFacilityId() {
        User user = mock(User.class);
        WalletAddress linked = mock(WalletAddress.class);
        when(user.getId()).thenReturn(7L);
        when(linked.getUser()).thenReturn(user);
        when(wallets.findByAddress("0xabc")).thenReturn(Optional.of(linked));
        when(blockchain.hasFacilityAccess("0xabc", "BV001")).thenReturn(true);

        assertThat(service.hasFacilityAccess(7L, false, "0xABC", "BV001")).isTrue();
        verify(blockchain).hasFacilityAccess("0xabc", "BV001");
    }

    @Test
    void deniesUnownedWalletButAllowsAdminRead() {
        when(wallets.findByAddress("0xabc")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.hasFacilityAccess(7L, false, "0xABC", "BV001"))
                .isInstanceOf(AccessDeniedException.class);

        service.hasFacilityAccess(7L, true, "0xABC", "BV001");
        verify(blockchain).hasFacilityAccess("0xabc", "BV001");
    }
}
