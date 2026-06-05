package com.blockchain.emr.medicalrecord.domain;

import java.math.BigInteger;
import java.time.Instant;

import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.patient.domain.PatientProfile;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "medical_records")
@Getter
@NoArgsConstructor
public class MedicalRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "patient_profile_id") private PatientProfile patientProfile;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "author_doctor_profile_id") private DoctorProfile authorDoctorProfile;
    @Column(nullable = false, length = 200) private String title;
    @Column(name = "record_type", nullable = false, length = 30) private String recordType;
    @Column(nullable = false, unique = true, length = 255) private String cid;
    @Column(name = "content_hash", nullable = false, length = 128) private String contentHash;
    @Column(name = "on_chain_record_id", unique = true, precision = 65) private BigInteger onChainRecordId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public MedicalRecord(PatientProfile patient, DoctorProfile doctor, String title, String type,
            String cid, String contentHash, BigInteger onChainRecordId) {
        patientProfile = patient; authorDoctorProfile = doctor; this.title = title; recordType = type;
        this.cid = cid; this.contentHash = contentHash; this.onChainRecordId = onChainRecordId;
    }

    @PrePersist void create() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void update() { updatedAt = Instant.now(); }
}
