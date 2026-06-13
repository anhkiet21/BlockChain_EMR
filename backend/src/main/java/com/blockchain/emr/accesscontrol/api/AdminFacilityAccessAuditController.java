package com.blockchain.emr.accesscontrol.api;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.accesscontrol.application.FacilityAccessService;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;

@RestController
@RequestMapping("/admin/audit/access")
@PreAuthorize("hasRole('ADMIN')")
public class AdminFacilityAccessAuditController {
    private final FacilityAccessService service;

    public AdminFacilityAccessAuditController(FacilityAccessService service) {
        this.service = service;
    }

    @GetMapping
    ApiResponse<PageResponse<AdminFacilityAccessAuditResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.adminAudit(page, size));
    }
}
