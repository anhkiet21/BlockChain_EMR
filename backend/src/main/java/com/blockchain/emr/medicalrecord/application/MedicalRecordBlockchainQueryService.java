package com.blockchain.emr.medicalrecord.application;

import java.math.BigInteger;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.accesscontrol.application.FacilityAccessService;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.common.exception.ResourceNotFoundException;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.medicalrecord.domain.MedicalRecord;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalRecordRepository;

@Service
public class MedicalRecordBlockchainQueryService {

    private final MedicalRecordRepository records;
    private final WalletAddressRepository wallets;
    private final FacilityAccessService access;
    private final BlockchainService blockchain;

    public MedicalRecordBlockchainQueryService(
            MedicalRecordRepository records,
            WalletAddressRepository wallets,
            FacilityAccessService access,
            BlockchainService blockchain) {
        this.records = records;
        this.wallets = wallets;
        this.access = access;
        this.blockchain = blockchain;
    }

    @Transactional(readOnly = true)
    public BlockchainService.OnChainRecord getBySystemRecordId(Long userId, boolean admin, Long recordId) {
        MedicalRecord record = records.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        return readAuthorized(userId, admin, record);
    }

    @Transactional(readOnly = true)
    public BlockchainService.OnChainRecord getByOnChainRecordId(
            Long userId,
            boolean admin,
            BigInteger onChainRecordId) {
        MedicalRecord record = records.findByOnChainRecordId(onChainRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        return readAuthorized(userId, admin, record);
    }

    private BlockchainService.OnChainRecord readAuthorized(Long userId, boolean admin, MedicalRecord record) {
        Long patientUserId = record.getPatientProfile().getUser().getId();
        boolean patientOwner = patientUserId.equals(userId);
        boolean doctorAllowed = !admin && !patientOwner
                && access.canDoctorReadPatient(userId, record.getPatientProfile().getId());
        if (!admin && !patientOwner && !doctorAllowed) {
            throw new AccessDeniedException("Medical record access denied");
        }

        String patientWallet = wallets.findFirstByUserIdOrderByIdAsc(patientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient wallet not found"))
                .getAddress();

        // eth_call does not sign or mutate state. The patient address is the contract
        // read context after backend object-level authorization has already succeeded.
        return blockchain.getRecord(record.getOnChainRecordId(), patientWallet);
    }
}
