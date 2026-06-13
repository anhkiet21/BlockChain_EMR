CREATE TABLE access_grants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    doctor_profile_id BIGINT NOT NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_access_grants_patient_doctor UNIQUE (patient_profile_id, doctor_profile_id),
    CONSTRAINT fk_access_grants_patient FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id),
    CONSTRAINT fk_access_grants_doctor FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles (id)
);

CREATE INDEX idx_access_grants_doctor_active ON access_grants (doctor_profile_id, revoked_at);

CREATE TABLE medical_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    author_doctor_profile_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    record_type VARCHAR(30) NOT NULL,
    cid VARCHAR(255) NOT NULL,
    content_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_medical_records_cid UNIQUE (cid),
    CONSTRAINT fk_medical_records_patient FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id),
    CONSTRAINT fk_medical_records_author FOREIGN KEY (author_doctor_profile_id) REFERENCES doctor_profiles (id)
);

CREATE INDEX idx_medical_records_patient_created ON medical_records (patient_profile_id, created_at);
CREATE INDEX idx_medical_records_author_created ON medical_records (author_doctor_profile_id, created_at);
