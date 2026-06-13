package com.blockchain.emr.accesscontrol.domain;

import java.time.Instant;

import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.patient.domain.PatientProfile;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "access_requests")
@Getter
@NoArgsConstructor
public class AccessRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_profile_id")
    private PatientProfile patientProfile;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "doctor_profile_id")
    private DoctorProfile doctorProfile;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Column(nullable = false, length = 30)
    private String status = "PENDING";

    @Column(name = "transaction_hash", length = 66)
    private String transactionHash;

    @Column(name = "rejected_reason", length = 500)
    private String rejectedReason;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public AccessRequest(PatientProfile patient, DoctorProfile doctor, String reason) {
        this.patientProfile = patient;
        this.doctorProfile = doctor;
        this.reason = reason;
    }

    public void approve(String transactionHash) {
        this.status = "APPROVED";
        this.transactionHash = transactionHash;
        this.respondedAt = Instant.now();
    }

    public void reject(String rejectedReason) {
        this.status = "REJECTED";
        this.rejectedReason = rejectedReason;
        this.respondedAt = Instant.now();
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
