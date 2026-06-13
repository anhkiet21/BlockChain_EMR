CREATE TABLE facility_access_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    healthcare_facility_id BIGINT NOT NULL,
    requested_by_doctor_profile_id BIGINT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status VARCHAR(30) NOT NULL,
    blockchain_tx_hash VARCHAR(66) NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    CONSTRAINT fk_facility_access_requests_patient
        FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id),
    CONSTRAINT fk_facility_access_requests_facility
        FOREIGN KEY (healthcare_facility_id) REFERENCES healthcare_facilities (id),
    CONSTRAINT fk_facility_access_requests_doctor
        FOREIGN KEY (requested_by_doctor_profile_id) REFERENCES doctor_profiles (id)
);

CREATE INDEX idx_facility_access_requests_patient_created
    ON facility_access_requests (patient_profile_id, created_at);
CREATE INDEX idx_facility_access_requests_pending_pair
    ON facility_access_requests (patient_profile_id, healthcare_facility_id, status);

CREATE TABLE facility_access_grants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    healthcare_facility_id BIGINT NOT NULL,
    active BOOLEAN NOT NULL,
    blockchain_tx_hash VARCHAR(66) NOT NULL UNIQUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_facility_access_grants_patient_facility
        UNIQUE (patient_profile_id, healthcare_facility_id),
    CONSTRAINT fk_facility_access_grants_patient
        FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id),
    CONSTRAINT fk_facility_access_grants_facility
        FOREIGN KEY (healthcare_facility_id) REFERENCES healthcare_facilities (id)
);

CREATE INDEX idx_facility_access_grants_facility_active
    ON facility_access_grants (healthcare_facility_id, active);
