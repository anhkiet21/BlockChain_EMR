ALTER TABLE users ADD COLUMN identity_number VARCHAR(50) NULL;
ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL;
CREATE UNIQUE INDEX uk_users_identity_number ON users (identity_number);

CREATE TABLE healthcare_facilities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    facility_id VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(500) NOT NULL,
    description VARCHAR(1000) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO healthcare_facilities (facility_id, name, address, description) VALUES
('BV001', 'Benh vien Cho Ray', '201B Nguyen Chi Thanh, Phuong Cho Lon, TP. Ho Chi Minh', 'Benh vien da khoa tuyen trung uong'),
('BV002', 'Benh vien Bach Mai', '78 Giai Phong, Phuong Bach Mai, Ha Noi', 'Benh vien da khoa tuyen trung uong'),
('PK001', 'Phong kham Da khoa Trung tam', '1 Nguyen Hue, Phuong Sai Gon, TP. Ho Chi Minh', 'Co so kham chua benh da khoa');

ALTER TABLE doctor_profiles ADD COLUMN healthcare_facility_id BIGINT NULL;
ALTER TABLE doctor_profiles ADD COLUMN date_of_birth DATE NULL;
ALTER TABLE doctor_profiles ADD COLUMN gender VARCHAR(20) NULL;
ALTER TABLE doctor_profiles ADD COLUMN verification_status VARCHAR(30) NULL;
ALTER TABLE doctor_profiles MODIFY COLUMN specialization VARCHAR(150) NULL;

UPDATE doctor_profiles
SET verification_status = CASE
    WHEN verified = TRUE THEN 'VERIFIED'
    ELSE 'PENDING_VERIFICATION'
END;

ALTER TABLE doctor_profiles MODIFY COLUMN verification_status VARCHAR(30) NOT NULL;
ALTER TABLE doctor_profiles
    ADD CONSTRAINT fk_doctor_profiles_healthcare_facility
    FOREIGN KEY (healthcare_facility_id) REFERENCES healthcare_facilities (id);

CREATE INDEX idx_doctor_profiles_facility ON doctor_profiles (healthcare_facility_id);
CREATE INDEX idx_doctor_profiles_verification_status ON doctor_profiles (verification_status);

