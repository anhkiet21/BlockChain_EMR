CREATE TABLE departments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patient_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    patient_code VARCHAR(30) NOT NULL UNIQUE,
    date_of_birth DATE NULL,
    gender VARCHAR(20) NULL,
    phone VARCHAR(20) NULL,
    address VARCHAR(500) NULL,
    emergency_contact_name VARCHAR(150) NULL,
    emergency_contact_phone VARCHAR(20) NULL,
    blood_type VARCHAR(10) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_patient_profiles_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE doctor_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    doctor_code VARCHAR(30) NOT NULL UNIQUE,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    specialization VARCHAR(150) NOT NULL,
    department_id BIGINT NULL,
    phone VARCHAR(20) NULL,
    biography VARCHAR(1000) NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doctor_profiles_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_doctor_profiles_department FOREIGN KEY (department_id) REFERENCES departments (id)
);

CREATE INDEX idx_patient_profiles_phone ON patient_profiles (phone);
CREATE INDEX idx_doctor_profiles_department_id ON doctor_profiles (department_id);
CREATE INDEX idx_doctor_profiles_specialization ON doctor_profiles (specialization);

INSERT INTO departments (code, name, description) VALUES
('GENERAL', 'General Medicine', 'General examination and treatment'),
('CARDIOLOGY', 'Cardiology', 'Cardiovascular examination and treatment'),
('RADIOLOGY', 'Radiology', 'Medical imaging and diagnostic radiology');

