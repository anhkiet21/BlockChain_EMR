package com.blockchain.emr.accesscontrol;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FacilityAccessGrantRepository extends JpaRepository<FacilityAccessGrant, Long> {
    Optional<FacilityAccessGrant> findByPatientProfileIdAndFacilityId(Long patientProfileId, Long facilityId);
    boolean existsByPatientProfileIdAndFacilityIdAndActiveTrue(Long patientProfileId, Long facilityId);
    List<FacilityAccessGrant> findByPatientProfileUserIdOrderByFacilityNameAsc(Long userId);
}

