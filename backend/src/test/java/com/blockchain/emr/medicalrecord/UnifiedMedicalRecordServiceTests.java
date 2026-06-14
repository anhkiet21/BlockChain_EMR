package com.blockchain.emr.medicalrecord;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import java.math.BigInteger;
import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import com.blockchain.emr.accesscontrol.api.FacilityAccessModels.EmergencyAccessResponse;
import com.blockchain.emr.accesscontrol.application.FacilityAccessService;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.medicalrecord.api.dto.ConfirmRecordRequest;
import com.blockchain.emr.medicalrecord.api.dto.ConfirmRecordCorrectionRequest;
import com.blockchain.emr.medicalrecord.application.MedicalFileService;
import com.blockchain.emr.medicalrecord.application.UnifiedMedicalRecordService;
import com.blockchain.emr.medicalrecord.domain.MedicalFile;
import com.blockchain.emr.medicalrecord.domain.MedicalRecordSourceType;
import com.blockchain.emr.medicalrecord.domain.MedicalRecordStatus;
import com.blockchain.emr.medicalrecord.domain.MedicalRecord;
import com.blockchain.emr.medicalrecord.domain.MedicalRecordFile;
import com.blockchain.emr.medicalrecord.domain.RecordAccessLog;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.facility.domain.HealthcareFacility;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalFileRepository;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalRecordFileRepository;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalRecordRepository;
import com.blockchain.emr.medicalrecord.infrastructure.RecordAccessLogRepository;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

class UnifiedMedicalRecordServiceTests {
    private final MedicalFileService fileService = mock(MedicalFileService.class);
    private final MedicalFileRepository files = mock(MedicalFileRepository.class);
    private final MedicalRecordRepository records = mock(MedicalRecordRepository.class);
    private final MedicalRecordFileRepository recordFiles = mock(MedicalRecordFileRepository.class);
    private final RecordAccessLogRepository logs = mock(RecordAccessLogRepository.class);
    private final PatientProfileRepository patients = mock(PatientProfileRepository.class);
    private final DoctorProfileRepository doctors = mock(DoctorProfileRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final WalletAddressRepository wallets = mock(WalletAddressRepository.class);
    private final FacilityAccessService access = mock(FacilityAccessService.class);
    private final BlockchainService blockchain = mock(BlockchainService.class);
    private final UnifiedMedicalRecordService service = new UnifiedMedicalRecordService(
            fileService, files, records, recordFiles, logs, patients, doctors, users, wallets, access, blockchain);

    @Test
    void rejectsRecordIdThatWasNotCreatedBySubmittedTransaction() {
        long userId = 7L;
        long fileId = 11L;
        String walletAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
        String contract = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
        String hash = "0x" + "b".repeat(64);
        BigInteger requestedRecordId = BigInteger.valueOf(9);
        MedicalFile file = mock(MedicalFile.class);
        User user = mock(User.class);
        PatientProfile patient = mock(PatientProfile.class);
        WalletAddress wallet = mock(WalletAddress.class);
        when(file.getUploadedBy()).thenReturn(user);
        when(user.getId()).thenReturn(userId);
        when(file.getPatientProfile()).thenReturn(patient);
        when(patient.getUser()).thenReturn(user);
        when(file.getSourceType()).thenReturn(MedicalRecordSourceType.PATIENT_UPLOADED);
        when(file.getCid()).thenReturn("bafy-encrypted-record");
        when(file.getContentHash()).thenReturn("1".repeat(64));
        when(files.findById(fileId)).thenReturn(Optional.of(file));
        when(recordFiles.existsByMedicalFileId(fileId)).thenReturn(false);
        when(wallets.findFirstByUserIdOrderByIdAsc(userId)).thenReturn(Optional.of(wallet));
        when(wallet.getAddress()).thenReturn(walletAddress);
        var expected = new BlockchainService.PreparedTransaction(
                walletAddress, contract, "0xabcdef", BigInteger.valueOf(31337), "0x0");
        var event = new BlockchainService.RecordEvent(
                hash, 0, BigInteger.ONE, BigInteger.valueOf(8), walletAddress, walletAddress,
                file.getCid(), Instant.now());
        var transaction = new BlockchainService.RecordTransaction(
                hash, walletAddress, contract, expected.data(),
                BlockchainService.TransactionState.Status.SUCCESS, BigInteger.ONE, null, event);
        when(blockchain.prepareRecordTransaction(
                walletAddress, walletAddress, file.getCid(), file.getContentHash(),
                MedicalRecordSourceType.PATIENT_UPLOADED.name(), null)).thenReturn(expected);
        when(blockchain.getRecordTransaction(hash)).thenReturn(transaction);

        assertThatThrownBy(() -> service.confirm(
                userId, new ConfirmRecordRequest(fileId, requestedRecordId, hash)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("does not match");

        verify(blockchain, never()).getRecord(any(), anyString());
        verify(records, never()).save(any());
    }

    @Test
    void rejectsCorrectionAfterFacilityAccessWasRevoked() {
        long userId = 7L;
        MedicalRecord previous = mock(MedicalRecord.class);
        PatientProfile patient = mock(PatientProfile.class);
        DoctorProfile doctor = eligibleDoctor(userId);
        when(previous.getStatus()).thenReturn(MedicalRecordStatus.ACTIVE);
        when(previous.getPatientProfile()).thenReturn(patient);
        when(patient.getId()).thenReturn(21L);
        when(records.findLockedById(31L)).thenReturn(Optional.of(previous));
        when(doctors.findByUserId(userId)).thenReturn(Optional.of(doctor));
        when(access.canDoctorAccessPatient(userId, 21L)).thenReturn(false);

        assertThatThrownBy(() -> service.confirmCorrection(
                userId,
                31L,
                new ConfirmRecordCorrectionRequest(
                        41L, BigInteger.valueOf(51), "0x" + "a".repeat(64), "Wrong diagnosis")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("revoked");

        verify(blockchain, never()).getRecordTransaction(anyString());
        verify(records, never()).save(any());
    }

    @Test
    void rejectsCorrectionWhoseTransactionInputDoesNotMatch() {
        long userId = 7L;
        long patientUserId = 8L;
        long patientId = 21L;
        long fileId = 41L;
        long recordId = 31L;
        String doctorWalletAddress = "0x" + "1".repeat(40);
        String patientWalletAddress = "0x" + "2".repeat(40);
        String transactionHash = "0x" + "a".repeat(64);
        BigInteger previousOnChainId = BigInteger.valueOf(50);
        BigInteger correctedOnChainId = BigInteger.valueOf(51);

        DoctorProfile doctor = eligibleDoctor(userId);
        HealthcareFacility facility = doctor.getHealthcareFacility();
        User doctorUser = doctor.getUser();
        User patientUser = mock(User.class);
        PatientProfile patient = mock(PatientProfile.class);
        MedicalRecord previous = mock(MedicalRecord.class);
        MedicalFile file = mock(MedicalFile.class);
        WalletAddress doctorWallet = mock(WalletAddress.class);
        WalletAddress patientWallet = mock(WalletAddress.class);

        when(patientUser.getId()).thenReturn(patientUserId);
        when(patient.getId()).thenReturn(patientId);
        when(patient.getUser()).thenReturn(patientUser);
        when(previous.getStatus()).thenReturn(MedicalRecordStatus.ACTIVE);
        when(previous.getPatientProfile()).thenReturn(patient);
        when(previous.getOnChainRecordId()).thenReturn(previousOnChainId);
        when(records.findLockedById(recordId)).thenReturn(Optional.of(previous));
        when(doctors.findByUserId(userId)).thenReturn(Optional.of(doctor));
        when(access.canDoctorAccessPatient(userId, patientId)).thenReturn(true);

        when(file.getId()).thenReturn(fileId);
        when(file.getUploadedBy()).thenReturn(doctorUser);
        when(file.getPatientProfile()).thenReturn(patient);
        when(file.getSourceType()).thenReturn(MedicalRecordSourceType.DOCTOR_UPLOADED);
        when(file.getHealthcareFacility()).thenReturn(facility);
        when(file.getCid()).thenReturn("bafy-correction");
        when(file.getContentHash()).thenReturn("b".repeat(64));
        when(files.findById(fileId)).thenReturn(Optional.of(file));
        when(recordFiles.existsByMedicalFileId(fileId)).thenReturn(false);

        when(doctorWallet.getAddress()).thenReturn(doctorWalletAddress);
        when(patientWallet.getAddress()).thenReturn(patientWalletAddress);
        when(wallets.findFirstByUserIdOrderByIdAsc(userId)).thenReturn(Optional.of(doctorWallet));
        when(wallets.findFirstByUserIdOrderByIdAsc(patientUserId)).thenReturn(Optional.of(patientWallet));

        var expected = new BlockchainService.PreparedTransaction(
                doctorWalletAddress, "0x" + "3".repeat(40), "0xexpected",
                BigInteger.valueOf(31337), "0x0");
        when(blockchain.prepareRecordVersionTransaction(
                doctorWalletAddress, previousOnChainId, file.getCid(), file.getContentHash(), "BV001"))
                .thenReturn(expected);
        when(blockchain.getRecordTransaction(transactionHash)).thenReturn(new BlockchainService.RecordTransaction(
                transactionHash,
                doctorWalletAddress,
                expected.to(),
                "0xtampered",
                BlockchainService.TransactionState.Status.SUCCESS,
                BigInteger.ONE,
                null,
                null));

        assertThatThrownBy(() -> service.confirmCorrection(
                userId,
                recordId,
                new ConfirmRecordCorrectionRequest(
                        fileId, correctedOnChainId, transactionHash, "Wrong diagnosis")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("does not match");

        verify(blockchain, never()).getRecord(any(), anyString());
        verify(records, never()).save(any());
    }

    @Test
    void allowsEmergencyReadAndWritesEmergencyViewAudit() {
        long userId = 7L;
        long patientId = 21L;
        DoctorProfile doctor = eligibleDoctor(userId);
        User actor = doctor.getUser();
        MedicalRecord record = mock(MedicalRecord.class);
        PatientProfile patient = mock(PatientProfile.class);

        when(doctors.findByUserId(userId)).thenReturn(Optional.of(doctor));
        when(access.canDoctorAccessPatient(userId, patientId)).thenReturn(false);
        when(access.hasActiveEmergencyAccess(userId, patientId)).thenReturn(true);
        when(users.findById(userId)).thenReturn(Optional.of(actor));
        when(record.getId()).thenReturn(31L);
        when(record.getPatientProfile()).thenReturn(patient);
        when(record.getSourceType()).thenReturn(MedicalRecordSourceType.PATIENT_UPLOADED);
        when(record.getTitle()).thenReturn("Emergency record");
        when(record.getRecordType()).thenReturn("APPLICATION_JSON");
        when(record.getCid()).thenReturn("bafy-emergency");
        when(record.getContentHash()).thenReturn("c".repeat(64));
        when(record.getUploadedBy()).thenReturn(actor);
        when(record.getUploadedByWallet()).thenReturn("0x" + "1".repeat(40));
        when(record.getOnChainRecordId()).thenReturn(BigInteger.ONE);
        when(record.getBlockchainTxHash()).thenReturn("0x" + "a".repeat(64));
        when(record.getStatus()).thenReturn(MedicalRecordStatus.ACTIVE);
        when(records.findByPatientProfileId(eq(patientId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(java.util.List.of(record)));

        service.doctorRecords(userId, patientId, 0, 20);

        verify(logs).save(argThat(log -> "EMERGENCY_VIEW".equals(log.getAction())));
    }

    @Test
    void deniesDoctorReadWithoutNormalOrEmergencyAccess() {
        long userId = 7L;
        long patientId = 21L;
        DoctorProfile doctor = eligibleDoctor(userId);
        when(doctors.findByUserId(userId)).thenReturn(Optional.of(doctor));
        when(access.canDoctorAccessPatient(userId, patientId)).thenReturn(false);
        when(access.hasActiveEmergencyAccess(userId, patientId)).thenReturn(false);

        assertThatThrownBy(() -> service.doctorRecords(userId, patientId, 0, 20))
                .isInstanceOf(AccessDeniedException.class);

        verify(logs, never()).save(any(RecordAccessLog.class));
    }

    @Test
    void patientAuditLogsIncludeEmergencyContextAndPrimaryFileName() {
        long patientUserId = 8L;
        long doctorUserId = 7L;
        long patientId = 21L;
        long recordId = 31L;
        Instant grantedAt = Instant.parse("2026-06-14T06:00:00Z");
        Instant actionAt = Instant.parse("2026-06-14T06:15:00Z");
        Instant expiresAt = Instant.parse("2026-06-14T08:00:00Z");

        User patientUser = mock(User.class);
        User doctorUser = mock(User.class);
        PatientProfile patient = mock(PatientProfile.class);
        MedicalRecord record = mock(MedicalRecord.class);
        MedicalFile file = mock(MedicalFile.class);

        when(patientUser.getId()).thenReturn(patientUserId);
        when(doctorUser.getId()).thenReturn(doctorUserId);
        when(doctorUser.getFullName()).thenReturn("Bac Si Test");
        when(doctorUser.getRoles()).thenReturn(java.util.Set.of());
        when(patient.getId()).thenReturn(patientId);
        when(patient.getUser()).thenReturn(patientUser);
        when(record.getId()).thenReturn(recordId);
        when(record.getPatientProfile()).thenReturn(patient);
        when(file.getId()).thenReturn(41L);
        when(file.getOriginalFilename()).thenReturn("emergency.pdf");
        when(file.getHealthcareFacility()).thenReturn(null);

        RecordAccessLog log = new RecordAccessLog(record, null, doctorUser, "EMERGENCY_VIEW");
        ReflectionTestUtils.setField(log, "id", 51L);
        ReflectionTestUtils.setField(log, "createdAt", actionAt);
        when(records.findById(recordId)).thenReturn(Optional.of(record));
        when(recordFiles.findAllByMedicalRecordId(recordId))
                .thenReturn(java.util.List.of(new MedicalRecordFile(record, file)));
        when(logs.findAllByMedicalRecordIdOrderByCreatedAtDescIdDesc(recordId))
                .thenReturn(java.util.List.of(log));
        when(access.emergencyAccessContextForAudit(doctorUserId, patientId, actionAt))
                .thenReturn(Optional.of(new EmergencyAccessResponse(
                        61L,
                        patientId,
                        "PAT-00000008",
                        "Benh Nhan Test",
                        "BV001",
                        "Benh vien Cho Ray",
                        "Bac Si Test",
                        "ER-001",
                        "Benh nhan bat tinh",
                        grantedAt,
                        expiresAt,
                        true)));

        var result = service.patientAuditLogs(patientUserId, recordId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).medicalFileName()).isEqualTo("emergency.pdf");
        assertThat(result.get(0).facilityId()).isEqualTo("BV001");
        assertThat(result.get(0).emergencyAccessId()).isEqualTo(61L);
        assertThat(result.get(0).emergencyCaseCode()).isEqualTo("ER-001");
        assertThat(result.get(0).emergencyReason()).isEqualTo("Benh nhan bat tinh");
        assertThat(result.get(0).emergencyExpiresAt()).isEqualTo(expiresAt);
        assertThat(result.get(0).emergencyActiveAtActionTime()).isTrue();
    }

    private DoctorProfile eligibleDoctor(long userId) {
        User doctorUser = mock(User.class);
        HealthcareFacility facility = mock(HealthcareFacility.class);
        DoctorProfile doctor = mock(DoctorProfile.class);
        when(doctorUser.getId()).thenReturn(userId);
        when(facility.getId()).thenReturn(61L);
        when(facility.getFacilityId()).thenReturn("BV001");
        when(facility.isActive()).thenReturn(true);
        when(doctor.getUser()).thenReturn(doctorUser);
        when(doctor.getHealthcareFacility()).thenReturn(facility);
        when(doctor.isVerified()).thenReturn(true);
        return doctor;
    }
}
