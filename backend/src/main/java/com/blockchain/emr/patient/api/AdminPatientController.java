package com.blockchain.emr.patient.api;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.patient.api.dto.AdminPatientSummaryResponse;
import com.blockchain.emr.patient.application.PatientProfileService;

@RestController
@RequestMapping("/admin/patients")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPatientController {
    private final PatientProfileService service;

    public AdminPatientController(PatientProfileService service) {
        this.service = service;
    }

    @GetMapping
    ApiResponse<PageResponse<AdminPatientSummaryResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.listForAdmin(page, size));
    }
}
