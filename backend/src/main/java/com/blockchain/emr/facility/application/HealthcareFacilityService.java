package com.blockchain.emr.facility.application;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.facility.api.dto.HealthcareFacilityResponse;
import com.blockchain.emr.facility.domain.HealthcareFacility;
import com.blockchain.emr.facility.infrastructure.HealthcareFacilityRepository;

@Service
public class HealthcareFacilityService {

    private final HealthcareFacilityRepository facilityRepository;

    public HealthcareFacilityService(HealthcareFacilityRepository facilityRepository) {
        this.facilityRepository = facilityRepository;
    }

    @Transactional(readOnly = true)
    public List<HealthcareFacilityResponse> listActive() {
        return facilityRepository.findAllByActiveTrueOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public HealthcareFacility findByFacilityId(String facilityId) {
        return facilityRepository.findByFacilityIdIgnoreCase(facilityId.trim())
                .orElseThrow(() -> new ApplicationException(ErrorCode.INVALID_FACILITY));
    }

    @Transactional(readOnly = true)
    public HealthcareFacility findActiveByFacilityId(String facilityId) {
        HealthcareFacility facility = findByFacilityId(facilityId);
        if (!facility.isActive()) {
            throw new ApplicationException(ErrorCode.INVALID_FACILITY);
        }
        return facility;
    }

    public HealthcareFacilityResponse toResponse(HealthcareFacility facility) {
        return new HealthcareFacilityResponse(
                facility.getFacilityId(),
                facility.getName(),
                facility.getAddress(),
                facility.getDescription());
    }
}
