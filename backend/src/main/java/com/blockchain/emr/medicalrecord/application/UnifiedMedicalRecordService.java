package com.blockchain.emr.medicalrecord.application;

import java.math.BigInteger;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.blockchain.emr.accesscontrol.api.FacilityAccessModels.EmergencyAccessResponse;
import com.blockchain.emr.accesscontrol.application.FacilityAccessService;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.integration.blockchain.domain.BlockchainException;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.medicalrecord.api.dto.ConfirmRecordRequest;
import com.blockchain.emr.medicalrecord.api.dto.ConfirmRecordCorrectionRequest;
import com.blockchain.emr.medicalrecord.api.dto.PendingRecordUploadResponse;
import com.blockchain.emr.medicalrecord.api.dto.RecordAuditLogResponse;
import com.blockchain.emr.medicalrecord.api.dto.RecordIntegrityResponse;
import com.blockchain.emr.medicalrecord.api.dto.UnifiedMedicalRecordResponse;
import com.blockchain.emr.medicalrecord.domain.MedicalFile;
import com.blockchain.emr.medicalrecord.domain.MedicalRecord;
import com.blockchain.emr.medicalrecord.domain.MedicalRecordFile;
import com.blockchain.emr.medicalrecord.domain.MedicalRecordSourceType;
import com.blockchain.emr.medicalrecord.domain.RecordAccessLog;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalFileRepository;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalRecordFileRepository;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalRecordRepository;
import com.blockchain.emr.medicalrecord.infrastructure.RecordAccessLogRepository;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

@Service
public class UnifiedMedicalRecordService {
    private final MedicalFileService fileService;
    private final MedicalFileRepository files;
    private final MedicalRecordRepository records;
    private final MedicalRecordFileRepository recordFiles;
    private final RecordAccessLogRepository logs;
    private final PatientProfileRepository patients;
    private final DoctorProfileRepository doctors;
    private final UserRepository users;
    private final WalletAddressRepository wallets;
    private final FacilityAccessService access;
    private final BlockchainService blockchain;

    public UnifiedMedicalRecordService(
            MedicalFileService fileService,
            MedicalFileRepository files,
            MedicalRecordRepository records,
            MedicalRecordFileRepository recordFiles,
            RecordAccessLogRepository logs,
            PatientProfileRepository patients,
            DoctorProfileRepository doctors,
            UserRepository users,
            WalletAddressRepository wallets,
            FacilityAccessService access,
            BlockchainService blockchain) {
        this.fileService = fileService;
        this.files = files;
        this.records = records;
        this.recordFiles = recordFiles;
        this.logs = logs;
        this.patients = patients;
        this.doctors = doctors;
        this.users = users;
        this.wallets = wallets;
        this.access = access;
        this.blockchain = blockchain;
    }

    @Transactional
    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    public PendingRecordUploadResponse uploadPatient(Long userId, MultipartFile multipart) {
        PatientProfile patient = requirePatientUser(userId);
        User actor = requireUser(userId);
        String wallet = requireWallet(userId).getAddress();
        MedicalFile file = fileService.storeForPatient(
                patient, actor, multipart, MedicalRecordSourceType.PATIENT_UPLOADED, wallet, null);
        logs.save(new RecordAccessLog(null, file, actor, "UPLOAD"));
        return pending(file, wallet, wallet);
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public PendingRecordUploadResponse uploadDoctor(Long userId, Long patientId, MultipartFile multipart) {
        DoctorProfile doctor = requireDoctor(userId);
        PatientProfile patient = patients.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        if (!access.canDoctorAccessPatient(userId, patientId)) {
            throw new AccessDeniedException("Facility has not been granted patient access");
        }
        String doctorWallet = requireWallet(userId).getAddress();
        String patientWallet = requireWallet(patient.getUser().getId()).getAddress();
        MedicalFile file = fileService.storeForPatient(
                patient,
                doctor.getUser(),
                multipart,
                MedicalRecordSourceType.DOCTOR_UPLOADED,
                doctorWallet,
                doctor.getHealthcareFacility());
        logs.save(new RecordAccessLog(null, file, doctor.getUser(), "UPLOAD"));
        return pending(file, patientWallet, doctorWallet);
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public PendingRecordUploadResponse uploadCorrection(Long userId, Long recordId, MultipartFile multipart) {
        MedicalRecord previous = requireActiveRecord(recordId);
        DoctorProfile doctor = requireDoctor(userId);
        PatientProfile patient = previous.getPatientProfile();
        if (!access.canDoctorAccessPatient(userId, patient.getId())) {
            throw new AccessDeniedException("Facility has not been granted patient access");
        }
        String doctorWallet = requireWallet(userId).getAddress();
        String patientWallet = requireWallet(patient.getUser().getId()).getAddress();
        MedicalFile file = fileService.storeForPatient(
                patient,
                doctor.getUser(),
                multipart,
                MedicalRecordSourceType.DOCTOR_UPLOADED,
                doctorWallet,
                doctor.getHealthcareFacility());
        logs.save(new RecordAccessLog(previous, file, doctor.getUser(), "UPLOAD"));
        return pending(file, patientWallet, doctorWallet);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR') and #userId == authentication.principal.id")
    public UnifiedMedicalRecordResponse confirm(Long userId, ConfirmRecordRequest request) {
        MedicalFile file = files.findById(request.medicalFileId())
                .orElseThrow(() -> new ResourceNotFoundException("Medical file not found"));
        if (!file.getUploadedBy().getId().equals(userId)) {
            throw new AccessDeniedException("Only the uploader can confirm this record");
        }
        if (recordFiles.existsByMedicalFileId(request.medicalFileId())) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Medical file is already attached");
        }
        String callerWallet = requireWallet(userId).getAddress();
        String patientWallet = requireWallet(file.getPatientProfile().getUser().getId()).getAddress();
        DoctorProfile doctor = null;
        if (file.getSourceType() == MedicalRecordSourceType.DOCTOR_UPLOADED) {
            doctor = requireDoctor(userId);
            if (file.getHealthcareFacility() == null
                    || !file.getHealthcareFacility().getId().equals(doctor.getHealthcareFacility().getId())
                    || !access.canDoctorAccessPatient(userId, file.getPatientProfile().getId())) {
                throw new AccessDeniedException("Facility access was revoked or doctor affiliation changed");
            }
        }
        verifyRecordTransaction(file, patientWallet, callerWallet, request);
        var onChain = blockchain.getRecord(request.onChainRecordId(), callerWallet);
        var metadata = blockchain.getRecordMetadata(request.onChainRecordId(), callerWallet);
        verifyOnChain(file, patientWallet, callerWallet, onChain, metadata);

        MedicalRecord record = records.save(new MedicalRecord(
                file.getPatientProfile(),
                doctor,
                file.getUploadedBy(),
                file.getSourceType(),
                file.getHealthcareFacility(),
                callerWallet,
                file.getOriginalFilename(),
                file.getContentType().toUpperCase(Locale.ROOT),
                file.getCid(),
                file.getContentHash(),
                request.onChainRecordId(),
                request.transactionHash().toLowerCase(Locale.ROOT)));
        recordFiles.save(new MedicalRecordFile(record, file));
        logs.save(new RecordAccessLog(record, file, file.getUploadedBy(), "CREATE"));
        return response(record);
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public UnifiedMedicalRecordResponse confirmCorrection(
            Long userId,
            Long recordId,
            ConfirmRecordCorrectionRequest request) {
        MedicalRecord previous = records.findLockedById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        ensureActive(previous);
        DoctorProfile doctor = requireDoctor(userId);
        PatientProfile patient = previous.getPatientProfile();
        if (!access.canDoctorAccessPatient(userId, patient.getId())) {
            throw new AccessDeniedException("Facility access was revoked");
        }

        MedicalFile file = files.findById(request.medicalFileId())
                .orElseThrow(() -> new ResourceNotFoundException("Medical file not found"));
        if (!file.getUploadedBy().getId().equals(userId)
                || !file.getPatientProfile().getId().equals(patient.getId())
                || file.getSourceType() != MedicalRecordSourceType.DOCTOR_UPLOADED
                || file.getHealthcareFacility() == null
                || !file.getHealthcareFacility().getId().equals(doctor.getHealthcareFacility().getId())) {
            throw new AccessDeniedException("Correction file does not belong to this doctor, patient and facility");
        }
        if (recordFiles.existsByMedicalFileId(file.getId())) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Medical file is already attached");
        }

        String doctorWallet = requireWallet(userId).getAddress();
        String patientWallet = requireWallet(patient.getUser().getId()).getAddress();
        String facilityId = doctor.getHealthcareFacility().getFacilityId();
        verifyCorrectionTransaction(
                previous, file, patientWallet, doctorWallet, facilityId, request);
        var onChain = blockchain.getRecord(request.onChainRecordId(), doctorWallet);
        var metadata = blockchain.getRecordMetadata(request.onChainRecordId(), doctorWallet);
        boolean onChainValid = file.getCid().equals(onChain.cid())
                && normalizeHash(file.getContentHash()).equals(normalizeHash(onChain.contentHash()))
                && patientWallet.equalsIgnoreCase(onChain.patientWallet())
                && doctorWallet.equalsIgnoreCase(onChain.authorWallet())
                && previous.getOnChainRecordId().equals(onChain.previousRecordId())
                && onChain.latestVersion()
                && MedicalRecordSourceType.DOCTOR_UPLOADED.name().equals(metadata.sourceType())
                && doctorWallet.equalsIgnoreCase(metadata.uploaderWallet())
                && facilityId.equalsIgnoreCase(metadata.facilityId());
        if (!onChainValid) {
            throw new ApplicationException(ErrorCode.CONFLICT, "On-chain correction does not match the medical record");
        }

        String reason = request.correctionReason().trim();
        MedicalRecord corrected = new MedicalRecord(
                patient,
                doctor,
                doctor.getUser(),
                MedicalRecordSourceType.DOCTOR_UPLOADED,
                doctor.getHealthcareFacility(),
                doctorWallet,
                file.getOriginalFilename(),
                file.getContentType().toUpperCase(Locale.ROOT),
                file.getCid(),
                file.getContentHash(),
                request.onChainRecordId(),
                request.transactionHash().toLowerCase(Locale.ROOT));
        corrected.linkToPrevious(previous, reason);
        corrected = records.save(corrected);
        recordFiles.save(new MedicalRecordFile(corrected, file));
        previous.markCorrectedBy(corrected, doctor, reason);
        logs.save(new RecordAccessLog(previous, null, doctor.getUser(), "CORRECT"));
        logs.save(new RecordAccessLog(corrected, file, doctor.getUser(), "CREATE"));
        return response(corrected);
    }

    private void verifyCorrectionTransaction(
            MedicalRecord previous,
            MedicalFile file,
            String patientWallet,
            String doctorWallet,
            String facilityId,
            ConfirmRecordCorrectionRequest request) {
        var expected = blockchain.prepareRecordVersionTransaction(
                doctorWallet,
                previous.getOnChainRecordId(),
                file.getCid(),
                file.getContentHash(),
                facilityId);
        var transaction = blockchain.getRecordTransaction(request.transactionHash());
        if (transaction.status() == BlockchainService.TransactionState.Status.PENDING) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Blockchain transaction has not been mined");
        }
        var event = transaction.recordEvent();
        boolean valid = transaction.status() == BlockchainService.TransactionState.Status.SUCCESS
                && equalsIgnoreCase(transaction.from(), expected.from())
                && equalsIgnoreCase(transaction.to(), expected.to())
                && equalsIgnoreCase(transaction.input(), expected.data())
                && event != null
                && equalsIgnoreCase(event.transactionHash(), transaction.transactionHash())
                && event.recordId().equals(request.onChainRecordId())
                && equalsIgnoreCase(event.patientWallet(), patientWallet)
                && equalsIgnoreCase(event.authorWallet(), doctorWallet)
                && event.cid().equals(file.getCid());
        if (!valid) {
            throw new AccessDeniedException("Blockchain transaction does not match the correction");
        }
    }

    private void verifyRecordTransaction(
            MedicalFile file,
            String patientWallet,
            String uploaderWallet,
            ConfirmRecordRequest request) {
        String facilityId = file.getHealthcareFacility() == null
                ? null
                : file.getHealthcareFacility().getFacilityId();
        var expected = blockchain.prepareRecordTransaction(
                uploaderWallet, patientWallet, file.getCid(), file.getContentHash(),
                file.getSourceType().name(), facilityId);
        var transaction = blockchain.getRecordTransaction(request.transactionHash());
        if (transaction.status() == BlockchainService.TransactionState.Status.PENDING) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Blockchain transaction has not been mined");
        }
        var event = transaction.recordEvent();
        boolean valid = transaction.status() == BlockchainService.TransactionState.Status.SUCCESS
                && equalsIgnoreCase(transaction.from(), expected.from())
                && equalsIgnoreCase(transaction.to(), expected.to())
                && equalsIgnoreCase(transaction.input(), expected.data())
                && event != null
                && equalsIgnoreCase(event.transactionHash(), transaction.transactionHash())
                && event.recordId().equals(request.onChainRecordId())
                && equalsIgnoreCase(event.patientWallet(), patientWallet)
                && equalsIgnoreCase(event.authorWallet(), uploaderWallet)
                && event.cid().equals(file.getCid());
        if (!valid) {
            throw new AccessDeniedException("Blockchain transaction does not match the uploaded medical record");
        }
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    public PageResponse<UnifiedMedicalRecordResponse> patientRecords(Long userId, int page, int size) {
        requirePatientUser(userId);
        return PageResponse.from(records.findByPatientProfileUserId(
                        userId,
                        PageRequest.of(Math.max(page, 0), safeSize(size), Sort.by("createdAt").descending()))
                .map(this::response));
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public PageResponse<UnifiedMedicalRecordResponse> doctorRecords(
            Long userId, Long patientId, int page, int size) {
        requireDoctor(userId);
        boolean normalAccess = access.canDoctorAccessPatient(userId, patientId);
        boolean emergencyAccess = !normalAccess && access.hasActiveEmergencyAccess(userId, patientId);
        if (!normalAccess && !emergencyAccess) {
            throw new AccessDeniedException("Facility has not been granted patient access");
        }
        var recordPage = records.findByPatientProfileId(
                patientId,
                PageRequest.of(Math.max(page, 0), safeSize(size), Sort.by("createdAt").descending()));
        if (emergencyAccess) {
            User actor = requireUser(userId);
            recordPage.forEach(record -> logs.save(new RecordAccessLog(record, null, actor, "EMERGENCY_VIEW")));
        }
        return PageResponse.from(recordPage.map(this::response));
    }

    @Transactional
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR') and #userId == authentication.principal.id")
    public MedicalFileService.DownloadedMedicalFile download(Long userId, Long recordId) {
        MedicalRecord record = records.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        boolean patientOwner = record.getPatientProfile().getUser().getId().equals(userId);
        boolean normalAccess = !patientOwner && access.canDoctorAccessPatient(userId, record.getPatientProfile().getId());
        boolean emergencyAccess = !patientOwner && !normalAccess
                && access.hasActiveEmergencyAccess(userId, record.getPatientProfile().getId());
        if (!patientOwner && !normalAccess && !emergencyAccess) {
            throw new AccessDeniedException("Medical record access denied");
        }
        MedicalFile file = recordFiles.findAllByMedicalRecordId(recordId).stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Medical file not found"))
                .getMedicalFile();
        logs.save(new RecordAccessLog(
                record,
                file,
                requireUser(userId),
                emergencyAccess ? "EMERGENCY_DOWNLOAD" : "DOWNLOAD"));
        return fileService.download(file);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    public List<RecordAuditLogResponse> patientAuditLogs(Long userId, Long recordId) {
        MedicalRecord record = records.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        if (!record.getPatientProfile().getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Medical record does not belong to the current patient");
        }
        return logs.findAllByMedicalRecordIdOrderByCreatedAtDescIdDesc(recordId).stream()
                .map(this::auditResponse)
                .toList();
    }

    @Transactional
    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    public RecordIntegrityResponse patientIntegrity(Long userId, Long recordId) {
        MedicalRecord record = records.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        if (!record.getPatientProfile().getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Medical record does not belong to the current patient");
        }
        MedicalFile file = recordFiles.findAllByMedicalRecordId(recordId).stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Medical file not found"))
                .getMedicalFile();
        String patientWallet = requireWallet(userId).getAddress();
        BlockchainService.OnChainRecord onChain = null;
        boolean blockchainReadable = true;
        try {
            onChain = blockchain.getRecord(record.getOnChainRecordId(), patientWallet);
        } catch (BlockchainException exception) {
            blockchainReadable = false;
        }

        String computedHash = null;
        boolean storageReadable = true;
        try {
            computedHash = fileService.computeCurrentPlaintextHash(file);
        } catch (RuntimeException exception) {
            storageReadable = false;
        }

        boolean cidMatches = blockchainReadable && equalsIgnoreCase(record.getCid(), onChain.cid());
        boolean databaseHashMatchesOnChain = blockchainReadable
                && normalizeHash(record.getContentHash()).equals(normalizeHash(onChain.contentHash()));
        boolean computedHashMatchesOnChain = blockchainReadable
                && storageReadable
                && normalizeHash(computedHash).equals(normalizeHash(onChain.contentHash()));
        boolean valid = storageReadable && blockchainReadable
                && cidMatches && databaseHashMatchesOnChain && computedHashMatchesOnChain;

        logs.save(new RecordAccessLog(record, file, requireUser(userId), "INTEGRITY_CHECK"));
        return new RecordIntegrityResponse(
                record.getId(),
                file.getId(),
                valid,
                valid ? "VALID" : blockchainReadable ? "TAMPERED" : "ON_CHAIN_UNREADABLE",
                integrityMessage(valid, storageReadable, blockchainReadable),
                storageReadable,
                blockchainReadable,
                cidMatches,
                databaseHashMatchesOnChain,
                computedHashMatchesOnChain,
                record.getCid(),
                blockchainReadable ? onChain.cid() : null,
                normalizeHash(record.getContentHash()),
                blockchainReadable ? normalizeHash(onChain.contentHash()) : null,
                storageReadable ? normalizeHash(computedHash) : null,
                Instant.now());
    }

    private String integrityMessage(boolean valid, boolean storageReadable, boolean blockchainReadable) {
        if (valid) {
            return "Bệnh án toàn vẹn";
        }
        if (!blockchainReadable) {
            return "Không đọc được dữ liệu on-chain của bệnh án";
        }
        if (!storageReadable) {
            return "Không đọc hoặc giải mã được file bệnh án";
        }
        return "Bệnh án có dấu hiệu bị thay đổi";
    }

    private void verifyOnChain(
            MedicalFile file,
            String patientWallet,
            String uploaderWallet,
            BlockchainService.OnChainRecord onChain,
            BlockchainService.OnChainRecordMetadata metadata) {
        String expectedFacility = file.getHealthcareFacility() == null
                ? ""
                : file.getHealthcareFacility().getFacilityId();
        boolean valid = file.getCid().equals(onChain.cid())
                && normalizeHash(file.getContentHash()).equals(normalizeHash(onChain.contentHash()))
                && patientWallet.equalsIgnoreCase(onChain.patientWallet())
                && uploaderWallet.equalsIgnoreCase(onChain.authorWallet())
                && file.getSourceType().name().equals(metadata.sourceType())
                && uploaderWallet.equalsIgnoreCase(metadata.uploaderWallet())
                && expectedFacility.equalsIgnoreCase(metadata.facilityId());
        if (!valid) {
            throw new ApplicationException(ErrorCode.CONFLICT, "On-chain record metadata does not match the upload");
        }
    }

    private PendingRecordUploadResponse pending(MedicalFile file, String patientWallet, String uploaderWallet) {
        return new PendingRecordUploadResponse(
                file.getId(), file.getCid(), file.getContentHash(), file.getSourceType(), patientWallet,
                uploaderWallet,
                file.getHealthcareFacility() == null ? null : file.getHealthcareFacility().getFacilityId());
    }

    private UnifiedMedicalRecordResponse response(MedicalRecord record) {
        MedicalFile file = recordFiles.findAllByMedicalRecordId(record.getId()).stream()
                .findFirst().map(MedicalRecordFile::getMedicalFile).orElse(null);
        return new UnifiedMedicalRecordResponse(
                record.getId(),
                record.getPatientProfile().getId(),
                file == null ? null : file.getId(),
                file == null ? record.getTitle() : file.getOriginalFilename(),
                file == null ? record.getRecordType() : file.getContentType(),
                file == null ? 0 : file.getOriginalSize(),
                record.getCid(), record.getContentHash(), record.getSourceType(),
                record.getUploadedBy() == null ? null : record.getUploadedBy().getFullName(),
                record.getUploadedByWallet(),
                record.getHealthcareFacility() == null ? null : record.getHealthcareFacility().getFacilityId(),
                record.getHealthcareFacility() == null ? null : record.getHealthcareFacility().getName(),
                record.getOnChainRecordId(), record.getBlockchainTxHash(), record.getStatus(),
                record.getPreviousRecord() == null ? null : record.getPreviousRecord().getId(),
                record.getSuccessorRecord() == null ? null : record.getSuccessorRecord().getId(),
                record.getCorrectionReason(), record.getCorrectedAt(), record.getCreatedAt());
    }

    private RecordAuditLogResponse auditResponse(RecordAccessLog log) {
        MedicalRecord record = log.getMedicalRecord();
        MedicalFile file = log.getMedicalFile() != null ? log.getMedicalFile() : primaryFile(record);
        Optional<EmergencyAccessResponse> emergency = emergencyContext(log, record);
        var facility = emergency.isPresent()
                ? null
                : record != null && record.getHealthcareFacility() != null
                ? record.getHealthcareFacility()
                : file == null ? null : file.getHealthcareFacility();
        String facilityId = emergency.map(EmergencyAccessResponse::facilityId)
                .orElse(facility == null ? null : facility.getFacilityId());
        String facilityName = emergency.map(EmergencyAccessResponse::facilityName)
                .orElse(facility == null ? null : facility.getName());
        return new RecordAuditLogResponse(
                log.getId(),
                record == null ? null : record.getId(),
                file == null ? null : file.getId(),
                file == null ? null : file.getOriginalFilename(),
                log.getAction(),
                log.getActor().getFullName(),
                log.getActor().getRoles().stream()
                        .map(role -> role.getName().name())
                        .sorted()
                        .toList(),
                facilityId,
                facilityName,
                emergency.map(EmergencyAccessResponse::id).orElse(null),
                emergency.map(EmergencyAccessResponse::caseCode).orElse(null),
                emergency.map(EmergencyAccessResponse::reason).orElse(null),
                emergency.map(EmergencyAccessResponse::doctorName).orElse(null),
                emergency.map(EmergencyAccessResponse::facilityId).orElse(null),
                emergency.map(EmergencyAccessResponse::facilityName).orElse(null),
                emergency.map(EmergencyAccessResponse::createdAt).orElse(null),
                emergency.map(EmergencyAccessResponse::expiresAt).orElse(null),
                emergency.map(EmergencyAccessResponse::active).orElse(null),
                log.getCreatedAt());
    }

    private Optional<EmergencyAccessResponse> emergencyContext(RecordAccessLog log, MedicalRecord record) {
        if (record == null || !log.getAction().startsWith("EMERGENCY_")) {
            return Optional.empty();
        }
        return access.emergencyAccessContextForAudit(
                log.getActor().getId(),
                record.getPatientProfile().getId(),
                log.getCreatedAt());
    }

    private MedicalFile primaryFile(MedicalRecord record) {
        if (record == null || record.getId() == null) {
            return null;
        }
        return recordFiles.findAllByMedicalRecordId(record.getId()).stream()
                .findFirst()
                .map(MedicalRecordFile::getMedicalFile)
                .orElse(null);
    }

    private PatientProfile requirePatientUser(Long userId) {
        return patients.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
    }

    private DoctorProfile requireDoctor(Long userId) {
        DoctorProfile doctor = doctors.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        if (!doctor.isVerified() || doctor.getHealthcareFacility() == null
                || !doctor.getHealthcareFacility().isActive()) {
            throw new AccessDeniedException("Verified doctor with active facility is required");
        }
        return doctor;
    }

    private User requireUser(Long userId) {
        return users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private WalletAddress requireWallet(Long userId) {
        return wallets.findFirstByUserIdOrderByIdAsc(userId)
                .orElseThrow(() -> new AccessDeniedException("A verified wallet is required"));
    }

    private int safeSize(int size) {
        return Math.max(1, Math.min(size, 50));
    }

    private String normalizeHash(String hash) {
        String normalized = hash == null ? "" : hash.toLowerCase(Locale.ROOT);
        return normalized.startsWith("0x") ? normalized.substring(2) : normalized;
    }

    private MedicalRecord requireActiveRecord(Long recordId) {
        MedicalRecord record = records.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
        ensureActive(record);
        return record;
    }

    private void ensureActive(MedicalRecord record) {
        if (record.getStatus() != com.blockchain.emr.medicalrecord.domain.MedicalRecordStatus.ACTIVE
                || record.getSuccessorRecord() != null) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Medical record is not the active version");
        }
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<UnifiedMedicalRecordResponse> adminRecordAudit(int page, int size) {
        return PageResponse.from(records.findAll(
                        PageRequest.of(Math.max(page, 0), safeSize(size), Sort.by("createdAt").descending()))
                .map(this::response));
    }

    private boolean equalsIgnoreCase(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }
}
