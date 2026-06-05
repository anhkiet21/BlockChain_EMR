package com.blockchain.emr.medicalrecord.infrastructure;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.medicalrecord.domain.MedicalFile;

public interface MedicalFileRepository extends JpaRepository<MedicalFile, Long> {
    Page<MedicalFile> findByPatientProfileUserId(Long userId, Pageable pageable);
}
