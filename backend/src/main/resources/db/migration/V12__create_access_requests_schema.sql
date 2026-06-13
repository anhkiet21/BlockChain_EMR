CREATE TABLE access_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    doctor_profile_id BIGINT NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    transaction_hash VARCHAR(66) NULL,
    rejected_reason VARCHAR(500) NULL,
    responded_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_access_requests_patient FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id),
    CONSTRAINT fk_access_requests_doctor FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles (id)
);

CREATE INDEX idx_access_requests_patient ON access_requests (patient_profile_id, status, created_at);
CREATE INDEX idx_access_requests_doctor ON access_requests (doctor_profile_id, status, created_at);
