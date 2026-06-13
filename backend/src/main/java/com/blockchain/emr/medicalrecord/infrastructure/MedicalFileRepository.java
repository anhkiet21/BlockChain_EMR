package com.blockchain.emr.medicalrecord.infrastructure;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.blockchain.emr.medicalrecord.domain.MedicalFile;

public interface MedicalFileRepository extends JpaRepository<MedicalFile, Long> {
    Page<MedicalFile> findByPatientProfileUserId(Long userId, Pageable pageable);

    @Query("""
            select file from MedicalFile file
            where file.createdAt < :cutoff
              and not exists (
                select link.id from MedicalRecordFile link where link.medicalFile = file
              )
            order by file.createdAt asc
            """)
    List<MedicalFile> findOrphansCreatedBefore(@Param("cutoff") Instant cutoff, Pageable pageable);
}
