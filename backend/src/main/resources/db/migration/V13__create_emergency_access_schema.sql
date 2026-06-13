CREATE TABLE emergency_access_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    doctor_profile_id BIGINT NOT NULL,
    patient_wallet VARCHAR(42) NOT NULL,
    doctor_wallet VARCHAR(42) NOT NULL,
    reason VARCHAR(2000) NOT NULL,
    reason_hash VARCHAR(66) NOT NULL,
    transaction_hash VARCHAR(66) NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_emergency_access_patient FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id),
    CONSTRAINT fk_emergency_access_doctor FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles (id)
);

CREATE INDEX idx_emergency_access_patient ON emergency_access_records (patient_profile_id, created_at);
CREATE INDEX idx_emergency_access_doctor ON emergency_access_records (doctor_profile_id, created_at);
