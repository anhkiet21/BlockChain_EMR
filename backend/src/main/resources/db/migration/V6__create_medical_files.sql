CREATE TABLE medical_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    uploaded_by_user_id BIGINT NOT NULL,
    cid VARCHAR(255) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    original_size BIGINT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    encryption_iv VARCHAR(32) NOT NULL,
    encryption_algorithm VARCHAR(30) NOT NULL,
    storage_provider VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_medical_files_patient FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id),
    CONSTRAINT fk_medical_files_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
);

CREATE INDEX idx_medical_files_patient_created ON medical_files (patient_profile_id, created_at);
