ALTER TABLE medical_files ADD COLUMN source_type VARCHAR(30) NULL;
ALTER TABLE medical_files ADD COLUMN uploaded_by_wallet VARCHAR(42) NULL;
ALTER TABLE medical_files ADD COLUMN healthcare_facility_id BIGINT NULL;
ALTER TABLE medical_files
    ADD CONSTRAINT fk_medical_files_facility
    FOREIGN KEY (healthcare_facility_id) REFERENCES healthcare_facilities (id);

UPDATE medical_files SET source_type = 'PATIENT_UPLOADED' WHERE source_type IS NULL;
ALTER TABLE medical_files MODIFY COLUMN source_type VARCHAR(30) NOT NULL;

ALTER TABLE medical_records MODIFY COLUMN author_doctor_profile_id BIGINT NULL;
ALTER TABLE medical_records ADD COLUMN source_type VARCHAR(30) NULL;
ALTER TABLE medical_records ADD COLUMN uploaded_by_user_id BIGINT NULL;
ALTER TABLE medical_records ADD COLUMN uploaded_by_wallet VARCHAR(42) NULL;
ALTER TABLE medical_records ADD COLUMN healthcare_facility_id BIGINT NULL;
ALTER TABLE medical_records ADD COLUMN blockchain_tx_hash VARCHAR(66) NULL;

UPDATE medical_records SET source_type = 'DOCTOR_UPLOADED' WHERE source_type IS NULL;
UPDATE medical_records
SET uploaded_by_user_id = (
    SELECT user_id FROM doctor_profiles
    WHERE doctor_profiles.id = medical_records.author_doctor_profile_id
)
WHERE uploaded_by_user_id IS NULL;

ALTER TABLE medical_records MODIFY COLUMN source_type VARCHAR(30) NOT NULL;
ALTER TABLE medical_records
    ADD CONSTRAINT fk_medical_records_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id);
ALTER TABLE medical_records
    ADD CONSTRAINT fk_medical_records_facility
    FOREIGN KEY (healthcare_facility_id) REFERENCES healthcare_facilities (id);

CREATE UNIQUE INDEX uk_medical_records_blockchain_tx_hash ON medical_records (blockchain_tx_hash);
CREATE INDEX idx_medical_records_source_created ON medical_records (source_type, created_at);
