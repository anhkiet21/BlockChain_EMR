CREATE TABLE facility_access_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    healthcare_facility_id BIGINT NOT NULL,
    patient_wallet VARCHAR(42) NOT NULL,
    granted BOOLEAN NOT NULL,
    blockchain_tx_hash VARCHAR(66) NOT NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uk_facility_access_audit_tx UNIQUE (blockchain_tx_hash),
    CONSTRAINT fk_facility_access_audit_patient
        FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id),
    CONSTRAINT fk_facility_access_audit_facility
        FOREIGN KEY (healthcare_facility_id) REFERENCES healthcare_facilities(id),
    INDEX idx_facility_access_audit_occurred (occurred_at, id)
);
