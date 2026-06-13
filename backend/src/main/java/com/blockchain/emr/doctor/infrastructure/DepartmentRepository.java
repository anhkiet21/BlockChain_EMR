package com.blockchain.emr.doctor.infrastructure;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.doctor.domain.Department;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    boolean existsByCodeIgnoreCase(String code);
    List<Department> findAllByActiveTrueOrderByNameAsc();
}

