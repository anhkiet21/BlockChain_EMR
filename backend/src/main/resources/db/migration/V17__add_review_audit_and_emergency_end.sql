ALTER TABLE doctor_profiles ADD COLUMN rejection_reason VARCHAR(1000) NULL;
ALTER TABLE doctor_profiles ADD COLUMN reviewed_at TIMESTAMP(6) NULL;
ALTER TABLE doctor_profiles ADD COLUMN reviewed_by_admin_user_id BIGINT NULL;

ALTER TABLE emergency_access_grants ADD COLUMN ended_by_user_id BIGINT NULL;
ALTER TABLE emergency_access_grants ADD COLUMN end_reason VARCHAR(500) NULL;

ALTER TABLE emergency_access_grants
    ADD CONSTRAINT fk_emergency_access_ended_by
        FOREIGN KEY (ended_by_user_id) REFERENCES users(id);

CREATE TABLE system_audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(60) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(30) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    target_name VARCHAR(200) NULL,
    reason VARCHAR(1000) NULL,
    previous_state VARCHAR(100) NULL,
    new_state VARCHAR(100) NULL,
    transaction_hash VARCHAR(66) NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE INDEX idx_system_audit_occurred
    ON system_audit_events (occurred_at, id);

CREATE INDEX idx_system_audit_target
    ON system_audit_events (target_type, target_id, occurred_at);
