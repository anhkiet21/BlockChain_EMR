package com.blockchain.emr.medicalrecord.domain;

import java.time.Instant;
import com.blockchain.emr.auth.domain.User;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;

import lombok.Getter;

@Entity
@Table(name = "record_access_logs")
@Getter
@NoArgsConstructor
public class RecordAccessLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "medical_record_id") private MedicalRecord medicalRecord;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "medical_file_id") private MedicalFile medicalFile;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "actor_user_id") private User actor;
    @Column(nullable = false, length = 30) private String action;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    public RecordAccessLog(MedicalRecord record, MedicalFile file, User actor, String action) {
        medicalRecord = record; medicalFile = file; this.actor = actor; this.action = action;
    }
    @PrePersist void create() { createdAt = Instant.now(); }
}

