package com.blockchain.emr.facility.infrastructure;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.facility.domain.HealthcareFacility;

public interface HealthcareFacilityRepository extends JpaRepository<HealthcareFacility, Long> {
    List<HealthcareFacility> findAllByActiveTrueOrderByNameAsc();
    Optional<HealthcareFacility> findByFacilityIdIgnoreCase(String facilityId);
}

