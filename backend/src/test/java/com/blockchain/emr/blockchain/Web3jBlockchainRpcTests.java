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
        String accessTransaction = System.getenv("SMOKE_ACCESS_TRANSACTION_HASH");
        String facilityTransaction = System.getenv("SMOKE_FACILITY_ACCESS_TRANSACTION_HASH");
        String metadataTransaction = System.getenv("SMOKE_METADATA_TRANSACTION_HASH");

        assertThat(blockchainService.hasAccess(patient, doctor)).isTrue();
        var record = blockchainService.getRecord(BigInteger.ZERO, doctor);
        assertThat(record.cid()).isEqualTo("bafy-backend-smoke-cid");
        assertThat(record.contentHash()).matches("^0x[0-9a-f]{64}$");
        assertThat(record.latestVersion()).isTrue();
        var metadata = blockchainService.getRecordMetadata(BigInteger.ONE, patient);
        assertThat(metadata.sourceType()).isEqualTo("PATIENT_UPLOADED");
        assertThat(metadata.uploaderWallet()).isEqualTo(patient.toLowerCase());
        assertThat(metadata.facilityId()).isEmpty();
        assertThat(blockchainService.getAccessTransaction(accessTransaction).accessEvent().granted()).isTrue();
        var facilityAccess = blockchainService.getFacilityAccessTransaction(facilityTransaction);
        assertThat(facilityAccess.facilityAccessEvent().facilityId()).isEqualTo("BV001");
        assertThat(facilityAccess.facilityAccessEvent().granted()).isTrue();
        var recordTransaction = blockchainService.getRecordTransaction(metadataTransaction);
        assertThat(recordTransaction.recordEvent().recordId()).isEqualTo(BigInteger.ONE);
        assertThat(recordTransaction.recordEvent().patientWallet()).isEqualTo(patient.toLowerCase());
        assertThat(blockchainService.getTransactionState(transaction).status())
                .isEqualTo(BlockchainService.TransactionState.Status.SUCCESS);
        BigInteger latest = blockchainService.latestBlock();
        assertThat(blockchainService.readAccessEvents(BigInteger.ZERO, latest)).hasSize(1);
        assertThat(blockchainService.readRecordEvents(BigInteger.ZERO, latest)).hasSize(2);
    }
}
