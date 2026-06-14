package com.blockchain.emr.facility.api.dto;

public record FacilityConsistencyResponse(
        String facilityId,
        String name,
        boolean databaseActive,
        Boolean blockchainActive,
        boolean synchronizedState,
        String status) {
}
