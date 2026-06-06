package com.blockchain.emr.integration.storage.domain;

public interface StorageService {
    StoredObject store(byte[] content, String filename);
    byte[] retrieve(String cid);
    void delete(String cid);
    String provider();
}
