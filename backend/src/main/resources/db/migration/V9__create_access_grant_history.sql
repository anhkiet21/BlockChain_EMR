CREATE TABLE access_grant_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    doctor_profile_id BIGINT NOT NULL,
    patient_wallet VARCHAR(42) NOT NULL,
    doctor_wallet VARCHAR(42) NOT NULL,
    granted BOOLEAN NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number DECIMAL(65, 0) NOT NULL,
    log_index BIGINT NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_access_grant_history_transaction UNIQUE (transaction_hash),
    CONSTRAINT fk_access_grant_history_patient FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id),
    CONSTRAINT fk_access_grant_history_doctor FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles (id)
);

CREATE INDEX idx_access_grant_history_patient_chain_order
    ON access_grant_history (patient_profile_id, block_number, log_index);

CREATE INDEX idx_access_grant_history_pair_chain_order
    ON access_grant_history (patient_profile_id, doctor_profile_id, block_number, log_index);
