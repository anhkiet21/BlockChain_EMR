package com.blockchain.emr.doctor.domain;

import java.time.Instant;
import java.time.LocalDate;

import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.facility.domain.HealthcareFacility;
import com.blockchain.emr.patient.domain.Gender;

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
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "doctor_profiles")
@Getter
@NoArgsConstructor
public class DoctorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "doctor_code", nullable = false, unique = true, length = 30)
    private String doctorCode;

    @Column(name = "license_number", nullable = false, unique = true, length = 100)
    private String licenseNumber;

    @Column(length = 150)
    private String specialization;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Gender gender;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "healthcare_facility_id")
    private HealthcareFacility healthcareFacility;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(length = 20)
    private String phone;

    @Column(length = 1000)
    private String biography;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 30)
    private DoctorVerificationStatus verificationStatus = DoctorVerificationStatus.PENDING_VERIFICATION;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by_admin_user_id")
    private Long reviewedByAdminUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public DoctorProfile(User user, String licenseNumber, String specialization) {
        this.user = user;
        this.doctorCode = "DOC-%08d".formatted(user.getId());
        this.licenseNumber = licenseNumber;
        this.specialization = specialization;
    }

    public DoctorProfile(
            User user,
            String licenseNumber,
            LocalDate dateOfBirth,
            Gender gender,
            String phone,
            HealthcareFacility healthcareFacility) {
        this.user = user;
        this.doctorCode = "DOC-%08d".formatted(user.getId());
        this.licenseNumber = licenseNumber;
        this.dateOfBirth = dateOfBirth;
        this.gender = gender;
        this.phone = phone;
        this.healthcareFacility = healthcareFacility;
        this.verificationStatus = DoctorVerificationStatus.PENDING_VERIFICATION;
    }

    public void update(
            String licenseNumber,
            String specialization,
            Department department,
            String phone,
            String biography) {
        this.licenseNumber = licenseNumber;
        this.specialization = specialization;
        this.department = department;
        this.phone = phone;
        this.biography = biography;
    }

    public void setVerified(boolean verified) {
        verificationStatus = verified
                ? DoctorVerificationStatus.VERIFIED
                : DoctorVerificationStatus.REJECTED;
    }

    public void verify(Long adminUserId) {
        requirePendingReview();
        verificationStatus = DoctorVerificationStatus.VERIFIED;
        rejectionReason = null;
        reviewedByAdminUserId = adminUserId;
        reviewedAt = Instant.now();
    }

    public void reject(Long adminUserId, String reason) {
        requirePendingReview();
        verificationStatus = DoctorVerificationStatus.REJECTED;
        rejectionReason = reason;
        reviewedByAdminUserId = adminUserId;
        reviewedAt = Instant.now();
    }

    public void resubmit() {
        if (verificationStatus != DoctorVerificationStatus.REJECTED) {
            throw new IllegalStateException("Only a rejected doctor profile can be resubmitted");
        }
        verificationStatus = DoctorVerificationStatus.PENDING_VERIFICATION;
        rejectionReason = null;
        reviewedByAdminUserId = null;
        reviewedAt = null;
    }

    public boolean isVerified() {
        return verificationStatus == DoctorVerificationStatus.VERIFIED;
    }

    private void requirePendingReview() {
        if (verificationStatus != DoctorVerificationStatus.PENDING_VERIFICATION) {
            throw new IllegalStateException("Doctor profile is not pending verification");
        }
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
