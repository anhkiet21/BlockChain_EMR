package com.blockchain.emr.medicalrecord.application;

import java.util.Locale;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.blockchain.emr.accesscontrol.AccessGrantRepository;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.patient.domain.PatientProfile;

@Service
public class MedicalRecordAuthorizationService {
    private final AccessGrantRepository grants;
    private final WalletAddressRepository wallets;
    private final BlockchainService blockchain;

    public MedicalRecordAuthorizationService(
            AccessGrantRepository grants, WalletAddressRepository wallets, BlockchainService blockchain) {
        this.grants = grants; this.wallets = wallets; this.blockchain = blockchain;
    }

    public void requireDoctorAccess(DoctorProfile doctor, PatientProfile patient, String patientWallet, String doctorWallet) {
        if (!doctor.isVerified()
                || !grants.existsByPatientProfileIdAndDoctorProfileIdAndRevokedAtIsNull(patient.getId(), doctor.getId())
                || !owned(patient.getUser().getId(), patientWallet)
                || !owned(doctor.getUser().getId(), doctorWallet)
                || !blockchain.hasAccess(normalize(patientWallet), normalize(doctorWallet))) {
            throw new AccessDeniedException("Medical record access denied");
        }
    }

    public void requirePatientWallet(PatientProfile patient, String wallet) {
        if (!owned(patient.getUser().getId(), wallet)) throw new AccessDeniedException("Patient wallet access denied");
    }

    private boolean owned(Long userId, String address) {
        return wallets.findByAddress(normalize(address)).map(WalletAddress::getUser)
                .map(user -> user.getId().equals(userId)).orElse(false);
    }
    private String normalize(String address) { return address == null ? "" : address.toLowerCase(Locale.ROOT); }
}
