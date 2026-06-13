package com.blockchain.emr.medicalrecord;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import java.math.BigInteger;
import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import com.blockchain.emr.accesscontrol.application.FacilityAccessService;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.medicalrecord.api.dto.ConfirmRecordRequest;
import com.blockchain.emr.medicalrecord.application.MedicalFileService;
import com.blockchain.emr.medicalrecord.application.UnifiedMedicalRecordService;
import com.blockchain.emr.medicalrecord.domain.MedicalFile;
import com.blockchain.emr.medicalrecord.domain.MedicalRecordSourceType;
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
}
