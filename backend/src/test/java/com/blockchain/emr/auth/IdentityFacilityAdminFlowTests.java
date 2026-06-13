package com.blockchain.emr.auth;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class IdentityFacilityAdminFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository users;

    @Autowired
    private WalletAddressRepository wallets;

    @Test
    void exposesSeededFacilitiesWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/facilities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[?(@.facilityId == 'BV001')]").exists())
                .andExpect(jsonPath("$.data[0].id").doesNotExist())
                .andExpect(jsonPath("$.data[0].active").doesNotExist());
    }

    @Test
    void registersPatientAndLogsInWithIdentityNumber() throws Exception {
        String identityNumber = uniqueIdentity();
        JsonNode registration = registerPatient(identityNumber);
        String accessToken = registration.at("/data/accessToken").asText();

        org.assertj.core.api.Assertions.assertThat(registration.at("/data/user/email").isNull()).isTrue();
        org.assertj.core.api.Assertions.assertThat(registration.at("/data/user/identityNumberMasked").asText())
                .endsWith(identityNumber.substring(identityNumber.length() - 4).toUpperCase());

        mockMvc.perform(get("/patients/me").header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName").value("Patient Identity Test"))
                .andExpect(jsonPath("$.data.dateOfBirth").value("1995-06-15"))
                .andExpect(jsonPath("$.data.phone").value("+84901234567"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"identityNumber":"%s","password":"password123"}
                                """.formatted(identityNumber)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.roles[0]").value("PATIENT"));

        mockMvc.perform(post("/auth/register/patient")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patientJson(identityNumber)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("IDENTITY_NUMBER_ALREADY_EXISTS"));
    }

    @Test
    void registersPendingDoctorAndAdminVerifiesDoctor() throws Exception {
        String identityNumber = uniqueIdentity();
        JsonNode registration = registerDoctor(identityNumber, "BV001");
        String doctorToken = registration.at("/data/accessToken").asText();

        MvcResult profileResult = mockMvc.perform(get("/doctors/me")
                        .header("Authorization", bearer(doctorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("PENDING_VERIFICATION"))
                .andExpect(jsonPath("$.data.verified").value(false))
                .andExpect(jsonPath("$.data.facility.facilityId").value("BV001"))
                .andReturn();
        long doctorProfileId = read(profileResult).at("/data/id").asLong();
        long doctorUserId = registration.at("/data/user/id").asLong();

        mockMvc.perform(get("/admin/doctors/pending")
                        .header("Authorization", bearer(doctorToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/admin/doctors/pending").with(user(adminPrincipal())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[?(@.id == %s)]".formatted(doctorProfileId)).exists());

        mockMvc.perform(post("/admin/doctors/{id}/verify", doctorProfileId)
                        .with(user(adminPrincipal())))
                .andExpect(status().isConflict());

        wallets.save(new WalletAddress(
                users.findById(doctorUserId).orElseThrow(),
                "0x" + UUID.randomUUID().toString().replace("-", "") + "12345678"));

        mockMvc.perform(post("/admin/doctors/{id}/verify", doctorProfileId)
                        .with(user(adminPrincipal())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.data.verified").value(true));
    }

    @Test
    void rejectsUnknownFacilityAndAdminCanRejectAndLockDoctor() throws Exception {
        String invalidIdentity = uniqueIdentity();
        mockMvc.perform(post("/auth/register/doctor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(doctorJson(invalidIdentity, "UNKNOWN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_FACILITY"));

        String identityNumber = uniqueIdentity();
        JsonNode registration = registerDoctor(identityNumber, "PK001");
        String doctorToken = registration.at("/data/accessToken").asText();
        long userId = registration.at("/data/user/id").asLong();
        MvcResult profileResult = mockMvc.perform(get("/doctors/me")
                        .header("Authorization", bearer(doctorToken)))
                .andExpect(status().isOk())
                .andReturn();
        long doctorProfileId = read(profileResult).at("/data/id").asLong();

        mockMvc.perform(post("/admin/doctors/{id}/reject", doctorProfileId)
                        .with(user(adminPrincipal())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("REJECTED"));

        mockMvc.perform(post("/admin/users/{id}/lock", userId)
                        .with(user(adminPrincipal())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("LOCKED"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"identityNumber":"%s","password":"password123"}
                                """.formatted(identityNumber)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));

        mockMvc.perform(post("/admin/users/{id}/unlock", userId)
                        .with(user(adminPrincipal())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"identityNumber":"%s","password":"password123"}
                                """.formatted(identityNumber)))
                .andExpect(status().isOk());
    }

    private JsonNode registerPatient(String identityNumber) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/register/patient")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patientJson(identityNumber)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.user.wallets.length()").value(0))
                .andReturn();
        return read(result);
    }

    private JsonNode registerDoctor(String identityNumber, String facilityId) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/register/doctor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(doctorJson(identityNumber, facilityId)))
                .andExpect(status().isOk())
                .andReturn();
        return read(result);
    }

    private String patientJson(String identityNumber) {
        return """
                {
                  "identityNumber":"%s",
                  "password":"password123",
                  "fullName":"Patient Identity Test",
                  "dateOfBirth":"1995-06-15",
                  "gender":"MALE",
                  "phoneNumber":"+84901234567",
                  "address":"Ho Chi Minh City"
                }
                """.formatted(identityNumber);
    }

    private String doctorJson(String identityNumber, String facilityId) {
        return """
                {
                  "identityNumber":"%s",
                  "password":"password123",
                  "fullName":"Doctor Identity Test",
                  "dateOfBirth":"1985-03-20",
                  "gender":"FEMALE",
                  "phoneNumber":"+84901112223",
                  "licenseNumber":"LIC-%s",
                  "facilityId":"%s"
                }
                """.formatted(identityNumber, UUID.randomUUID(), facilityId);
    }

    private AuthenticatedUser adminPrincipal() {
        return new AuthenticatedUser(
                999999L,
                "admin@test.local",
                null,
                "unused",
                true,
                Set.of("ADMIN"));
    }

    private JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsByteArray());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String uniqueIdentity() {
        return UUID.randomUUID().toString();
    }
}
