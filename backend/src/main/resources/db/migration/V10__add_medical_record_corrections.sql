ALTER TABLE medical_records ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE medical_records ADD COLUMN previous_record_id BIGINT NULL;
ALTER TABLE medical_records ADD COLUMN successor_record_id BIGINT NULL;
ALTER TABLE medical_records ADD COLUMN correction_reason VARCHAR(500) NULL;
ALTER TABLE medical_records ADD COLUMN corrected_at TIMESTAMP NULL;
ALTER TABLE medical_records ADD COLUMN corrected_by_doctor_profile_id BIGINT NULL;

ALTER TABLE medical_records
    ADD CONSTRAINT fk_medical_records_previous FOREIGN KEY (previous_record_id) REFERENCES medical_records (id);

ALTER TABLE medical_records
    ADD CONSTRAINT fk_medical_records_successor FOREIGN KEY (successor_record_id) REFERENCES medical_records (id);

ALTER TABLE medical_records
    ADD CONSTRAINT fk_medical_records_corrected_by FOREIGN KEY (corrected_by_doctor_profile_id) REFERENCES doctor_profiles (id);

CREATE INDEX idx_medical_records_patient_status_created ON medical_records (patient_profile_id, status, created_at);
CREATE INDEX idx_medical_records_previous ON medical_records (previous_record_id);
