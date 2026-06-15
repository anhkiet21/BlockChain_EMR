package com.blockchain.emr.integration.blockchain.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigInteger;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.blockchain.emr.integration.blockchain.domain.BlockchainService;

class BlockchainControllerResponseTests {

    @Test
    void serializableResponseKeepsBlockchainIdentifiersAsExactStrings() {
        BigInteger noPreviousRecordId = BigInteger.TWO.pow(256).subtract(BigInteger.ONE);
        var record = new BlockchainService.OnChainRecord(
                BigInteger.valueOf(42),
                "bafy-test",
                "0x" + "a".repeat(64),
                "0x1111111111111111111111111111111111111111",
                "0x2222222222222222222222222222222222222222",
                Instant.parse("2026-06-15T00:00:00Z"),
                noPreviousRecordId,
                true);

        var response = BlockchainController.OnChainRecordResponse.from(record);

        assertThat(response.recordId()).isEqualTo("42");
        assertThat(response.previousRecordId()).isEqualTo(noPreviousRecordId.toString());
    }
}
