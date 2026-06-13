package com.blockchain.emr.accesscontrol;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FacilityAccessRequestRepository extends JpaRepository<FacilityAccessRequest, Long> {
    boolean existsByPatientProfileIdAndFacilityIdAndStatus(
            Long patientProfileId,
            Long facilityId,
            FacilityAccessRequestStatus status);
    Page<FacilityAccessRequest> findByPatientProfileUserId(Long userId, Pageable pageable);
}

