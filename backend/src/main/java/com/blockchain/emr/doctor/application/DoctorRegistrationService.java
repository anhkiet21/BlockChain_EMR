package com.blockchain.emr.doctor.application;

import java.time.LocalDate;

import org.springframework.stereotype.Service;

import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.facility.domain.HealthcareFacility;
import com.blockchain.emr.patient.domain.Gender;

@Service
public class DoctorRegistrationService {

    private final DoctorProfileRepository doctorProfileRepository;

    public DoctorRegistrationService(DoctorProfileRepository doctorProfileRepository) {
        this.doctorProfileRepository = doctorProfileRepository;
    }

    public void createInitialProfile(
            User user,
            String licenseNumber,
            LocalDate dateOfBirth,
            Gender gender,
            String phoneNumber,
            HealthcareFacility facility) {
        String normalizedLicense = licenseNumber.trim();
        if (doctorProfileRepository.existsByLicenseNumber(normalizedLicense)) {
            throw new ApplicationException(ErrorCode.LICENSE_ALREADY_EXISTS);
        }
        doctorProfileRepository.save(new DoctorProfile(
                user,
                normalizedLicense,
                dateOfBirth,
                gender,
                phoneNumber.trim(),
                facility));
    }
}
