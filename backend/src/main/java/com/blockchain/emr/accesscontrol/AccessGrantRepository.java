package com.blockchain.emr.accesscontrol;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessGrantRepository extends JpaRepository<AccessGrant, Long> {
    boolean existsByPatientProfileIdAndDoctorProfileIdAndRevokedAtIsNull(Long patientId, Long doctorId);
    Optional<AccessGrant> findByPatientProfileIdAndDoctorProfileId(Long patientId, Long doctorId);
}
