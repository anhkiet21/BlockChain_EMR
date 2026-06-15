package com.blockchain.emr.medicalrecord.infrastructure;

import java.math.BigInteger;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.blockchain.emr.medicalrecord.domain.MedicalRecord;
import jakarta.persistence.LockModeType;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {
    Page<MedicalRecord> findByPatientProfileId(Long patientId, Pageable pageable);
    Optional<MedicalRecord> findByIdAndPatientProfileUserId(Long id, Long userId);
    Optional<MedicalRecord> findByOnChainRecordId(BigInteger onChainRecordId);
    Page<MedicalRecord> findByPatientProfileUserId(Long userId, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select record from MedicalRecord record where record.id = :id")
    Optional<MedicalRecord> findLockedById(Long id);
}
