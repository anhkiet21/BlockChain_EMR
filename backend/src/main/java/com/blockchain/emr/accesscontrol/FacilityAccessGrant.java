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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "facility_access_grants")
@Getter
@NoArgsConstructor
public class FacilityAccessGrant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_profile_id", nullable = false)
    private PatientProfile patientProfile;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "healthcare_facility_id", nullable = false)
    private HealthcareFacility facility;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "blockchain_tx_hash", nullable = false, unique = true, length = 66)
    private String blockchainTxHash;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public FacilityAccessGrant(
            PatientProfile patientProfile,
            HealthcareFacility facility,
            boolean active,
            String transactionHash) {
        this.patientProfile = patientProfile;
        this.facility = facility;
        update(active, transactionHash);
    }

    public void update(boolean active, String transactionHash) {
        this.active = active;
        this.blockchainTxHash = transactionHash;
        this.updatedAt = Instant.now();
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }
}

