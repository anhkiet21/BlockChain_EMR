package com.blockchain.emr.medicalrecord.infrastructure;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.blockchain.emr.medicalrecord.domain.MedicalRecord;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {
    Page<MedicalRecord> findByPatientProfileId(Long patientId, Pageable pageable);
    Optional<MedicalRecord> findByIdAndPatientProfileUserId(Long id, Long userId);
}
