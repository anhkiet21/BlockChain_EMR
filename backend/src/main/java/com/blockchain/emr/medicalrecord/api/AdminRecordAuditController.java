package com.blockchain.emr.medicalrecord.api;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.medicalrecord.api.dto.UnifiedMedicalRecordResponse;
import com.blockchain.emr.medicalrecord.application.UnifiedMedicalRecordService;

@RestController
@RequestMapping("/admin/audit/records")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRecordAuditController {
    private final UnifiedMedicalRecordService service;

    public AdminRecordAuditController(UnifiedMedicalRecordService service) {
        this.service = service;
    }

    @GetMapping
    ApiResponse<PageResponse<UnifiedMedicalRecordResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.adminRecordAudit(page, size));
    }
}
