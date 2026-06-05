package com.blockchain.emr.integration.storage.adapter;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import com.blockchain.emr.integration.storage.domain.StorageException;
import com.blockchain.emr.integration.storage.domain.StorageService;
import com.blockchain.emr.integration.storage.domain.StoredObject;

@Component
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "memory")
public class InMemoryStorageAdapter implements StorageService {

    private final Map<String, byte[]> objects = new ConcurrentHashMap<>();

    @Override
    public StoredObject store(byte[] content, String filename) {
        String cid = "test-" + hex(sha256(content));
        objects.put(cid, content.clone());
        return new StoredObject(cid);
    }

    @Override
    public byte[] retrieve(String cid) {
        byte[] content = objects.get(cid);
        if (content == null) {
            throw new StorageException("Stored object not found");
        }
        return content.clone();
    }

    @Override
    public String provider() {
        return "MEMORY";
    }

    private byte[] sha256(byte[] content) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(content);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String hex(byte[] content) {
        return java.util.HexFormat.of().formatHex(content);
    }
}
