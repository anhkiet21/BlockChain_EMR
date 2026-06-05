package com.blockchain.emr.doctor.api.dto;

public record DoctorProfileResponse(
        Long id,
        Long userId,
        String doctorCode,
        String email,
        String fullName,
        String licenseNumber,
        String specialization,
        DepartmentResponse department,
        String phone,
        String biography,
        boolean verified) {
}

