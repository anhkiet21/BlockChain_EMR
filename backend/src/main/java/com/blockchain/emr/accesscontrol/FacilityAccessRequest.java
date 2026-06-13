package com.blockchain.emr.accesscontrol;

import java.time.Instant;

import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.facility.domain.HealthcareFacility;
import com.blockchain.emr.patient.domain.PatientProfile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "facility_access_requests")
@Getter
@NoArgsConstructor
public class FacilityAccessRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_profile_id", nullable = false)
    private PatientProfile patientProfile;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "healthcare_facility_id", nullable = false)
    private HealthcareFacility facility;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "requested_by_doctor_profile_id", nullable = false)
    private DoctorProfile requestedByDoctor;

    @Column(nullable = false, length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FacilityAccessRequestStatus status = FacilityAccessRequestStatus.PENDING;

    @Column(name = "blockchain_tx_hash", unique = true, length = 66)
    private String blockchainTxHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    public FacilityAccessRequest(
            PatientProfile patientProfile,
            HealthcareFacility facility,
            DoctorProfile requestedByDoctor,
            String reason) {
        this.patientProfile = patientProfile;
        this.facility = facility;
        this.requestedByDoctor = requestedByDoctor;
        this.reason = reason.trim();
    }

    public void approve(String transactionHash) {
        requirePending();
        status = FacilityAccessRequestStatus.APPROVED;
        blockchainTxHash = transactionHash;
        respondedAt = Instant.now();
    }

    public void reject() {
        requirePending();
        status = FacilityAccessRequestStatus.REJECTED;
        respondedAt = Instant.now();
    }

    private void requirePending() {
        if (status != FacilityAccessRequestStatus.PENDING) {
            throw new IllegalStateException("Access request is no longer pending");
        }
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}

