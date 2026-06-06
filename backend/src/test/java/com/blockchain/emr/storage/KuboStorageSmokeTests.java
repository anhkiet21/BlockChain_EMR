package com.blockchain.emr.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.blockchain.emr.integration.storage.domain.StorageService;

@SpringBootTest(properties = "app.storage.provider=kubo")
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "IPFS_SMOKE_TEST", matches = "true")
class KuboStorageSmokeTests {
    @Autowired StorageService storage;

    @Test
    void storesAndRetrievesBytesFromLocalKubo() {
        byte[] content = "encrypted-smoke-test".getBytes(StandardCharsets.UTF_8);
        var stored = storage.store(content, "smoke.bin");

        assertThat(stored.cid()).isNotBlank();
        assertThat(storage.retrieve(stored.cid())).isEqualTo(content);
        storage.delete(stored.cid());
    }
}
