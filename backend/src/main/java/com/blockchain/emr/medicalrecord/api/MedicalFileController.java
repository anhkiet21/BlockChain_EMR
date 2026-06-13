package com.blockchain.emr.medicalrecord.api;

import java.nio.charset.StandardCharsets;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.api.PageResponse;
import com.blockchain.emr.medicalrecord.api.dto.MedicalFileResponse;
import com.blockchain.emr.medicalrecord.application.MedicalFileService;

@RestController
@RequestMapping("/medical-files")
public class MedicalFileController {

    private final MedicalFileService medicalFileService;

    public MedicalFileController(MedicalFileService medicalFileService) {
        this.medicalFileService = medicalFileService;
    }

    @PostMapping(path = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PATIENT')")
    ApiResponse<MedicalFileResponse> uploadMine(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.success(medicalFileService.uploadMine(user.id(), file));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    ApiResponse<PageResponse<MedicalFileResponse>> listMine(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(medicalFileService.listMine(user.id(), page, size));
    }

    @GetMapping("/{fileId}/content")
    @PreAuthorize("hasRole('PATIENT')")
    ResponseEntity<byte[]> downloadMine(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long fileId) {
        MedicalFileService.DownloadedMedicalFile file = medicalFileService.downloadMine(user.id(), fileId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(file.filename(), StandardCharsets.UTF_8)
                                .build()
                                .toString())
                .body(file.content());
    }
}
