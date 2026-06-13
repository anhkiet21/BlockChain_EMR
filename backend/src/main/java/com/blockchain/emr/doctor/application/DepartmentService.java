package com.blockchain.emr.doctor.application;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.prepost.PreAuthorize;

import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;
import com.blockchain.emr.doctor.api.dto.DepartmentRequest;
import com.blockchain.emr.doctor.api.dto.DepartmentResponse;
import com.blockchain.emr.doctor.api.dto.DepartmentUpdateRequest;
import com.blockchain.emr.doctor.domain.Department;
import com.blockchain.emr.doctor.infrastructure.DepartmentRepository;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public List<DepartmentResponse> listActive() {
        return departmentRepository.findAllByActiveTrueOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public DepartmentResponse create(DepartmentRequest request) {
        if (departmentRepository.existsByCodeIgnoreCase(request.code())) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Department code already exists");
        }
        return toResponse(departmentRepository.save(
                new Department(request.code(), request.name(), request.description())));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public DepartmentResponse update(Long id, DepartmentUpdateRequest request) {
        Department department = findEntity(id);
        department.update(request.name(), request.description(), request.active());
        return toResponse(department);
    }

    @Transactional(readOnly = true)
    public Department findEntity(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
    }

    public DepartmentResponse toResponse(Department department) {
        return new DepartmentResponse(
                department.getId(),
                department.getCode(),
                department.getName(),
                department.getDescription(),
                department.isActive());
    }
}
