package com.blockchain.emr.medicalrecord.domain;

import java.time.Instant;

import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.patient.domain.PatientProfile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "medical_files")
@Getter
@NoArgsConstructor
public class MedicalFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_profile_id", nullable = false)
    private PatientProfile patientProfile;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "uploaded_by_user_id", nullable = false)
    private User uploadedBy;

    @Column(nullable = false, unique = true, length = 255)
    private String cid;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "original_size", nullable = false)
    private long originalSize;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "encryption_iv", nullable = false, length = 32)
    private String encryptionIv;

    @Column(name = "encryption_algorithm", nullable = false, length = 30)
    private String encryptionAlgorithm;

    @Column(name = "storage_provider", nullable = false, length = 30)
    private String storageProvider;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public MedicalFile(
            PatientProfile patientProfile,
            User uploadedBy,
            String cid,
            String originalFilename,
            String contentType,
            long originalSize,
            String contentHash,
            String encryptionIv,
            String encryptionAlgorithm,
            String storageProvider) {
        this.patientProfile = patientProfile;
        this.uploadedBy = uploadedBy;
        this.cid = cid;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.originalSize = originalSize;
        this.contentHash = contentHash;
        this.encryptionIv = encryptionIv;
        this.encryptionAlgorithm = encryptionAlgorithm;
        this.storageProvider = storageProvider;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
