package com.blockchain.emr.facility.api.dto;

public record AdminHealthcareFacilityResponse(
        String facilityId,
        String name,
        String address,
        boolean active) {
}
