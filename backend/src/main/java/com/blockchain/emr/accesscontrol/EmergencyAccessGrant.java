package com.blockchain.emr.accesscontrol;

import java.time.Instant;

import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.facility.domain.HealthcareFacility;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.auth.domain.User;

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
@Table(name = "emergency_access_grants")
@Getter
@NoArgsConstructor
public class EmergencyAccessGrant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_profile_id", nullable = false)
    private PatientProfile patientProfile;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "healthcare_facility_id", nullable = false)
    private HealthcareFacility facility;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "doctor_profile_id", nullable = false)
    private DoctorProfile doctorProfile;

    @Column(name = "case_code", nullable = false, length = 80)
    private String caseCode;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ended_by_user_id")
    private User endedBy;

    @Column(name = "end_reason", length = 500)
    private String endReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public EmergencyAccessGrant(
            PatientProfile patientProfile,
            HealthcareFacility facility,
            DoctorProfile doctorProfile,
            String caseCode,
            String reason,
            Instant expiresAt) {
        this.patientProfile = patientProfile;
        this.facility = facility;
        this.doctorProfile = doctorProfile;
        this.caseCode = caseCode;
        this.reason = reason;
        this.expiresAt = expiresAt;
    }

    public boolean isActive(Instant now) {
        return endedAt == null && expiresAt.isAfter(now);
    }

    public void end(User actor, String reason, Instant now) {
        if (!isActive(now)) {
            throw new IllegalStateException("Emergency access is no longer active");
        }
        endedAt = now;
        endedBy = actor;
        endReason = reason;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
