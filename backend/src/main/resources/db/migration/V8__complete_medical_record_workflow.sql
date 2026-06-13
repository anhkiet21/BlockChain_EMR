ALTER TABLE medical_records ADD COLUMN on_chain_record_id DECIMAL(65, 0) NULL;
ALTER TABLE medical_records ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE medical_records ADD CONSTRAINT uk_medical_records_on_chain_id UNIQUE (on_chain_record_id);

CREATE TABLE medical_record_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    medical_record_id BIGINT NOT NULL,
    medical_file_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_medical_record_files UNIQUE (medical_record_id, medical_file_id),
    CONSTRAINT fk_record_files_record FOREIGN KEY (medical_record_id) REFERENCES medical_records (id),
    CONSTRAINT fk_record_files_file FOREIGN KEY (medical_file_id) REFERENCES medical_files (id)
);

CREATE INDEX idx_medical_record_files_file ON medical_record_files (medical_file_id);

CREATE TABLE record_access_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    medical_record_id BIGINT NULL,
    medical_file_id BIGINT NULL,
    actor_user_id BIGINT NOT NULL,
    action VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_record_logs_record FOREIGN KEY (medical_record_id) REFERENCES medical_records (id),
    CONSTRAINT fk_record_logs_file FOREIGN KEY (medical_file_id) REFERENCES medical_files (id),
    CONSTRAINT fk_record_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users (id)
);

CREATE INDEX idx_record_access_logs_record_created ON record_access_logs (medical_record_id, created_at);
CREATE INDEX idx_record_access_logs_actor_created ON record_access_logs (actor_user_id, created_at);
