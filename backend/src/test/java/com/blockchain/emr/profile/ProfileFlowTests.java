package com.blockchain.emr.profile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.auth.security.AuthenticatedUser;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProfileFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository users;

    @Autowired
    private WalletAddressRepository wallets;

    @Test
    void patientManagesOwnProfileAndDoctorCanSearchIt() throws Exception {
        String patientEmail = uniqueEmail("patient");
        String patientToken = register(patientEmail, "PATIENT");

        MvcResult patientResult = mockMvc.perform(put("/patients/me")
                        .header("Authorization", bearer(patientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Nguyen Van Patient",
                                  "dateOfBirth":"1995-06-15",
                                  "gender":"MALE",
                                  "phone":"+84901234567",
                                  "address":"Ho Chi Minh City",
                                  "emergencyContactName":"Family Member",
                                  "emergencyContactPhone":"+84907654321",
                                  "bloodType":"O+"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.patientCode").value(org.hamcrest.Matchers.startsWith("PAT-")))
                .andExpect(jsonPath("$.data.fullName").value("Nguyen Van Patient"))
                .andReturn();
        long profileId = read(patientResult).at("/data/id").asLong();

        mockMvc.perform(get("/patients/me").header("Authorization", bearer(patientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bloodType").value("O+"));

        mockMvc.perform(get("/patients").header("Authorization", bearer(patientToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        String doctorToken = registerDoctorWithFacility();
        MvcResult doctorProfileResult = createDoctorProfile(doctorToken);
        long doctorProfileId = read(doctorProfileResult).at("/data/id").asLong();
        long doctorUserId = read(doctorProfileResult).at("/data/userId").asLong();

        mockMvc.perform(get("/patients")
                        .header("Authorization", bearer(doctorToken))
                        .param("query", "Nguyen Van Patient"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        wallets.save(new WalletAddress(
                users.findById(doctorUserId).orElseThrow(),
                "0x" + UUID.randomUUID().toString().replace("-", "") + "12345678"));

        mockMvc.perform(post("/admin/doctors/{id}/verify", doctorProfileId)
                        .with(user(adminPrincipal())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verified").value(true));

        mockMvc.perform(get("/patients")
                        .header("Authorization", bearer(doctorToken))
                        .param("query", "Nguyen Van Patient"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].patientCode").isNotEmpty())
                .andExpect(jsonPath("$.data.content[0].email").doesNotExist())
                .andExpect(jsonPath("$.data.content[0].address").doesNotExist());

        mockMvc.perform(get("/patients")
                        .header("Authorization", bearer(doctorToken))
                        .param("query", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));

        mockMvc.perform(get("/patients")
                        .header("Authorization", bearer(doctorToken))
                        .param("query", "Ng")
                        .param("size", "1000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));

        mockMvc.perform(get("/patients/{id}", profileId)
                        .header("Authorization", bearer(doctorToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        mockMvc.perform(get("/patients/{id}", profileId)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.address").value("Ho Chi Minh City"));

        mockMvc.perform(get("/patients/{id}", profileId)
                        .header("Authorization", bearer(patientToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void doctorManagesProfessionalProfileAndReadsDepartments() throws Exception {
        String doctorToken = register(uniqueEmail("doctor-profile"), "DOCTOR");

        mockMvc.perform(get("/departments").header("Authorization", bearer(doctorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").isNumber());

        MvcResult result = createDoctorProfile(doctorToken);
        long profileId = read(result).at("/data/id").asLong();

        mockMvc.perform(get("/doctors/{id}", profileId)
                        .header("Authorization", bearer(doctorToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        mockMvc.perform(get("/doctors/{id}", profileId)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(profileId));

        mockMvc.perform(get("/doctors/me").header("Authorization", bearer(doctorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.specialization").value("Cardiology"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCreatesDepartment() throws Exception {
        String code = "DEPT-" + UUID.randomUUID().toString().substring(0, 8);
        mockMvc.perform(post("/departments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code":"%s",
                                  "name":"Test Department %s",
                                  "description":"Created by integration test"
                                }
                                """.formatted(code, code)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.code").value(code.toUpperCase()))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    void rejectsProfileOperationWithWrongRole() throws Exception {
        String doctorToken = register(uniqueEmail("wrong-role"), "DOCTOR");
        mockMvc.perform(put("/patients/me")
                        .header("Authorization", bearer(doctorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Wrong Role"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    void rejectsUnauthenticatedBusinessApis() throws Exception {
        mockMvc.perform(get("/departments"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/patients"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/doctors/1"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/patients/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"No Authentication"}
                                """))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/doctors/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"No Authentication",
                                  "licenseNumber":"NONE",
                                  "specialization":"None"
                                }
                                """))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/departments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"NONE","name":"None"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    private String register(String email, String role) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email":"%s",
                                  "password":"password123",
                                  "fullName":"Profile Test",
                                  "role":"%s"
                                }
                                """.formatted(email, role)))
                .andExpect(status().isOk())
                .andReturn();
        return read(result).at("/data/accessToken").asText();
    }

    private String registerDoctorWithFacility() throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/register/doctor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "identityNumber":"%s",
                                  "password":"password123",
                                  "fullName":"Profile Test",
                                  "dateOfBirth":"1985-03-20",
                                  "gender":"MALE",
                                  "phoneNumber":"+84901112223",
                                  "licenseNumber":"LIC-%s",
                                  "facilityId":"BV001"
                                }
                                """.formatted(UUID.randomUUID(), UUID.randomUUID())))
                .andExpect(status().isOk())
                .andReturn();
        return read(result).at("/data/accessToken").asText();
    }

    private MvcResult createDoctorProfile(String doctorToken) throws Exception {
        return mockMvc.perform(put("/doctors/me")
                        .header("Authorization", bearer(doctorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Doctor Test",
                                  "licenseNumber":"LIC-%s",
                                  "specialization":"Cardiology",
                                  "departmentId":2,
                                  "phone":"+84901112223",
                                  "biography":"Cardiology specialist"
                                }
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.doctorCode").value(org.hamcrest.Matchers.startsWith("DOC-")))
                .andExpect(jsonPath("$.data.department.code").value("CARDIOLOGY"))
                .andReturn();
    }

    private JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsByteArray());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.com";
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
}
