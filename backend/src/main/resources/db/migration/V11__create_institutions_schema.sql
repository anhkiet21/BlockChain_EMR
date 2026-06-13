-- Institution Role
INSERT INTO roles (name) VALUES ('INSTITUTION');

CREATE TABLE institution_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    institution_code VARCHAR(30) NOT NULL UNIQUE,
    institution_name VARCHAR(200) NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    address VARCHAR(500),
    phone VARCHAR(20),
    website VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_institution_profiles_user FOREIGN KEY (user_id) REFERENCES users (id)
);

ALTER TABLE doctor_profiles ADD COLUMN institution_profile_id BIGINT NULL;
ALTER TABLE doctor_profiles ADD COLUMN institution_status VARCHAR(30) NULL;
ALTER TABLE doctor_profiles ADD CONSTRAINT fk_doctor_institution FOREIGN KEY (institution_profile_id) REFERENCES institution_profiles (id);

CREATE INDEX idx_institution_profiles_user ON institution_profiles (user_id);
CREATE INDEX idx_doctor_institution ON doctor_profiles (institution_profile_id);

