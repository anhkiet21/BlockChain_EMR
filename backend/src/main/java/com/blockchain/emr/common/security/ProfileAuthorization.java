package com.blockchain.emr.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;

@Component("profileAuthorization")
public class ProfileAuthorization {

    private final DoctorProfileRepository doctorProfileRepository;

    public ProfileAuthorization(DoctorProfileRepository doctorProfileRepository) {
        this.doctorProfileRepository = doctorProfileRepository;
    }

    public boolean isVerifiedDoctor(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            return false;
        }
        return user.roles().contains("DOCTOR")
                && doctorProfileRepository.existsByUserIdAndVerifiedTrue(user.id());
    }
}

