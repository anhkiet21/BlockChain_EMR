package com.blockchain.emr.accesscontrol;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import java.math.BigInteger;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import com.blockchain.emr.accesscontrol.api.FacilityAccessModels.FacilityAccessChangeRequest;
import com.blockchain.emr.accesscontrol.api.FacilityAccessModels.CreateAccessRequest;
import com.blockchain.emr.accesscontrol.application.FacilityAccessService;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.facility.application.HealthcareFacilityService;
import com.blockchain.emr.facility.domain.HealthcareFacility;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.patient.domain.Gender;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

class FacilityAccessServiceTests {
    private final PatientProfileRepository patients = mock(PatientProfileRepository.class);
    private final DoctorProfileRepository doctors = mock(DoctorProfileRepository.class);
    private final WalletAddressRepository wallets = mock(WalletAddressRepository.class);
    private final HealthcareFacilityService facilities = mock(HealthcareFacilityService.class);
    private final FacilityAccessRequestRepository requests = mock(FacilityAccessRequestRepository.class);
    private final FacilityAccessGrantRepository grants = mock(FacilityAccessGrantRepository.class);
    private final FacilityAccessAuditRepository audits = mock(FacilityAccessAuditRepository.class);
    private final BlockchainService blockchain = mock(BlockchainService.class);
    private final FacilityAccessService service = new FacilityAccessService(
            patients, doctors, wallets, facilities, requests, grants, audits, blockchain);

    private static final long PATIENT_USER_ID = 7L;
    private static final long DOCTOR_USER_ID = 9L;
    private static final String PATIENT_WALLET = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
    private static final String DOCTOR_WALLET = "0x49d84d5163eccfe786ba02b44df43078ed01b13e";
    private HealthcareFacility facility;

    @BeforeEach
    void setUp() {
        PatientProfile patient = mock(PatientProfile.class);
        WalletAddress wallet = mock(WalletAddress.class);
        facility = new HealthcareFacility("BV001", "Hospital", "Address", null);
        ReflectionTestUtils.setField(facility, "id", 11L);
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
                .hasMessage("Cơ sở y tế đã được cấp quyền trên blockchain.");

        verify(blockchain, never()).prepareFacilityAccessTransaction(anyString(), anyString(), anyBoolean());
    }

    @Test
    void rejectsDuplicateRevocationBeforePreparingTransaction() {
        when(blockchain.hasFacilityAccess(PATIENT_WALLET, "BV001")).thenReturn(false);

        assertThatThrownBy(() -> service.prepare(
                PATIENT_USER_ID, new FacilityAccessChangeRequest("BV001", false)))
                .isInstanceOf(ApplicationException.class)
                .hasMessage("Cơ sở y tế đã được thu hồi quyền trên blockchain.");

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

    @Test
    void rejectsDuplicatePendingAccessRequest() {
        createRequestContext();
        when(requests.existsByPatientProfileIdAndFacilityIdAndStatus(
                21L, 11L, FacilityAccessRequestStatus.PENDING)).thenReturn(true);

        assertThatThrownBy(() -> service.createRequest(
                DOCTOR_USER_ID, new CreateAccessRequest("PAT-00000021", "Need treatment history")))
                .isInstanceOf(ApplicationException.class)
                .hasMessage("Cơ sở y tế đã gửi yêu cầu truy cập và đang chờ bệnh nhân phản hồi.");

        verify(requests, never()).save(any());
        verify(wallets).findFirstByUserIdOrderByIdAsc(DOCTOR_USER_ID);
    }

    @Test
    void rejectsAccessRequestWhenFacilityAlreadyGranted() {
        createRequestContext();
        when(grants.existsByPatientProfileIdAndFacilityIdAndActiveTrue(21L, 11L)).thenReturn(true);
        when(blockchain.hasFacilityAccess(PATIENT_WALLET, "BV001")).thenReturn(true);

        assertThatThrownBy(() -> service.createRequest(
                DOCTOR_USER_ID, new CreateAccessRequest("PAT-00000021", "Need treatment history")))
                .isInstanceOf(ApplicationException.class)
                .hasMessage("Cơ sở y tế đã được cấp quyền truy cập hồ sơ bệnh nhân này.");

        verify(requests, never()).save(any());
    }

    @Test
    void rejectsSuccessfulButUnrelatedFacilityTransaction() {
        String hash = "0x" + "a".repeat(64);
        var expected = new BlockchainService.PreparedTransaction(
                PATIENT_WALLET, "0x5fbdb2315678afecb367f032d93f642f64180aa3",
                "0x52fc466b", BigInteger.valueOf(31337), "0x0");
        var event = new BlockchainService.FacilityAccessEvent(
                hash, 0, BigInteger.ONE, PATIENT_WALLET, "BV001", true, Instant.now());
        var transaction = new BlockchainService.FacilityAccessTransaction(
                hash, PATIENT_WALLET, expected.to(), "0xdeadbeef",
                BlockchainService.TransactionState.Status.SUCCESS, BigInteger.ONE, null, event);
        when(blockchain.prepareFacilityAccessTransaction(PATIENT_WALLET, "BV001", true)).thenReturn(expected);
        when(blockchain.getFacilityAccessTransaction(hash)).thenReturn(transaction);
        when(blockchain.hasFacilityAccess(PATIENT_WALLET, "BV001")).thenReturn(true);

        assertThatThrownBy(() -> service.confirm(
                PATIENT_USER_ID, new FacilityAccessChangeRequest("BV001", true), hash))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

        verify(grants, never()).save(any());
    }

    private RequestContext createRequestContext() {
        DoctorProfile doctor = mock(DoctorProfile.class);
        PatientProfile patient = mock(PatientProfile.class);
        User patientUser = mock(User.class);
        WalletAddress doctorWallet = mock(WalletAddress.class);
        WalletAddress patientWallet = mock(WalletAddress.class);

        when(doctors.findByUserId(DOCTOR_USER_ID)).thenReturn(Optional.of(doctor));
        when(doctor.isVerified()).thenReturn(true);
        when(doctor.getHealthcareFacility()).thenReturn(facility);
        when(patients.findByUserIdentityNumberIgnoreCase("PAT-00000021")).thenReturn(Optional.empty());
        when(patients.findByPatientCodeIgnoreCase("PAT-00000021")).thenReturn(Optional.of(patient));
        when(patients.findById(21L)).thenReturn(Optional.of(patient));
        when(patient.getId()).thenReturn(21L);
        when(patient.getUser()).thenReturn(patientUser);
        when(patientUser.getId()).thenReturn(PATIENT_USER_ID);
        when(wallets.findFirstByUserIdOrderByIdAsc(DOCTOR_USER_ID)).thenReturn(Optional.of(doctorWallet));
        when(wallets.findFirstByUserIdOrderByIdAsc(PATIENT_USER_ID)).thenReturn(Optional.of(patientWallet));
        when(doctorWallet.getAddress()).thenReturn(DOCTOR_WALLET);
        when(patientWallet.getAddress()).thenReturn(PATIENT_WALLET);
        return new RequestContext(doctorWallet, patientWallet);
    }

    @Test
    void listsOnlyActivePatientsForAuthenticatedDoctorsFacility() {
        long doctorUserId = 9L;
        long facilityId = 11L;
        DoctorProfile doctor = mock(DoctorProfile.class);
        HealthcareFacility doctorFacility = mock(HealthcareFacility.class);
        FacilityAccessGrant grant = mock(FacilityAccessGrant.class);
        PatientProfile patient = mock(PatientProfile.class);
        User patientUser = mock(User.class);

        when(doctors.findByUserId(doctorUserId)).thenReturn(Optional.of(doctor));
        when(doctor.isVerified()).thenReturn(true);
        when(doctor.getHealthcareFacility()).thenReturn(doctorFacility);
        when(doctorFacility.isActive()).thenReturn(true);
        when(doctorFacility.getId()).thenReturn(facilityId);
        when(grant.getPatientProfile()).thenReturn(patient);
        when(patient.getId()).thenReturn(21L);
        when(patient.getPatientCode()).thenReturn("PAT-00000021");
        when(patient.getUser()).thenReturn(patientUser);
        when(patientUser.getFullName()).thenReturn("Nguyen Van An");
        when(patient.getDateOfBirth()).thenReturn(LocalDate.of(1990, 1, 2));
        when(patient.getGender()).thenReturn(Gender.MALE);
        when(grants.findActivePatientsByFacilityId(eq(facilityId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(grant)));

        var result = service.authorizedPatients(doctorUserId, 0, 50);

        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).patientCode()).isEqualTo("PAT-00000021");
        verify(grants).findActivePatientsByFacilityId(eq(facilityId), any(Pageable.class));
    }

    private record RequestContext(WalletAddress doctorWallet, WalletAddress patientWallet) {}
}
