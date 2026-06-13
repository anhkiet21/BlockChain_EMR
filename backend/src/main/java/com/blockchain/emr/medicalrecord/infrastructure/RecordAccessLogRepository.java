package com.blockchain.emr.medicalrecord.infrastructure;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import com.blockchain.emr.medicalrecord.domain.RecordAccessLog;

public interface RecordAccessLogRepository extends JpaRepository<RecordAccessLog, Long> {
    long countByMedicalRecordIdAndAction(Long recordId, String action);
    List<RecordAccessLog> findAllByMedicalRecordIdOrderByCreatedAtDescIdDesc(Long recordId);
}
