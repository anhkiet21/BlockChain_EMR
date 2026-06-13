package com.blockchain.emr.accesscontrol.domain;

import java.time.Instant;

import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.patient.domain.PatientProfile;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "emergency_access_records")
@Getter
@NoArgsConstructor
public class EmergencyAccessRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_profile_id")
    private PatientProfile patientProfile;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "doctor_profile_id")
    private DoctorProfile doctorProfile;

    @Column(name = "patient_wallet", nullable = false, length = 42)
    private String patientWallet;

    @Column(name = "doctor_wallet", nullable = false, length = 42)
    private String doctorWallet;

    @Column(nullable = false, length = 2000)
    private String reason;

    @Column(name = "reason_hash", nullable = false, length = 66)
    private String reasonHash;

    @Column(name = "transaction_hash", length = 66)
    private String transactionHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public EmergencyAccessRecord(PatientProfile patient, DoctorProfile doctor,
            String patientWallet, String doctorWallet, String reason, String reasonHash,
            String transactionHash, Instant expiresAt) {
        this.patientProfile = patient;
        this.doctorProfile = doctor;
        this.patientWallet = patientWallet;
        this.doctorWallet = doctorWallet;
        this.reason = reason;
        this.reasonHash = reasonHash;
        this.transactionHash = transactionHash;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
