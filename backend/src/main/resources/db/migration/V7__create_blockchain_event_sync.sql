CREATE TABLE blockchain_sync_states (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL UNIQUE,
    last_synced_block DECIMAL(65, 0) NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE blockchain_access_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL,
    log_index BIGINT NOT NULL,
    block_number DECIMAL(65, 0) NOT NULL,
    patient_wallet VARCHAR(42) NOT NULL,
    grantee_wallet VARCHAR(42) NOT NULL,
    granted BOOLEAN NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_blockchain_access_event UNIQUE (transaction_hash, log_index)
);

CREATE INDEX idx_blockchain_access_patient_grantee ON blockchain_access_events (patient_wallet, grantee_wallet);
CREATE INDEX idx_blockchain_access_block ON blockchain_access_events (block_number);

CREATE TABLE blockchain_record_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL,
    log_index BIGINT NOT NULL,
    block_number DECIMAL(65, 0) NOT NULL,
    on_chain_record_id DECIMAL(65, 0) NOT NULL,
    patient_wallet VARCHAR(42) NOT NULL,
    author_wallet VARCHAR(42) NOT NULL,
    cid VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_blockchain_record_event UNIQUE (transaction_hash, log_index)
);

CREATE INDEX idx_blockchain_record_patient ON blockchain_record_events (patient_wallet, on_chain_record_id);
CREATE INDEX idx_blockchain_record_block ON blockchain_record_events (block_number);
