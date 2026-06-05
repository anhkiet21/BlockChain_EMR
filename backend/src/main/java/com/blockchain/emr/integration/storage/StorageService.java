package com.blockchain.emr.integration.storage;

public interface StorageService {
    StoredObject store(byte[] content, String filename);
    byte[] retrieve(String cid);
    String provider();
}
