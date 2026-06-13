package com.blockchain.emr.accesscontrol;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FacilityAccessAuditRepository extends JpaRepository<FacilityAccessAudit, Long> {
    Page<FacilityAccessAudit> findAllByOrderByOccurredAtDescIdDesc(Pageable pageable);
}
