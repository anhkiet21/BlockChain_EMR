package com.blockchain.emr.medicalrecord;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigInteger;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.infrastructure.UserRepository;
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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class RecordAuditLogApiTests {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PatientProfileRepository patients;
    @Autowired MedicalFileRepository files;
    @Autowired MedicalRecordRepository records;
    @Autowired MedicalRecordFileRepository recordFiles;
    @Autowired RecordAccessLogRepository logs;

    @Test
    void patientCanReadOwnRecordAuditButOtherPatientIsDenied() throws Exception {
        Account owner = patient("owner");
        Account other = patient("other");
        MedicalRecord record = recordFor(owner);

        mvc.perform(get("/patient/records/{recordId}/audit-logs", record.getId())
                        .header("Authorization", bearer(owner.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].action").value("DOWNLOAD"))
                .andExpect(jsonPath("$.data[0].actorName").value(owner.user().getFullName()))
                .andExpect(jsonPath("$.data[0].medicalFileName").value("audit.json"))
                .andExpect(jsonPath("$.data[1].action").value("CREATE"));

        mvc.perform(get("/patient/records/{recordId}/audit-logs", record.getId())
                        .header("Authorization", bearer(other.token())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    private Account patient(String prefix) throws Exception {
        String email = UUID.randomUUID() + "-" + prefix + "@patient.test";
        MvcResult result = mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"password123","fullName":"%s Patient","role":"PATIENT"}
                """.formatted(email, prefix))).andExpect(status().isOk()).andReturn();
        String token = read(result).at("/data/accessToken").asText();
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        PatientProfile profile = patients.save(new PatientProfile(user));
        return new Account(token, user, profile);
    }

    private MedicalRecord recordFor(Account account) {
        String unique = UUID.randomUUID().toString().replace("-", "");
        MedicalFile file = files.save(new MedicalFile(
                account.profile(),
                account.user(),
                "bafy-" + unique,
                "audit.json",
                MediaType.APPLICATION_JSON_VALUE,
                42,
                "a".repeat(64),
                "b".repeat(24),
                "AES-256-GCM",
                "kubo"));
        file.assignSource(MedicalRecordSourceType.PATIENT_UPLOADED, "0x" + "1".repeat(40), null);
        file = files.save(file);
        MedicalRecord record = records.save(new MedicalRecord(
                account.profile(),
                null,
                account.user(),
                MedicalRecordSourceType.PATIENT_UPLOADED,
                null,
                "0x" + "1".repeat(40),
                "audit.json",
                "APPLICATION_JSON",
                file.getCid(),
                file.getContentHash(),
                BigInteger.valueOf(System.nanoTime()).abs(),
                "0x" + unique + "0".repeat(64 - unique.length())));
        recordFiles.save(new MedicalRecordFile(record, file));
        logs.save(new RecordAccessLog(record, file, account.user(), "CREATE"));
        logs.save(new RecordAccessLog(record, file, account.user(), "DOWNLOAD"));
        return record;
    }

    private JsonNode read(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsByteArray());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private record Account(String token, User user, PatientProfile profile) {}
}
