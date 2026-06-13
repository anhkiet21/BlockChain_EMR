package com.blockchain.emr.doctor.api;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.doctor.api.dto.DepartmentRequest;
import com.blockchain.emr.doctor.api.dto.DepartmentResponse;
import com.blockchain.emr.doctor.api.dto.DepartmentUpdateRequest;
import com.blockchain.emr.doctor.application.DepartmentService;

@RestController
@RequestMapping("/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    ApiResponse<List<DepartmentResponse>> list() {
        return ApiResponse.success(departmentService.listActive());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<DepartmentResponse> create(@Valid @RequestBody DepartmentRequest request) {
        return ApiResponse.success(departmentService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<DepartmentResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody DepartmentUpdateRequest request) {
        return ApiResponse.success(departmentService.update(id, request));
    }
}
