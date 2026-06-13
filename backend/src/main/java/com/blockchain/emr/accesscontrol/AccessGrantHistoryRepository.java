package com.blockchain.emr.accesscontrol;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessGrantHistoryRepository extends JpaRepository<AccessGrantHistory, Long> {
    Optional<AccessGrantHistory> findByTransactionHash(String transactionHash);
    Optional<AccessGrantHistory> findFirstByPatientProfileIdAndDoctorProfileIdOrderByBlockNumberDescLogIndexDesc(
            Long patientId, Long doctorId);
    Page<AccessGrantHistory> findByPatientProfileUserId(Long userId, Pageable pageable);
}
