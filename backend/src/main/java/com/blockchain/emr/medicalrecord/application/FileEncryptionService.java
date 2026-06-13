package com.blockchain.emr.medicalrecord.application;

import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FileEncryptionService {

    public static final String ALGORITHM = "AES-256-GCM";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final SecretKeySpec key;
    private final SecureRandom secureRandom = new SecureRandom();

    public FileEncryptionService(@Value("${app.storage.encryption-key}") String encodedKey) {
        byte[] decoded = Base64.getDecoder().decode(encodedKey);
        if (decoded.length != 32) {
            throw new IllegalArgumentException("Storage encryption key must be exactly 32 bytes");
        }
        this.key = new SecretKeySpec(decoded, "AES");
    }

    public EncryptedFile encrypt(byte[] plaintext) {
        byte[] iv = new byte[IV_LENGTH];
        secureRandom.nextBytes(iv);
        return new EncryptedFile(crypt(Cipher.ENCRYPT_MODE, plaintext, iv), Base64.getEncoder().encodeToString(iv));
    }

    public byte[] decrypt(byte[] ciphertext, String encodedIv) {
        return crypt(Cipher.DECRYPT_MODE, ciphertext, Base64.getDecoder().decode(encodedIv));
    }

    private byte[] crypt(int mode, byte[] content, byte[] iv) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(mode, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return cipher.doFinal(content);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Could not process encrypted medical file", exception);
        }
    }

    public record EncryptedFile(byte[] content, String iv) {
    }
}
