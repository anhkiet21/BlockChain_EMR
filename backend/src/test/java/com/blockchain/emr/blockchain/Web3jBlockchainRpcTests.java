package com.blockchain.emr.blockchain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigInteger;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.blockchain.emr.integration.blockchain.domain.BlockchainService;

@SpringBootTest
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "BLOCKCHAIN_SMOKE_TEST", matches = "true")
class Web3jBlockchainRpcTests {

    @Autowired private BlockchainService blockchainService;

    @Test
    void readsContractReceiptAndEventsFromRealRpc() {
        String patient = System.getenv("SMOKE_PATIENT_WALLET");
        String doctor = System.getenv("SMOKE_DOCTOR_WALLET");
        String transaction = System.getenv("SMOKE_TRANSACTION_HASH");

        assertThat(blockchainService.hasAccess(patient, doctor)).isTrue();
        assertThat(blockchainService.getRecord(BigInteger.ZERO, doctor).cid()).isEqualTo("bafy-backend-smoke-cid");
        assertThat(blockchainService.getTransactionState(transaction).status())
                .isEqualTo(BlockchainService.TransactionState.Status.SUCCESS);
        BigInteger latest = blockchainService.latestBlock();
        assertThat(blockchainService.readAccessEvents(BigInteger.ZERO, latest)).hasSize(1);
        assertThat(blockchainService.readRecordEvents(BigInteger.ZERO, latest)).hasSize(1);
    }
}
