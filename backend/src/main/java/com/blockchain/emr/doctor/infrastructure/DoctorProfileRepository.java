package com.blockchain.emr.doctor.infrastructure;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.domain.DoctorVerificationStatus;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {
    Optional<DoctorProfile> findByUserId(Long userId);
    boolean existsByUserIdAndVerificationStatus(Long userId, DoctorVerificationStatus verificationStatus);
    boolean existsByLicenseNumber(String licenseNumber);
    boolean existsByLicenseNumberAndUserIdNot(String licenseNumber, Long userId);
    Page<DoctorProfile> findAllByVerificationStatus(
            DoctorVerificationStatus verificationStatus,
            Pageable pageable);
}
