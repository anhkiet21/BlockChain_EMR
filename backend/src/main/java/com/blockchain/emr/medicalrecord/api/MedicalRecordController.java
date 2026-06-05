package com.blockchain.emr.medicalrecord.api;

import java.nio.charset.StandardCharsets;

import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.medicalrecord.api.dto.*;
import com.blockchain.emr.medicalrecord.application.MedicalFileService;
import com.blockchain.emr.medicalrecord.application.MedicalRecordService;

@RestController
@RequestMapping("/medical-records")
@PreAuthorize("hasRole('DOCTOR')")
public class MedicalRecordController {
    private final MedicalRecordService service;
    public MedicalRecordController(MedicalRecordService service) { this.service = service; }

    @PostMapping(path = "/patients/{patientId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<MedicalRecordFileUploadResponse> upload(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long patientId, @RequestParam String patientWallet, @RequestParam String doctorWallet,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.success(service.upload(user.id(), patientId, patientWallet, doctorWallet, file));
    }

    @PostMapping
    ApiResponse<MedicalRecordResponse> create(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody CreateMedicalRecordRequest request) {
        return ApiResponse.success(service.create(user.id(), request));
    }

    @PostMapping(path = "/{recordId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<MedicalRecordFileUploadResponse> addFile(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long recordId, @RequestParam String patientWallet, @RequestParam String doctorWallet,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.success(service.addFile(user.id(), recordId, patientWallet, doctorWallet, file));
    }

    @GetMapping
    ApiResponse<PageResponse<MedicalRecordResponse>> list(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam Long patientProfileId, @RequestParam String patientWallet, @RequestParam String doctorWallet,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(service.list(user.id(), patientProfileId, patientWallet, doctorWallet, page, size));
    }

    @GetMapping("/{recordId}")
    ApiResponse<MedicalRecordResponse> detail(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long recordId, @RequestParam String patientWallet, @RequestParam String doctorWallet) {
        return ApiResponse.success(service.detail(user.id(), recordId, patientWallet, doctorWallet));
    }

    @GetMapping("/{recordId}/files/{fileId}/content")
    ResponseEntity<byte[]> download(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long recordId,
            @PathVariable Long fileId, @RequestParam String patientWallet, @RequestParam String doctorWallet) {
        MedicalFileService.DownloadedMedicalFile file =
                service.download(user.id(), recordId, fileId, patientWallet, doctorWallet);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.filename(), StandardCharsets.UTF_8).build().toString())
                .body(file.content());
    }
}
