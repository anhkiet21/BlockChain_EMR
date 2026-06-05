package com.blockchain.emr.medicalrecord.infrastructure;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.blockchain.emr.medicalrecord.domain.MedicalRecordFile;

public interface MedicalRecordFileRepository extends JpaRepository<MedicalRecordFile, Long> {
    List<MedicalRecordFile> findAllByMedicalRecordId(Long recordId);
    Optional<MedicalRecordFile> findByMedicalRecordIdAndMedicalFileId(Long recordId, Long fileId);
}
