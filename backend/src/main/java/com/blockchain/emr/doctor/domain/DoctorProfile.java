package com.blockchain.emr.doctor.domain;

import java.time.Instant;

import com.blockchain.emr.auth.domain.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    @Column(nullable = false, length = 150)
    private String specialization;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(length = 20)
    private String phone;

    @Column(length = 1000)
    private String biography;

    @Column(nullable = false)
    private boolean verified;

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
        this.verified = verified;
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

