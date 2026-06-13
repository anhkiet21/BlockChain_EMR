package com.blockchain.emr.patient.infrastructure;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.blockchain.emr.patient.domain.PatientProfile;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {

    Optional<PatientProfile> findByUserId(Long userId);

    @Query("""
            select profile from PatientProfile profile
            where :query = ''
               or lower(profile.patientCode) like lower(concat(:query, '%'))
               or lower(profile.user.fullName) like lower(concat(:query, '%'))
               or lower(profile.user.email) like lower(concat(:query, '%'))
               or lower(coalesce(profile.phone, '')) like lower(concat(:query, '%'))
            """)
    Page<PatientProfile> search(@Param("query") String query, Pageable pageable);
}
