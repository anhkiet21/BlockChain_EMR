package com.blockchain.emr.accesscontrol;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmergencyAccessGrantRepository extends JpaRepository<EmergencyAccessGrant, Long> {
    boolean existsByPatientProfileIdAndFacilityIdAndEndedAtIsNullAndExpiresAtAfter(
            Long patientProfileId,
            Long facilityId,
            Instant now);

    Optional<EmergencyAccessGrant> findFirstByPatientProfileIdAndFacilityIdAndEndedAtIsNullAndExpiresAtAfterOrderByExpiresAtDesc(
            Long patientProfileId,
            Long facilityId,
            Instant now);

    @Query("""
            select grant
            from EmergencyAccessGrant grant
            where grant.patientProfile.id = :patientProfileId
              and grant.doctorProfile.user.id = :doctorUserId
              and grant.createdAt <= :occurredAt
              and grant.expiresAt >= :occurredAt
              and (grant.endedAt is null or grant.endedAt >= :occurredAt)
            order by grant.createdAt desc, grant.id desc
            """)
    List<EmergencyAccessGrant> findEmergencyContextForAudit(
            @Param("patientProfileId") Long patientProfileId,
            @Param("doctorUserId") Long doctorUserId,
            @Param("occurredAt") Instant occurredAt);

    Page<EmergencyAccessGrant> findByPatientProfileUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);
}
