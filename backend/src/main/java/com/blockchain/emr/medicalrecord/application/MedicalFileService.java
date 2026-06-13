package com.blockchain.emr.medicalrecord.application;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
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
import com.blockchain.emr.integration.storage.domain.StorageService;
import com.blockchain.emr.integration.storage.domain.StoredObject;
import com.blockchain.emr.medicalrecord.api.dto.MedicalFileResponse;
import com.blockchain.emr.medicalrecord.domain.MedicalFile;
import com.blockchain.emr.medicalrecord.domain.MedicalRecordSourceType;
import com.blockchain.emr.facility.domain.HealthcareFacility;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalFileRepository;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class MedicalFileService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "application/json",
            "image/jpeg",
            "image/png");

    private final MedicalFileRepository medicalFileRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final FileEncryptionService encryptionService;
    private final ObjectMapper objectMapper;
    private final long maxFileSize;

    public MedicalFileService(
            MedicalFileRepository medicalFileRepository,
            PatientProfileRepository patientProfileRepository,
            UserRepository userRepository,
            StorageService storageService,
            FileEncryptionService encryptionService,
            ObjectMapper objectMapper,
            @Value("${app.storage.max-file-size-bytes:20971520}") long maxFileSize) {
        this.medicalFileRepository = medicalFileRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.encryptionService = encryptionService;
        this.objectMapper = objectMapper;
        this.maxFileSize = maxFileSize;
    }

    @Transactional
    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    public MedicalFileResponse uploadMine(Long userId, MultipartFile file) {
        PatientProfile patient = patientProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile not found"));
        User uploader = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toResponse(storeForPatient(patient, uploader, file));
    }

    public MedicalFile storeForPatient(PatientProfile patient, User uploader, MultipartFile file) {
        return storeForPatient(patient, uploader, file, null, null, null);
    }

    public MedicalFile storeForPatient(
            PatientProfile patient,
            User uploader,
            MultipartFile file,
            MedicalRecordSourceType sourceType,
            String uploaderWallet,
            HealthcareFacility facility) {
        validate(file);
        byte[] plaintext = read(file);
        validateContent(file.getContentType(), plaintext);
        String contentHash = sha256(plaintext);
        FileEncryptionService.EncryptedFile encrypted = encryptionService.encrypt(plaintext);
        StoredObject stored = storageService.store(encrypted.content(), UUID.randomUUID() + ".bin");
        MedicalFile medicalFile = new MedicalFile(
                patient,
                uploader,
                stored.cid(),
                safeFilename(file.getOriginalFilename()),
                file.getContentType(),
                file.getSize(),
                contentHash,
                encrypted.iv(),
                FileEncryptionService.ALGORITHM,
                storageService.provider());
        if (sourceType != null) {
            medicalFile.assignSource(sourceType, uploaderWallet, facility);
        }
        return medicalFileRepository.save(medicalFile);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    public PageResponse<MedicalFileResponse> listMine(Long userId, int page, int size) {
        return PageResponse.from(medicalFileRepository.findByPatientProfileUserId(
                userId,
                PageRequest.of(
                        Math.max(page, 0),
                        Math.max(1, Math.min(size, 50)),
                        Sort.by("createdAt").descending()))
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PATIENT') and #userId == authentication.principal.id")
    public DownloadedMedicalFile downloadMine(Long userId, Long fileId) {
        MedicalFile file = medicalFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical file not found"));
        if (!file.getPatientProfile().getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Medical file does not belong to current patient");
        }
        return download(file);
    }

    public DownloadedMedicalFile download(MedicalFile file) {
        byte[] plaintext = encryptionService.decrypt(storageService.retrieve(file.getCid()), file.getEncryptionIv());
        if (!sha256(plaintext).equals(file.getContentHash())) {
            throw new IllegalStateException("Medical file integrity check failed");
        }
        return new DownloadedMedicalFile(file.getOriginalFilename(), file.getContentType(), plaintext);
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Medical file is required");
        }
        if (file.getSize() > maxFileSize) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Medical file exceeds the configured size limit");
        }
        if (file.getContentType() == null || !ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Unsupported medical file type");
        }
    }

    private byte[] read(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (Exception exception) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Could not read medical file");
        }
    }

    private void validateContent(String contentType, byte[] content) {
        boolean valid = switch (contentType) {
            case "application/pdf" -> startsWith(content, new byte[] {'%', 'P', 'D', 'F', '-'});
            case "image/png" -> startsWith(content, new byte[] {
                    (byte) 0x89, 'P', 'N', 'G', '\r', '\n', (byte) 0x1a, '\n'});
            case "image/jpeg" -> startsWith(content, new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff});
            case "application/json" -> isValidJson(content);
            default -> false;
        };
        if (!valid) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Medical file content does not match its type");
        }
    }

    private boolean startsWith(byte[] content, byte[] signature) {
        if (content.length < signature.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if (content[index] != signature[index]) {
                return false;
            }
        }
        return true;
    }

    private boolean isValidJson(byte[] content) {
        try {
            return objectMapper.readTree(content) != null;
        } catch (Exception exception) {
            return false;
        }
    }

    private String safeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "medical-file";
        }
        String normalized = filename.replace('\\', '/');
        return normalized.substring(normalized.lastIndexOf('/') + 1);
    }

    private String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    public MedicalFileResponse toResponse(MedicalFile file) {
        return new MedicalFileResponse(
                file.getId(),
                file.getOriginalFilename(),
                file.getContentType(),
                file.getOriginalSize(),
                file.getStorageProvider(),
                file.getCreatedAt());
    }

    public record DownloadedMedicalFile(String filename, String contentType, byte[] content) {
    }
}
