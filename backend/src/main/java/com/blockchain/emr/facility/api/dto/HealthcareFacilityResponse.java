package com.blockchain.emr.facility.api.dto;

public record HealthcareFacilityResponse(
        String facilityId,
        String name,
        String address,
        String description) {
}

