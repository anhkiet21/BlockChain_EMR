package com.blockchain.emr.audit;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "system_audit_events")
@Getter
@NoArgsConstructor
public class SystemAuditEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String action;

    @Column(name = "actor_user_id", nullable = false)
    private Long actorUserId;

    @Column(name = "actor_name", nullable = false, length = 150)
    private String actorName;

    @Column(name = "actor_role", nullable = false, length = 30)
    private String actorRole;

    @Column(name = "target_type", nullable = false, length = 60)
    private String targetType;

    @Column(name = "target_id", nullable = false, length = 100)
    private String targetId;

    @Column(name = "target_name", length = 200)
    private String targetName;

    @Column(length = 1000)
    private String reason;

    @Column(name = "previous_state", length = 100)
    private String previousState;

    @Column(name = "new_state", length = 100)
    private String newState;

    @Column(name = "transaction_hash", length = 66)
    private String transactionHash;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    public SystemAuditEvent(
            String action,
            Long actorUserId,
            String actorName,
            String actorRole,
            String targetType,
            String targetId,
            String targetName,
            String reason,
            String previousState,
            String newState,
            String transactionHash) {
        this.action = action;
        this.actorUserId = actorUserId;
        this.actorName = actorName;
        this.actorRole = actorRole;
        this.targetType = targetType;
        this.targetId = targetId;
        this.targetName = targetName;
        this.reason = reason;
        this.previousState = previousState;
        this.newState = newState;
        this.transactionHash = transactionHash;
    }

    @PrePersist
    void onCreate() {
        occurredAt = Instant.now();
    }
}
