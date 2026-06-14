package com.blockchain.emr.facility.api;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.facility.api.dto.AdminHealthcareFacilityResponse;
import com.blockchain.emr.facility.api.dto.FacilityConsistencyResponse;
import com.blockchain.emr.facility.application.HealthcareFacilityService;

@RestController
@RequestMapping("/admin/facilities")
@PreAuthorize("hasRole('ADMIN')")
public class AdminHealthcareFacilityController {
    private final HealthcareFacilityService service;

    public AdminHealthcareFacilityController(HealthcareFacilityService service) {
        this.service = service;
    }

    @GetMapping
    ApiResponse<List<AdminHealthcareFacilityResponse>> list() {
        return ApiResponse.success(service.listForAdmin());
    }

    @GetMapping("/consistency")
    ApiResponse<List<FacilityConsistencyResponse>> consistency() {
        return ApiResponse.success(service.consistency());
    }
}
