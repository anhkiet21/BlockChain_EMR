CREATE TABLE emergency_access_grants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    healthcare_facility_id BIGINT NOT NULL,
    doctor_profile_id BIGINT NOT NULL,
    case_code VARCHAR(80) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    ended_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_emergency_access_patient
        FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id),
    CONSTRAINT fk_emergency_access_facility
        FOREIGN KEY (healthcare_facility_id) REFERENCES healthcare_facilities(id),
    CONSTRAINT fk_emergency_access_doctor
        FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles(id)
);

CREATE INDEX idx_emergency_access_active
    ON emergency_access_grants (patient_profile_id, healthcare_facility_id, ended_at, expires_at);

CREATE INDEX idx_emergency_access_patient_created
    ON emergency_access_grants (patient_profile_id, created_at, id);

CREATE INDEX idx_emergency_access_doctor_created
    ON emergency_access_grants (doctor_profile_id, created_at, id);
