package com.blockchain.emr.doctor.api.dto;

public record DepartmentResponse(
        Long id,
        String code,
        String name,
        String description,
        boolean active) {
}

