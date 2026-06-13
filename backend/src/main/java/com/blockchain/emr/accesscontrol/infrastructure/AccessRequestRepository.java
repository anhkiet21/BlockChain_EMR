package com.blockchain.emr.accesscontrol.infrastructure;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.accesscontrol.domain.AccessRequest;

public interface AccessRequestRepository extends JpaRepository<AccessRequest, Long> {
    Page<AccessRequest> findByPatientProfileIdOrderByCreatedAtDesc(Long patientProfileId, Pageable pageable);
    Page<AccessRequest> findByDoctorProfileIdOrderByCreatedAtDesc(Long doctorProfileId, Pageable pageable);
    Optional<AccessRequest> findByPatientProfileIdAndDoctorProfileIdAndStatus(
            Long patientProfileId, Long doctorProfileId, String status);
}
