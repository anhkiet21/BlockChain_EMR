package com.blockchain.emr.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.blockchain.emr.integration.storage.domain.StorageService;
import com.blockchain.emr.integration.storage.domain.StorageException;
import com.blockchain.emr.medicalrecord.application.OrphanMedicalFileCleanupService;
import com.blockchain.emr.medicalrecord.domain.MedicalFile;
import com.blockchain.emr.medicalrecord.infrastructure.MedicalFileRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MedicalFileFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MedicalFileRepository medicalFileRepository;

    @Autowired
    private StorageService storageService;

    @Test
    void patientUploadsEncryptedFileAndOnlyOwnerCanDownloadIt() throws Exception {
        String ownerToken = registerPatient("owner");
        createPatientProfile(ownerToken);
        String otherToken = registerPatient("other");
        createPatientProfile(otherToken);
        byte[] plaintext = """
                {"diagnosis":"encrypted integration test"}
                """.getBytes(StandardCharsets.UTF_8);

        MvcResult uploadResult = mockMvc.perform(multipart("/medical-files/me")
                        .file(new MockMultipartFile(
                                "file",
                                "record.json",
                                MediaType.APPLICATION_JSON_VALUE,
                                plaintext))
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.originalFilename").value("record.json"))
                .andExpect(jsonPath("$.data.contentType").value(MediaType.APPLICATION_JSON_VALUE))
                .andExpect(jsonPath("$.data.cid").doesNotExist())
                .andExpect(jsonPath("$.data.encryptionIv").doesNotExist())
                .andExpect(jsonPath("$.data.contentHash").doesNotExist())
                .andReturn();
        long fileId = read(uploadResult).at("/data/id").asLong();

        MedicalFile storedMetadata = medicalFileRepository.findById(fileId).orElseThrow();
        assertThat(storageService.retrieve(storedMetadata.getCid())).isNotEqualTo(plaintext);
        assertThat(storedMetadata.getEncryptionAlgorithm()).isEqualTo("AES-256-GCM");

        mockMvc.perform(get("/medical-files/me").header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1));

        mockMvc.perform(get("/medical-files/{fileId}/content", fileId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(content().bytes(plaintext));

        mockMvc.perform(get("/medical-files/{fileId}/content", fileId)
                        .header("Authorization", bearer(otherToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void rejectsUnsupportedAndUnauthenticatedUploads() throws Exception {
        String patientToken = registerPatient("invalid-file");
        createPatientProfile(patientToken);
        MockMultipartFile executable = new MockMultipartFile(
                "file",
                "malware.exe",
                MediaType.APPLICATION_OCTET_STREAM_VALUE,
                new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/medical-files/me")
                        .file(executable)
                        .header("Authorization", bearer(patientToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));

        MockMultipartFile spoofedJson = new MockMultipartFile(
                "file",
                "spoofed.json",
                MediaType.APPLICATION_JSON_VALUE,
                new byte[] {1, 2, 3});
        mockMvc.perform(multipart("/medical-files/me")
                        .file(spoofedJson)
                        .header("Authorization", bearer(patientToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));

        mockMvc.perform(multipart("/medical-files/me").file(executable))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/medical-files/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cleanupDeletesOnlyUnattachedEncryptedFilesAfterRetention() throws Exception {
        String patientToken = registerPatient("orphan-file");
        createPatientProfile(patientToken);
        MvcResult upload = mockMvc.perform(multipart("/medical-files/me")
                        .file(new MockMultipartFile("file", "orphan.json", MediaType.APPLICATION_JSON_VALUE,
                                "{\"orphan\":true}".getBytes(StandardCharsets.UTF_8)))
                        .header("Authorization", bearer(patientToken)))
                .andExpect(status().isOk())
                .andReturn();
        long fileId = read(upload).at("/data/id").asLong();
        String cid = medicalFileRepository.findById(fileId).orElseThrow().getCid();

        new OrphanMedicalFileCleanupService(medicalFileRepository, storageService, Duration.ofHours(-1), 10).cleanup();

        assertThat(medicalFileRepository.findById(fileId)).isEmpty();
        assertThatThrownBy(() -> storageService.retrieve(cid)).isInstanceOf(StorageException.class);
    }

    private String registerPatient(String prefix) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email":"%s",
                                  "password":"password123",
                                  "fullName":"Medical File Test",
                                  "role":"PATIENT"
                                }
                                """.formatted(prefix + "-" + UUID.randomUUID() + "@example.com")))
                .andExpect(status().isOk())
                .andReturn();
        return read(result).at("/data/accessToken").asText();
    }

    private void createPatientProfile(String token) throws Exception {
        mockMvc.perform(put("/patients/me")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Medical File Test"}
                                """))
                .andExpect(status().isOk());
    }

    private JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsByteArray());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
