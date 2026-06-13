package com.blockchain.emr.accesscontrol.infrastructure;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.accesscontrol.domain.EmergencyAccessRecord;

public interface EmergencyAccessRepository extends JpaRepository<EmergencyAccessRecord, Long> {
    Page<EmergencyAccessRecord> findByPatientProfileIdOrderByCreatedAtDesc(Long patientProfileId, Pageable pageable);
    Page<EmergencyAccessRecord> findByDoctorProfileIdOrderByCreatedAtDesc(Long doctorProfileId, Pageable pageable);
}
