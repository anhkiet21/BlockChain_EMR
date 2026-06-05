package com.blockchain.emr.accesscontrol;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigInteger;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.blockchain.emr.auth.domain.*;
import com.blockchain.emr.auth.infrastructure.*;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService.*;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AccessControlFlowTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PatientProfileRepository patients;
    @Autowired DoctorProfileRepository doctors;
    @Autowired WalletAddressRepository wallets;
    @Autowired AccessGrantRepository grants;
    @Autowired AccessGrantHistoryRepository history;
    @MockitoBean BlockchainService blockchain;

    @Test
    void patientPreparesTransactionAndIdorIsDenied() throws Exception {
        Setup setup = setup();
        PreparedTransaction prepared = prepared(setup, true);
        when(blockchain.prepareAccessTransaction(setup.patientWallet(), setup.doctorWallet(), true)).thenReturn(prepared);

        mvc.perform(post("/access-control/transactions/prepare")
                        .header("Authorization", bearer(setup.patientToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(request(setup, true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.from").value(setup.patientWallet()))
                .andExpect(jsonPath("$.data.to").value(setup.contractAddress()))
                .andExpect(jsonPath("$.data.doctorProfileId").value(setup.doctorId()));

        mvc.perform(post("/access-control/transactions/prepare")
                        .contentType(MediaType.APPLICATION_JSON).content(request(setup, true)))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/access-control/transactions/prepare")
                        .header("Authorization", bearer(setup.doctorToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(request(setup, true)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/access-control/transactions/prepare")
                        .header("Authorization", bearer(setup.patientToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(setup.doctorId(), setup.otherPatientWallet(), setup.doctorWallet(), true)))
                .andExpect(status().isForbidden());
    }

    @Test
    void patientVerifiesGrantAndRevokeIdempotentlyAndReadsOwnHistory() throws Exception {
        Setup setup = setup();
        String grantHash = hash('a');
        String revokeHash = hash('b');
        mockTransaction(setup, grantHash, true);
        mockTransaction(setup, revokeHash, false);

        mvc.perform(post("/access-control/transactions/verify")
                        .header("Authorization", bearer(setup.patientToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(verifyRequest(setup, true, grantHash)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.active").value(true));
        mvc.perform(post("/access-control/transactions/verify")
                        .header("Authorization", bearer(setup.patientToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(verifyRequest(setup, true, grantHash)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.active").value(true));

        assertThat(grants.existsByPatientProfileIdAndDoctorProfileIdAndRevokedAtIsNull(
                setup.patientId(), setup.doctorId())).isTrue();
        assertThat(history.count()).isEqualTo(1);

        mvc.perform(post("/access-control/transactions/verify")
                        .header("Authorization", bearer(setup.patientToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(verifyRequest(setup, false, revokeHash)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.active").value(false));
        mvc.perform(get("/access-control/history").header("Authorization", bearer(setup.patientToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.content[0].granted").value(false));

        assertThat(grants.existsByPatientProfileIdAndDoctorProfileIdAndRevokedAtIsNull(
                setup.patientId(), setup.doctorId())).isFalse();
        assertThat(history.count()).isEqualTo(2);
    }

    @Test
    void rejectsPendingAndTamperedTransactions() throws Exception {
        Setup setup = setup();
        String pendingHash = hash('c');
        String tamperedHash = hash('d');
        PreparedTransaction expected = prepared(setup, true);
        when(blockchain.prepareAccessTransaction(setup.patientWallet(), setup.doctorWallet(), true)).thenReturn(expected);
        when(blockchain.getAccessTransaction(pendingHash)).thenReturn(new AccessTransaction(
                pendingHash, setup.patientWallet(), setup.contractAddress(), expected.data(),
                TransactionState.Status.PENDING, null, null, null));
        AccessEvent wrongEvent = new AccessEvent(tamperedHash, 0, BigInteger.TEN, setup.patientWallet(),
                setup.otherPatientWallet(), true, Instant.now());
        when(blockchain.getAccessTransaction(tamperedHash)).thenReturn(new AccessTransaction(
                tamperedHash, setup.patientWallet(), setup.contractAddress(), expected.data(),
                TransactionState.Status.SUCCESS, BigInteger.TEN, null, wrongEvent));

        mvc.perform(post("/access-control/transactions/verify")
                        .header("Authorization", bearer(setup.patientToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(verifyRequest(setup, true, pendingHash)))
                .andExpect(status().isConflict());
        mvc.perform(post("/access-control/transactions/verify")
                        .header("Authorization", bearer(setup.patientToken()))
                        .contentType(MediaType.APPLICATION_JSON).content(verifyRequest(setup, true, tamperedHash)))
                .andExpect(status().isForbidden());
        assertThat(history.count()).isZero();
    }

    private void mockTransaction(Setup setup, String hash, boolean granted) {
        PreparedTransaction prepared = prepared(setup, granted);
        AccessEvent event = new AccessEvent(hash, granted ? 0 : 1, BigInteger.TEN, setup.patientWallet(),
                setup.doctorWallet(), granted, Instant.now());
        when(blockchain.prepareAccessTransaction(setup.patientWallet(), setup.doctorWallet(), granted)).thenReturn(prepared);
        when(blockchain.getAccessTransaction(hash)).thenReturn(new AccessTransaction(
                hash, setup.patientWallet(), setup.contractAddress(), prepared.data(),
                TransactionState.Status.SUCCESS, BigInteger.TEN, null, event));
    }

    private Setup setup() throws Exception {
        String patientEmail = UUID.randomUUID() + "@patient.test";
        String otherEmail = UUID.randomUUID() + "@patient.test";
        String doctorEmail = UUID.randomUUID() + "@doctor.test";
        String patientToken = register(patientEmail, "PATIENT");
        register(otherEmail, "PATIENT");
        String doctorToken = register(doctorEmail, "DOCTOR");
        User patientUser = users.findByEmailIgnoreCase(patientEmail).orElseThrow();
        User otherUser = users.findByEmailIgnoreCase(otherEmail).orElseThrow();
        User doctorUser = users.findByEmailIgnoreCase(doctorEmail).orElseThrow();
        PatientProfile patient = patients.save(new PatientProfile(patientUser));
        patients.save(new PatientProfile(otherUser));
        DoctorProfile doctor = new DoctorProfile(doctorUser, "LIC-" + UUID.randomUUID(), "General");
        doctor.setVerified(true);
        doctors.save(doctor);
        String patientWallet = wallet();
        String otherPatientWallet = wallet();
        String doctorWallet = wallet();
        wallets.save(new WalletAddress(patientUser, patientWallet));
        wallets.save(new WalletAddress(otherUser, otherPatientWallet));
        wallets.save(new WalletAddress(doctorUser, doctorWallet));
        return new Setup(patient.getId(), doctor.getId(), patientToken, doctorToken, patientWallet,
                otherPatientWallet, doctorWallet, wallet());
    }

    private PreparedTransaction prepared(Setup setup, boolean granted) {
        return new PreparedTransaction(setup.patientWallet(), setup.contractAddress(),
                granted ? "0xgrant" : "0xrevoke", BigInteger.valueOf(31337), "0x0");
    }

    private String request(Setup setup, boolean granted) {
        return request(setup.doctorId(), setup.patientWallet(), setup.doctorWallet(), granted);
    }

    private String request(Long doctorId, String patientWallet, String doctorWallet, boolean granted) {
        return """
                {"doctorProfileId":%d,"patientWallet":"%s","doctorWallet":"%s","granted":%s}
                """.formatted(doctorId, patientWallet, doctorWallet, granted);
    }

    private String verifyRequest(Setup setup, boolean granted, String hash) {
        return """
                {"doctorProfileId":%d,"patientWallet":"%s","doctorWallet":"%s","granted":%s,"transactionHash":"%s"}
                """.formatted(setup.doctorId(), setup.patientWallet(), setup.doctorWallet(), granted, hash);
    }

    private String register(String email, String role) throws Exception {
        MvcResult result = mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"%s","password":"password123","fullName":"Test","role":"%s"}
                """.formatted(email, role))).andExpect(status().isOk()).andReturn();
        return read(result).at("/data/accessToken").asText();
    }

    private JsonNode read(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsByteArray());
    }

    private String bearer(String token) { return "Bearer " + token; }
    private String wallet() { return "0x" + UUID.randomUUID().toString().replace("-", "") + "12345678"; }
    private String hash(char value) { return "0x" + String.valueOf(value).repeat(64); }

    private record Setup(Long patientId, Long doctorId, String patientToken, String doctorToken, String patientWallet,
            String otherPatientWallet, String doctorWallet, String contractAddress) {}
}
