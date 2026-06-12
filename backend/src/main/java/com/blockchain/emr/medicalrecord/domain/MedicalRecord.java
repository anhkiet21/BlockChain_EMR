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
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private MedicalRecordStatus status = MedicalRecordStatus.ACTIVE;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "previous_record_id") private MedicalRecord previousRecord;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "successor_record_id") private MedicalRecord successorRecord;
    @Column(name = "correction_reason", length = 500) private String correctionReason;
    @Column(name = "corrected_at") private Instant correctedAt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "corrected_by_doctor_profile_id") private DoctorProfile correctedByDoctorProfile;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public MedicalRecord(PatientProfile patient, DoctorProfile doctor, String title, String type,
            String cid, String contentHash, BigInteger onChainRecordId) {
        patientProfile = patient; authorDoctorProfile = doctor; this.title = title; recordType = type;
        this.cid = cid; this.contentHash = contentHash; this.onChainRecordId = onChainRecordId;
    }

    public void markCorrectedBy(MedicalRecord successor, DoctorProfile doctor, String reason) {
        status = MedicalRecordStatus.CORRECTED;
        successorRecord = successor;
        correctedByDoctorProfile = doctor;
        correctionReason = reason;
        correctedAt = Instant.now();
    }

    public void linkToPrevious(MedicalRecord previous, String reason) {
        previousRecord = previous;
        correctionReason = reason;
    }

    @PrePersist void create() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void update() { updatedAt = Instant.now(); }
}
