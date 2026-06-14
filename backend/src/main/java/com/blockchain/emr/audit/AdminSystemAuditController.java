package com.blockchain.emr.audit;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;

@RestController
@RequestMapping("/admin/audit/system")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSystemAuditController {
    private final SystemAuditService service;

    public AdminSystemAuditController(SystemAuditService service) {
        this.service = service;
    }

    @GetMapping
    ApiResponse<PageResponse<SystemAuditEventResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.list(page, size));
    }
}
