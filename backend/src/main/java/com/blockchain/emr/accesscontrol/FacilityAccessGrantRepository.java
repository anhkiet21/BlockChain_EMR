package com.blockchain.emr.accesscontrol;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FacilityAccessGrantRepository extends JpaRepository<FacilityAccessGrant, Long> {
    Optional<FacilityAccessGrant> findByPatientProfileIdAndFacilityId(Long patientProfileId, Long facilityId);
    boolean existsByPatientProfileIdAndFacilityIdAndActiveTrue(Long patientProfileId, Long facilityId);
    List<FacilityAccessGrant> findByPatientProfileUserIdOrderByFacilityNameAsc(Long userId);

    @Query(
            value = """
                    select grant from FacilityAccessGrant grant
                    join fetch grant.patientProfile patient
                    join fetch patient.user
                    where grant.facility.id = :facilityId
                      and grant.active = true
                    order by lower(patient.user.fullName), patient.patientCode
                    """,
            countQuery = """
                    select count(grant) from FacilityAccessGrant grant
                    where grant.facility.id = :facilityId
                      and grant.active = true
                    """)
    Page<FacilityAccessGrant> findActivePatientsByFacilityId(
            @Param("facilityId") Long facilityId,
            Pageable pageable);
}

