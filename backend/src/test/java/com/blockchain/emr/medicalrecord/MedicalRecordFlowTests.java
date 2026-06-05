package com.blockchain.emr.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.blockchain.emr.accesscontrol.*;
import com.blockchain.emr.auth.domain.*;
import com.blockchain.emr.auth.infrastructure.*;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.medicalrecord.infrastructure.RecordAccessLogRepository;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;
import com.fasterxml.jackson.databind.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MedicalRecordFlowTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PatientProfileRepository patients;
    @Autowired DoctorProfileRepository doctors;
    @Autowired WalletAddressRepository wallets;
    @Autowired AccessGrantRepository grants;
    @Autowired RecordAccessLogRepository logs;
    @MockitoBean BlockchainService blockchain;

    @Test
    void doctorCompletesRecordFlowWithDualAuthorizationAndAudit() throws Exception {
        Setup setup = setup(true);
        when(blockchain.hasAccess(setup.patientWallet(), setup.doctorWallet())).thenReturn(true);

        MvcResult upload = mvc.perform(multipart("/medical-records/patients/{id}/files", setup.patientId())
                        .file(new MockMultipartFile("file", "diagnosis.json", MediaType.APPLICATION_JSON_VALUE,
                                "{\"diagnosis\":\"encrypted\"}".getBytes(StandardCharsets.UTF_8)))
                        .header("Authorization", bearer(setup.doctorToken()))
                        .param("patientWallet", setup.patientWallet()).param("doctorWallet", setup.doctorWallet()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.cid").isNotEmpty()).andReturn();
        long fileId = read(upload).at("/data/fileId").asLong();
        String cid = read(upload).at("/data/cid").asText();
        when(blockchain.getRecord(BigInteger.ZERO, setup.doctorWallet())).thenReturn(new BlockchainService.OnChainRecord(
                BigInteger.ZERO, cid, setup.patientWallet(), setup.doctorWallet(), Instant.now()));

        MvcResult created = mvc.perform(post("/medical-records").header("Authorization", bearer(setup.doctorToken()))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"patientProfileId":%d,"title":"Visit","recordType":"DIAGNOSIS","medicalFileId":%d,
                                 "onChainRecordId":0,"patientWallet":"%s","doctorWallet":"%s"}
                                """.formatted(setup.patientId(), fileId, setup.patientWallet(), setup.doctorWallet())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.files[0].id").value(fileId)).andReturn();
        long recordId = read(created).at("/data/id").asLong();

        mvc.perform(multipart("/medical-records/{id}/files", recordId)
                        .file(new MockMultipartFile("file", "scan.json", MediaType.APPLICATION_JSON_VALUE,
                                "{\"scan\":\"encrypted\"}".getBytes(StandardCharsets.UTF_8)))
                        .header("Authorization", bearer(setup.doctorToken()))
                        .param("patientWallet", setup.patientWallet()).param("doctorWallet", setup.doctorWallet()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.fileId").isNumber());

        mvc.perform(get("/medical-records").header("Authorization", bearer(setup.doctorToken()))
                        .param("patientProfileId", String.valueOf(setup.patientId()))
                        .param("patientWallet", setup.patientWallet()).param("doctorWallet", setup.doctorWallet()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(1));
        mvc.perform(get("/medical-records/{id}", recordId).header("Authorization", bearer(setup.doctorToken()))
                        .param("patientWallet", setup.patientWallet()).param("doctorWallet", setup.doctorWallet()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.title").value("Visit"));
        mvc.perform(get("/medical-records/{id}/files/{fileId}/content", recordId, fileId)
                        .header("Authorization", bearer(setup.doctorToken()))
                        .param("patientWallet", setup.patientWallet()).param("doctorWallet", setup.doctorWallet()))
                .andExpect(status().isOk());

        assertThat(logs.countByMedicalRecordIdAndAction(recordId, "CREATE")).isEqualTo(1);
        assertThat(logs.countByMedicalRecordIdAndAction(recordId, "VIEW")).isEqualTo(2);
        assertThat(logs.countByMedicalRecordIdAndAction(recordId, "DOWNLOAD")).isEqualTo(1);
        assertThat(logs.countByMedicalRecordIdAndAction(recordId, "EDIT")).isEqualTo(1);
    }

    @Test
    void deniesMissingApplicationGrantRevokedChainWrongRoleAndNoToken() throws Exception {
        Setup setup = setup(false);
        when(blockchain.hasAccess(setup.patientWallet(), setup.doctorWallet())).thenReturn(true);
        mvc.perform(get("/medical-records").header("Authorization", bearer(setup.doctorToken()))
                        .param("patientProfileId", String.valueOf(setup.patientId()))
                        .param("patientWallet", setup.patientWallet()).param("doctorWallet", setup.doctorWallet()))
                .andExpect(status().isForbidden());

        grants.save(new AccessGrant(patients.findById(setup.patientId()).orElseThrow(),
                doctors.findByUserId(setup.doctorUserId()).orElseThrow()));
        when(blockchain.hasAccess(setup.patientWallet(), setup.doctorWallet())).thenReturn(false);
        mvc.perform(get("/medical-records").header("Authorization", bearer(setup.doctorToken()))
                        .param("patientProfileId", String.valueOf(setup.patientId()))
                        .param("patientWallet", setup.patientWallet()).param("doctorWallet", setup.doctorWallet()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/medical-records")).andExpect(status().isUnauthorized());
        mvc.perform(get("/medical-records").header("Authorization", bearer(setup.patientToken())))
                .andExpect(status().isForbidden());
    }

    private Setup setup(boolean grant) throws Exception {
        String patientEmail = UUID.randomUUID() + "@patient.test";
        String doctorEmail = UUID.randomUUID() + "@doctor.test";
        String patientToken = register(patientEmail, "PATIENT");
        String doctorToken = register(doctorEmail, "DOCTOR");
        User patientUser = users.findByEmailIgnoreCase(patientEmail).orElseThrow();
        User doctorUser = users.findByEmailIgnoreCase(doctorEmail).orElseThrow();
        PatientProfile patient = patients.save(new PatientProfile(patientUser));
        DoctorProfile doctor = new DoctorProfile(doctorUser, "LIC-" + UUID.randomUUID(), "General");
        doctor.setVerified(true);
        doctors.save(doctor);
        String patientWallet = randomWallet();
        String doctorWallet = randomWallet();
        wallets.save(new WalletAddress(patientUser, patientWallet));
        wallets.save(new WalletAddress(doctorUser, doctorWallet));
        if (grant) grants.save(new AccessGrant(patient, doctor));
        return new Setup(patient.getId(), doctorUser.getId(), patientToken, doctorToken, patientWallet, doctorWallet);
    }

    private String register(String email, String role) throws Exception {
        MvcResult result = mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"password123","fullName":"Test","role":"%s"}
                """.formatted(email, role))).andExpect(status().isOk()).andReturn();
        return read(result).at("/data/accessToken").asText();
    }
    private JsonNode read(MvcResult result) throws Exception { return json.readTree(result.getResponse().getContentAsByteArray()); }
    private String bearer(String token) { return "Bearer " + token; }
    private String randomWallet() { return "0x" + UUID.randomUUID().toString().replace("-", "") + "12345678"; }
    private record Setup(Long patientId, Long doctorUserId, String patientToken, String doctorToken,
            String patientWallet, String doctorWallet) {}
}
