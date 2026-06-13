package com.blockchain.emr.institution.infrastructure;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.institution.domain.InstitutionProfile;

public interface InstitutionProfileRepository extends JpaRepository<InstitutionProfile, Long> {
    Optional<InstitutionProfile> findByUserId(Long userId);
    boolean existsByLicenseNumber(String licenseNumber);
    boolean existsByLicenseNumberAndUserIdNot(String licenseNumber, Long userId);
}
