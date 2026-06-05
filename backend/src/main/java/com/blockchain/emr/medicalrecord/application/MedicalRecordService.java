package com.blockchain.emr.medicalrecord.application;

import java.math.BigInteger;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.medicalrecord.api.dto.*;
import com.blockchain.emr.medicalrecord.domain.*;
import com.blockchain.emr.medicalrecord.infrastructure.*;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

@Service
public class MedicalRecordService {
    private final MedicalRecordRepository records;
    private final MedicalRecordFileRepository recordFiles;
    private final MedicalFileRepository files;
    private final RecordAccessLogRepository logs;
    private final DoctorProfileRepository doctors;
    private final PatientProfileRepository patients;
    private final UserRepository users;
    private final MedicalFileService fileService;
    private final MedicalRecordAuthorizationService authorization;
    private final BlockchainService blockchain;

    public MedicalRecordService(MedicalRecordRepository records, MedicalRecordFileRepository recordFiles,
            MedicalFileRepository files, RecordAccessLogRepository logs, DoctorProfileRepository doctors,
            PatientProfileRepository patients, UserRepository users, MedicalFileService fileService,
            MedicalRecordAuthorizationService authorization, BlockchainService blockchain) {
        this.records = records; this.recordFiles = recordFiles; this.files = files; this.logs = logs;
        this.doctors = doctors; this.patients = patients; this.users = users; this.fileService = fileService;
        this.authorization = authorization; this.blockchain = blockchain;
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public MedicalRecordFileUploadResponse upload(Long userId, Long patientId, String patientWallet,
            String doctorWallet, MultipartFile multipart) {
        Context context = context(userId, patientId, patientWallet, doctorWallet);
        MedicalFile file = fileService.storeForPatient(context.patient(), context.actor(), multipart);
        logs.save(new RecordAccessLog(null, file, context.actor(), "UPLOAD"));
        return new MedicalRecordFileUploadResponse(file.getId(), file.getCid(), file.getContentHash());
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public MedicalRecordResponse create(Long userId, CreateMedicalRecordRequest request) {
        Context context = context(userId, request.patientProfileId(), request.patientWallet(), request.doctorWallet());
        MedicalFile file = files.findById(request.medicalFileId())
                .orElseThrow(() -> new ResourceNotFoundException("Medical file not found"));
        if (!file.getPatientProfile().getId().equals(context.patient().getId())) {
            throw new AccessDeniedException("File does not belong to patient");
        }
        BlockchainService.OnChainRecord onChain = blockchain.getRecord(request.onChainRecordId(), request.doctorWallet());
        if (!onChain.cid().equals(file.getCid())
                || !onChain.patientWallet().equals(normalize(request.patientWallet()))
                || !onChain.authorWallet().equals(normalize(request.doctorWallet()))) {
            throw new ApplicationException(ErrorCode.CONFLICT, "On-chain record does not match uploaded file and wallets");
        }
        MedicalRecord record = records.save(new MedicalRecord(context.patient(), context.doctor(),
                request.title().trim(), request.recordType().trim().toUpperCase(Locale.ROOT), file.getCid(),
                file.getContentHash(), request.onChainRecordId()));
        recordFiles.save(new MedicalRecordFile(record, file));
        logs.save(new RecordAccessLog(record, file, context.actor(), "CREATE"));
        return response(record);
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public MedicalRecordFileUploadResponse addFile(Long userId, Long recordId, String patientWallet,
            String doctorWallet, MultipartFile multipart) {
        MedicalRecord record = find(recordId);
        Context context = context(userId, record.getPatientProfile().getId(), patientWallet, doctorWallet);
        verifyOnChainRecord(record, doctorWallet);
        MedicalFile file = fileService.storeForPatient(context.patient(), context.actor(), multipart);
        recordFiles.save(new MedicalRecordFile(record, file));
        logs.save(new RecordAccessLog(record, file, context.actor(), "EDIT"));
        return new MedicalRecordFileUploadResponse(file.getId(), file.getCid(), file.getContentHash());
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public PageResponse<MedicalRecordResponse> list(Long userId, Long patientId, String patientWallet,
            String doctorWallet, int page, int size) {
        Context context = context(userId, patientId, patientWallet, doctorWallet);
        var result = records.findByPatientProfileId(patientId, PageRequest.of(Math.max(page, 0),
                Math.max(1, Math.min(size, 50)), Sort.by("createdAt").descending()));
        result.forEach(record -> logs.save(new RecordAccessLog(record, null, context.actor(), "VIEW")));
        return PageResponse.from(result.map(this::response));
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public MedicalRecordResponse detail(Long userId, Long recordId, String patientWallet, String doctorWallet) {
        MedicalRecord record = find(recordId);
        Context context = context(userId, record.getPatientProfile().getId(), patientWallet, doctorWallet);
        verifyOnChainRecord(record, doctorWallet);
        logs.save(new RecordAccessLog(record, null, context.actor(), "VIEW"));
        return response(record);
    }

    @Transactional
    @PreAuthorize("hasRole('DOCTOR') and #userId == authentication.principal.id")
    public MedicalFileService.DownloadedMedicalFile download(Long userId, Long recordId, Long fileId,
            String patientWallet, String doctorWallet) {
        MedicalRecord record = find(recordId);
        Context context = context(userId, record.getPatientProfile().getId(), patientWallet, doctorWallet);
        verifyOnChainRecord(record, doctorWallet);
        MedicalFile file = recordFiles.findByMedicalRecordIdAndMedicalFileId(recordId, fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Record file not found")).getMedicalFile();
        logs.save(new RecordAccessLog(record, file, context.actor(), "DOWNLOAD"));
        return fileService.download(file);
    }

    private Context context(Long userId, Long patientId, String patientWallet, String doctorWallet) {
        DoctorProfile doctor = doctors.findByUserId(userId).orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found"));
        PatientProfile patient = patients.findById(patientId).orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
        User actor = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        authorization.requireDoctorAccess(doctor, patient, patientWallet, doctorWallet);
        return new Context(actor, doctor, patient);
    }

    private void verifyOnChainRecord(MedicalRecord record, String doctorWallet) {
        var onChain = blockchain.getRecord(record.getOnChainRecordId(), doctorWallet);
        if (!record.getCid().equals(onChain.cid())) throw new AccessDeniedException("On-chain CID verification failed");
    }

    private MedicalRecord find(Long id) {
        return records.findById(id).orElseThrow(() -> new ResourceNotFoundException("Medical record not found"));
    }

    private MedicalRecordResponse response(MedicalRecord record) {
        List<MedicalFileResponse> attached = recordFiles.findAllByMedicalRecordId(record.getId()).stream()
                .map(MedicalRecordFile::getMedicalFile).map(fileService::toResponse).toList();
        return new MedicalRecordResponse(record.getId(), record.getPatientProfile().getId(),
                record.getAuthorDoctorProfile().getId(), record.getTitle(), record.getRecordType(),
                record.getOnChainRecordId(), record.getCreatedAt(), attached);
    }

    private String normalize(String value) { return value.toLowerCase(Locale.ROOT); }
    private record Context(User actor, DoctorProfile doctor, PatientProfile patient) {}
}
