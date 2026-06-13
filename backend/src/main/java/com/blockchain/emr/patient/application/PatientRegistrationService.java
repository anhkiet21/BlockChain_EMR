package com.blockchain.emr.patient.application;

import java.time.LocalDate;

import org.springframework.stereotype.Service;

import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.patient.domain.Gender;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

@Service
public class PatientRegistrationService {

    private final PatientProfileRepository patientProfileRepository;

    public PatientRegistrationService(PatientProfileRepository patientProfileRepository) {
        this.patientProfileRepository = patientProfileRepository;
    }

    public void createInitialProfile(
            User user,
            LocalDate dateOfBirth,
            Gender gender,
            String phoneNumber,
            String address) {
        patientProfileRepository.save(new PatientProfile(
                user,
                dateOfBirth,
                gender,
                phoneNumber.trim(),
                address.trim()));
    }
}

