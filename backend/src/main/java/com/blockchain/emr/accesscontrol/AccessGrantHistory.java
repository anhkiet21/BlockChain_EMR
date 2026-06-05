package com.blockchain.emr.accesscontrol;

import java.math.BigInteger;
import java.time.Instant;

import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.patient.domain.PatientProfile;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "access_grant_history")
@Getter
@NoArgsConstructor
public class AccessGrantHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "patient_profile_id") private PatientProfile patientProfile;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "doctor_profile_id") private DoctorProfile doctorProfile;
    @Column(name = "patient_wallet", nullable = false, length = 42) private String patientWallet;
    @Column(name = "doctor_wallet", nullable = false, length = 42) private String doctorWallet;
    @Column(nullable = false) private boolean granted;
    @Column(name = "transaction_hash", nullable = false, unique = true, length = 66) private String transactionHash;
    @Column(name = "block_number", nullable = false, precision = 65) private BigInteger blockNumber;
    @Column(name = "log_index", nullable = false) private long logIndex;
    @Column(name = "occurred_at", nullable = false) private Instant occurredAt;
    @Column(name = "verified_at", nullable = false) private Instant verifiedAt;

    public AccessGrantHistory(PatientProfile patient, DoctorProfile doctor, String patientWallet, String doctorWallet,
            boolean granted, String transactionHash, BigInteger blockNumber, Instant occurredAt) {
        this.patientProfile = patient;
        this.doctorProfile = doctor;
        this.patientWallet = patientWallet;
        this.doctorWallet = doctorWallet;
        this.granted = granted;
        this.transactionHash = transactionHash;
        this.blockNumber = blockNumber;
        this.logIndex = 0;
        this.occurredAt = occurredAt;
        this.verifiedAt = Instant.now();
    }

    public AccessGrantHistory(PatientProfile patient, DoctorProfile doctor, String patientWallet, String doctorWallet,
            boolean granted, String transactionHash, BigInteger blockNumber, long logIndex, Instant occurredAt) {
        this(patient, doctor, patientWallet, doctorWallet, granted, transactionHash, blockNumber, occurredAt);
        this.logIndex = logIndex;
    }
}
