package com.blockchain.emr.facility.api;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.facility.api.dto.HealthcareFacilityResponse;
import com.blockchain.emr.facility.application.HealthcareFacilityService;

@RestController
@RequestMapping("/facilities")
public class HealthcareFacilityController {

    private final HealthcareFacilityService facilityService;

    public HealthcareFacilityController(HealthcareFacilityService facilityService) {
        this.facilityService = facilityService;
    }

    @GetMapping
    ApiResponse<List<HealthcareFacilityResponse>> listActive() {
        return ApiResponse.success(facilityService.listActive());
    }
}
