package com.blockchain.emr.doctor.infrastructure;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.doctor.domain.DoctorProfile;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {
    Optional<DoctorProfile> findByUserId(Long userId);
    boolean existsByUserIdAndVerifiedTrue(Long userId);
    boolean existsByLicenseNumber(String licenseNumber);
    boolean existsByLicenseNumberAndUserIdNot(String licenseNumber, Long userId);
}
