package com.blockchain.emr.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.blockchain.emr.accesscontrol.application.FacilityAccessService;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.medicalrecord.application.MedicalRecordBlockchainQueryService;
import com.blockchain.emr.medicalrecord.domain.MedicalRecord;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalRecordRepository;
import com.blockchain.emr.patient.domain.PatientProfile;

@ExtendWith(MockitoExtension.class)
class MedicalRecordBlockchainQueryServiceTests {

    private static final long RECORD_ID = 31L;
    private static final long PATIENT_PROFILE_ID = 41L;
    private static final long PATIENT_USER_ID = 51L;
    private static final long DOCTOR_USER_ID = 61L;
    private static final BigInteger ON_CHAIN_RECORD_ID = BigInteger.valueOf(7);
    private static final String PATIENT_WALLET = "0x1111111111111111111111111111111111111111";

    @Mock private MedicalRecordRepository records;
    @Mock private WalletAddressRepository wallets;
    @Mock private FacilityAccessService access;
    @Mock private BlockchainService blockchain;
    @Mock private MedicalRecord record;
    @Mock private PatientProfile patient;
    @Mock private User patientUser;
    @Mock private WalletAddress patientWallet;

    private MedicalRecordBlockchainQueryService service;

    @BeforeEach
    void setUp() {
        service = new MedicalRecordBlockchainQueryService(records, wallets, access, blockchain);
        when(record.getPatientProfile()).thenReturn(patient);
        when(patient.getUser()).thenReturn(patientUser);
        when(patientUser.getId()).thenReturn(PATIENT_USER_ID);
    }

    @Test
    void patientReadsOwnedRecordBySystemIdWithoutSupplyingWallet() {
        var expected = onChainRecord();
        when(records.findById(RECORD_ID)).thenReturn(Optional.of(record));
        when(record.getOnChainRecordId()).thenReturn(ON_CHAIN_RECORD_ID);
        when(wallets.findFirstByUserIdOrderByIdAsc(PATIENT_USER_ID)).thenReturn(Optional.of(patientWallet));
        when(patientWallet.getAddress()).thenReturn(PATIENT_WALLET);
        when(blockchain.getRecord(ON_CHAIN_RECORD_ID, PATIENT_WALLET)).thenReturn(expected);

        assertThat(service.getBySystemRecordId(PATIENT_USER_ID, false, RECORD_ID)).isSameAs(expected);
        verify(access, never()).canDoctorReadPatient(PATIENT_USER_ID, PATIENT_PROFILE_ID);
    }

    @Test
    void authorizedDoctorReadsRecordByOnChainId() {
        var expected = onChainRecord();
        when(records.findByOnChainRecordId(ON_CHAIN_RECORD_ID)).thenReturn(Optional.of(record));
        when(record.getOnChainRecordId()).thenReturn(ON_CHAIN_RECORD_ID);
        when(patient.getId()).thenReturn(PATIENT_PROFILE_ID);
        when(access.canDoctorReadPatient(DOCTOR_USER_ID, PATIENT_PROFILE_ID)).thenReturn(true);
        when(wallets.findFirstByUserIdOrderByIdAsc(PATIENT_USER_ID)).thenReturn(Optional.of(patientWallet));
        when(patientWallet.getAddress()).thenReturn(PATIENT_WALLET);
        when(blockchain.getRecord(ON_CHAIN_RECORD_ID, PATIENT_WALLET)).thenReturn(expected);

        assertThat(service.getByOnChainRecordId(DOCTOR_USER_ID, false, ON_CHAIN_RECORD_ID)).isSameAs(expected);
    }

    @Test
    void unrelatedUserCannotUseKnownRecordIdentifier() {
        when(records.findByOnChainRecordId(ON_CHAIN_RECORD_ID)).thenReturn(Optional.of(record));
        when(patient.getId()).thenReturn(PATIENT_PROFILE_ID);
        when(access.canDoctorReadPatient(99L, PATIENT_PROFILE_ID)).thenReturn(false);

        assertThatThrownBy(() -> service.getByOnChainRecordId(99L, false, ON_CHAIN_RECORD_ID))
                .isInstanceOf(AccessDeniedException.class);
        verify(blockchain, never()).getRecord(ON_CHAIN_RECORD_ID, PATIENT_WALLET);
    }

    @Test
    void adminCanReadSystemRecordForReconciliation() {
        var expected = onChainRecord();
        when(records.findById(RECORD_ID)).thenReturn(Optional.of(record));
        when(record.getOnChainRecordId()).thenReturn(ON_CHAIN_RECORD_ID);
        when(wallets.findFirstByUserIdOrderByIdAsc(PATIENT_USER_ID)).thenReturn(Optional.of(patientWallet));
        when(patientWallet.getAddress()).thenReturn(PATIENT_WALLET);
        when(blockchain.getRecord(ON_CHAIN_RECORD_ID, PATIENT_WALLET)).thenReturn(expected);

        assertThat(service.getBySystemRecordId(999L, true, RECORD_ID)).isSameAs(expected);
        verify(access, never()).canDoctorReadPatient(999L, PATIENT_PROFILE_ID);
    }

    private BlockchainService.OnChainRecord onChainRecord() {
        return new BlockchainService.OnChainRecord(
                ON_CHAIN_RECORD_ID,
                "bafy-test",
                "0x" + "a".repeat(64),
                PATIENT_WALLET,
                PATIENT_WALLET,
                Instant.now(),
                BigInteger.ZERO,
                true);
    }
}
