package com.blockchain.emr.common.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.common.api.ApiResponse;

@RestController
public class HealthController {

    @GetMapping("/health")
    ApiResponse<HealthStatus> health() {
        return ApiResponse.success(new HealthStatus("UP"));
    }

    record HealthStatus(String status) {
    }
}
