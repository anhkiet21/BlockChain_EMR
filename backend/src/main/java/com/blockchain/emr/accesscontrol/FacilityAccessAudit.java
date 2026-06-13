package com.blockchain.emr.accesscontrol;

import java.time.Instant;

import com.blockchain.emr.facility.domain.HealthcareFacility;
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
@Table(name = "facility_access_audit")
@Getter
@NoArgsConstructor
public class FacilityAccessAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_profile_id", nullable = false)
    private PatientProfile patientProfile;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "healthcare_facility_id", nullable = false)
    private HealthcareFacility facility;

    @Column(name = "patient_wallet", nullable = false, length = 42)
    private String patientWallet;

    @Column(nullable = false)
    private boolean granted;

    @Column(name = "blockchain_tx_hash", nullable = false, unique = true, length = 66)
    private String blockchainTxHash;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    public FacilityAccessAudit(
            PatientProfile patientProfile,
            HealthcareFacility facility,
            String patientWallet,
            boolean granted,
            String blockchainTxHash) {
        this.patientProfile = patientProfile;
        this.facility = facility;
        this.patientWallet = patientWallet;
        this.granted = granted;
        this.blockchainTxHash = blockchainTxHash;
    }

    @PrePersist
    void onCreate() {
        occurredAt = Instant.now();
    }
}
