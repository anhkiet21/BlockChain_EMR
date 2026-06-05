package com.blockchain.emr.medicalrecord.domain;

import java.time.Instant;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "medical_record_files")
@Getter
@NoArgsConstructor
public class MedicalRecordFile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "medical_record_id") private MedicalRecord medicalRecord;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "medical_file_id") private MedicalFile medicalFile;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    public MedicalRecordFile(MedicalRecord record, MedicalFile file) { medicalRecord = record; medicalFile = file; }
    @PrePersist void create() { createdAt = Instant.now(); }
}
