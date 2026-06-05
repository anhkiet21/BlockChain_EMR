package com.blockchain.emr.accesscontrol;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessGrantRepository extends JpaRepository<AccessGrant, Long> {
    boolean existsByPatientProfileIdAndDoctorProfileIdAndRevokedAtIsNull(Long patientId, Long doctorId);
}
