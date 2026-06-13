package com.blockchain.emr.accesscontrol;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import java.math.BigInteger;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.blockchain.emr.accesscontrol.api.FacilityAccessModels.FacilityAccessChangeRequest;
import com.blockchain.emr.accesscontrol.application.FacilityAccessService;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.facility.application.HealthcareFacilityService;
import com.blockchain.emr.facility.domain.HealthcareFacility;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

class FacilityAccessServiceTests {
    private final PatientProfileRepository patients = mock(PatientProfileRepository.class);
    private final DoctorProfileRepository doctors = mock(DoctorProfileRepository.class);
    private final WalletAddressRepository wallets = mock(WalletAddressRepository.class);
    private final HealthcareFacilityService facilities = mock(HealthcareFacilityService.class);
    private final FacilityAccessRequestRepository requests = mock(FacilityAccessRequestRepository.class);
    private final FacilityAccessGrantRepository grants = mock(FacilityAccessGrantRepository.class);
    private final BlockchainService blockchain = mock(BlockchainService.class);
    private final FacilityAccessService service = new FacilityAccessService(
            patients, doctors, wallets, facilities, requests, grants, blockchain);

    private static final long PATIENT_USER_ID = 7L;
    private static final String PATIENT_WALLET = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
    private HealthcareFacility facility;

    @BeforeEach
    void setUp() {
        PatientProfile patient = mock(PatientProfile.class);
        WalletAddress wallet = mock(WalletAddress.class);
        facility = new HealthcareFacility("BV001", "Hospital", "Address", null);
        when(patients.findByUserId(PATIENT_USER_ID)).thenReturn(Optional.of(patient));
        when(wallets.findFirstByUserIdOrderByIdAsc(PATIENT_USER_ID)).thenReturn(Optional.of(wallet));
        when(wallet.getAddress()).thenReturn(PATIENT_WALLET);
        when(facilities.findActiveByFacilityId("BV001")).thenReturn(facility);
        when(facilities.findByFacilityId("BV001")).thenReturn(facility);
    }

    @Test
    void rejectsDuplicateGrantBeforePreparingTransaction() {
        when(blockchain.hasFacilityAccess(PATIENT_WALLET, "BV001")).thenReturn(true);

        assertThatThrownBy(() -> service.prepare(
                PATIENT_USER_ID, new FacilityAccessChangeRequest("BV001", true)))
                .isInstanceOf(ApplicationException.class)
                .hasMessage("Facility access is already granted on blockchain");

        verify(blockchain, never()).prepareFacilityAccessTransaction(anyString(), anyString(), anyBoolean());
    }

    @Test
    void rejectsDuplicateRevocationBeforePreparingTransaction() {
        when(blockchain.hasFacilityAccess(PATIENT_WALLET, "BV001")).thenReturn(false);

        assertThatThrownBy(() -> service.prepare(
                PATIENT_USER_ID, new FacilityAccessChangeRequest("BV001", false)))
                .isInstanceOf(ApplicationException.class)
                .hasMessage("Facility access is already revoked on blockchain");

        verify(blockchain, never()).prepareFacilityAccessTransaction(anyString(), anyString(), anyBoolean());
    }

    @Test
    void preparesTransactionWhenRequestedStateDiffersFromBlockchain() {
        var prepared = new BlockchainService.PreparedTransaction(
                PATIENT_WALLET, "0x5fbdb2315678afecb367f032d93f642f64180aa3",
                "0x52fc466b", BigInteger.valueOf(31337), "0x0");
        when(blockchain.hasFacilityAccess(PATIENT_WALLET, "BV001")).thenReturn(false);
        when(blockchain.prepareFacilityAccessTransaction(PATIENT_WALLET, "BV001", true)).thenReturn(prepared);

        service.prepare(PATIENT_USER_ID, new FacilityAccessChangeRequest("BV001", true));

        verify(blockchain).prepareFacilityAccessTransaction(PATIENT_WALLET, "BV001", true);
    }
}
