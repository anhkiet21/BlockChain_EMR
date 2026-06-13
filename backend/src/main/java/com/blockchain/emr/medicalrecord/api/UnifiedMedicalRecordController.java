package com.blockchain.emr.medicalrecord.api;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.medicalrecord.api.dto.ConfirmRecordRequest;
import com.blockchain.emr.medicalrecord.api.dto.PendingRecordUploadResponse;
import com.blockchain.emr.medicalrecord.api.dto.RecordAuditLogResponse;
import com.blockchain.emr.medicalrecord.api.dto.UnifiedMedicalRecordResponse;
import com.blockchain.emr.medicalrecord.application.MedicalFileService;
import com.blockchain.emr.medicalrecord.application.UnifiedMedicalRecordService;

import jakarta.validation.Valid;

@RestController
public class UnifiedMedicalRecordController {
    private final UnifiedMedicalRecordService service;

    public UnifiedMedicalRecordController(UnifiedMedicalRecordService service) {
        this.service = service;
    }

    @PostMapping(path = "/patient/records", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<PendingRecordUploadResponse> patientUpload(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.success(service.uploadPatient(user.id(), file));
    }

    @PostMapping("/patient/records/confirm")
    ApiResponse<UnifiedMedicalRecordResponse> patientConfirm(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody ConfirmRecordRequest request) {
        return ApiResponse.success(service.confirm(user.id(), request));
    }

    @GetMapping("/patient/records")
    ApiResponse<PageResponse<UnifiedMedicalRecordResponse>> patientRecords(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.patientRecords(user.id(), page, size));
    }

    @GetMapping("/patient/records/{recordId}/audit-logs")
    ApiResponse<List<RecordAuditLogResponse>> patientAuditLogs(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long recordId) {
        return ApiResponse.success(service.patientAuditLogs(user.id(), recordId));
    }

    @PostMapping(path = "/doctor/records", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<PendingRecordUploadResponse> doctorUpload(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam Long patientId,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.success(service.uploadDoctor(user.id(), patientId, file));
    }

    @PostMapping("/doctor/records/confirm")
    ApiResponse<UnifiedMedicalRecordResponse> doctorConfirm(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody ConfirmRecordRequest request) {
        return ApiResponse.success(service.confirm(user.id(), request));
    }

    @GetMapping("/doctor/records")
    ApiResponse<PageResponse<UnifiedMedicalRecordResponse>> doctorRecords(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam Long patientId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.doctorRecords(user.id(), patientId, page, size));
    }

    @GetMapping({"/patient/records/{recordId}/content", "/doctor/records/{recordId}/content"})
    ResponseEntity<byte[]> download(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long recordId) {
        MedicalFileService.DownloadedMedicalFile file = service.download(user.id(), recordId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.filename(), StandardCharsets.UTF_8).build().toString())
                .body(file.content());
    }
}
