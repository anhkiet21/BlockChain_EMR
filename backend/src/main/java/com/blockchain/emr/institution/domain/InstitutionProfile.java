package com.blockchain.emr.institution.domain;

import java.time.Instant;

import com.blockchain.emr.auth.domain.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "institution_profiles")
@Getter
@NoArgsConstructor
public class InstitutionProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "institution_code", nullable = false, unique = true, length = 30)
    private String institutionCode;

    @Column(name = "institution_name", nullable = false, length = 200)
    private String institutionName;

    @Column(name = "license_number", nullable = false, unique = true, length = 100)
    private String licenseNumber;

    @Column(length = 500)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String website;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public InstitutionProfile(User user, String institutionName, String licenseNumber) {
        this.user = user;
        this.institutionCode = "INS-%08d".formatted(user.getId());
        this.institutionName = institutionName;
        this.licenseNumber = licenseNumber;
    }

    public void update(String institutionName, String licenseNumber, String address, String phone, String website) {
        this.institutionName = institutionName;
        this.licenseNumber = licenseNumber;
        this.address = address;
        this.phone = phone;
        this.website = website;
    }

    public void setActive(boolean active) {
        this.active = active;
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
