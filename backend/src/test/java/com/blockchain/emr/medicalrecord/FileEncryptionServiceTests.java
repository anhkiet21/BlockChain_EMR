package com.blockchain.emr.medicalrecord;

import static org.assertj.core.api.Assertions.*;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

import com.blockchain.emr.medicalrecord.application.FileEncryptionService;

class FileEncryptionServiceTests {
    private final FileEncryptionService encryption =
            new FileEncryptionService("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");

    @Test
    void encryptsWithRandomIvAndDecryptsOriginalContent() {
        byte[] plaintext = "sensitive-medical-file".getBytes(StandardCharsets.UTF_8);

        var first = encryption.encrypt(plaintext);
        var second = encryption.encrypt(plaintext);

        assertThat(first.content()).isNotEqualTo(plaintext).isNotEqualTo(second.content());
        assertThat(first.iv()).isNotEqualTo(second.iv());
        assertThat(encryption.decrypt(first.content(), first.iv())).isEqualTo(plaintext);
    }

    @Test
    void rejectsInvalidKeyAndTamperedCiphertext() {
        assertThatThrownBy(() -> new FileEncryptionService("AAAA"))
                .isInstanceOf(IllegalArgumentException.class);

        var encrypted = encryption.encrypt("record".getBytes(StandardCharsets.UTF_8));
        encrypted.content()[0] ^= 1;
        assertThatThrownBy(() -> encryption.decrypt(encrypted.content(), encrypted.iv()))
                .isInstanceOf(IllegalStateException.class);
    }
}
