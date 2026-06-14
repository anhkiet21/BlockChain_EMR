package com.blockchain.emr.doctor.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.blockchain.emr.doctor.domain.DoctorVerificationStatus;
import com.blockchain.emr.facility.api.dto.HealthcareFacilityResponse;
import com.blockchain.emr.patient.domain.Gender;

public record DoctorProfileResponse(
        Long id,
        Long userId,
        String doctorCode,
        String email,
        String identityNumberMasked,
        String fullName,
        String licenseNumber,
        String specialization,
        DepartmentResponse department,
        String phone,
        String biography,
        boolean verified,
        DoctorVerificationStatus verificationStatus,
        String rejectionReason,
        Instant reviewedAt,
        Long reviewedByAdminUserId,
        LocalDate dateOfBirth,
        Gender gender,
        HealthcareFacilityResponse facility,
        List<String> wallets,
        String accountStatus) {
}
