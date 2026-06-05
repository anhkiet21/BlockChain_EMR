package com.blockchain.emr.accesscontrol;

import java.time.Instant;

import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.patient.domain.PatientProfile;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "access_grants")
@Getter
@NoArgsConstructor
public class AccessGrant {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "patient_profile_id") private PatientProfile patientProfile;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "doctor_profile_id") private DoctorProfile doctorProfile;
    @Column(name = "granted_at", nullable = false) private Instant grantedAt;
    @Column(name = "revoked_at") private Instant revokedAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public AccessGrant(PatientProfile patient, DoctorProfile doctor) {
        patientProfile = patient; doctorProfile = doctor; grantedAt = Instant.now(); updatedAt = grantedAt;
    }
}
