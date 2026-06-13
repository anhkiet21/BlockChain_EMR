package com.blockchain.emr.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void completesRegisterLoginMeAndRefreshRotation() throws Exception {
        String email = uniqueEmail();
        JsonNode registration = register(email, "PATIENT");
        String accessToken = registration.at("/data/accessToken").asText();
        String refreshToken = registration.at("/data/refreshToken").asText();

        mockMvc.perform(get("/auth/me").header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.roles[0]").value("PATIENT"));

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());

        MvcResult refreshResult = mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn();
        String rotatedToken = read(refreshResult).at("/data/refreshToken").asText();
        org.assertj.core.api.Assertions.assertThat(rotatedToken).isNotEqualTo(refreshToken);

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(refreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_TOKEN"));
    }

    @Test
    void rejectsDuplicateEmailAndAdminSelfRegistration() throws Exception {
        String email = uniqueEmail();
        register(email, "DOCTOR");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, "DOCTOR")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_EXISTS"));

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(uniqueEmail(), "ADMIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("ROLE_NOT_ALLOWED"));
    }

    @Test
    void linksWalletUsingPersonalSignAndRejectsNonceReuse() throws Exception {
        JsonNode registration = register(uniqueEmail(), "PATIENT");
        String accessToken = registration.at("/data/accessToken").asText();
        Credentials credentials = Credentials.create(Keys.createEcKeyPair());
        String address = credentials.getAddress();

        MvcResult nonceResult = mockMvc.perform(post("/auth/wallet/nonce")
                        .header("Authorization", bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"address":"%s"}
                                """.formatted(address)))
                .andExpect(status().isOk())
                .andReturn();
        String message = read(nonceResult).at("/data/message").asText();
        Sign.SignatureData signed = Sign.signPrefixedMessage(
                message.getBytes(StandardCharsets.UTF_8),
                credentials.getEcKeyPair());
        String signature = signatureHex(signed);

        String verifyBody = """
                {"address":"%s","signature":"%s"}
                """.formatted(address, signature);
        mockMvc.perform(post("/auth/wallet/verify")
                        .header("Authorization", bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verifyBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verified").value(true))
                .andExpect(jsonPath("$.data.address").value(address.toLowerCase()));

        mockMvc.perform(post("/auth/wallet/verify")
                        .header("Authorization", bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verifyBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("WALLET_VERIFICATION_FAILED"));

        mockMvc.perform(get("/auth/me").header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.wallets[0]").value(address.toLowerCase()));
    }

    @Test
    void protectsAuthenticatedEndpoints() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));

        mockMvc.perform(post("/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"anything"}
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/auth/wallet/nonce")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"address":"0x0000000000000000000000000000000000000000"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void userCannotRevokeAnotherUsersRefreshToken() throws Exception {
        JsonNode first = register(uniqueEmail(), "PATIENT");
        JsonNode second = register(uniqueEmail(), "PATIENT");

        mockMvc.perform(post("/auth/logout")
                        .header("Authorization", bearer(first.at("/data/accessToken").asText()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(second.at("/data/refreshToken").asText())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"%s"}
                                """.formatted(second.at("/data/refreshToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void userCannotVerifyAnotherUsersWalletNonce() throws Exception {
        JsonNode first = register(uniqueEmail(), "PATIENT");
        JsonNode second = register(uniqueEmail(), "PATIENT");
        Credentials credentials = Credentials.create(Keys.createEcKeyPair());

        MvcResult nonceResult = mockMvc.perform(post("/auth/wallet/nonce")
                        .header("Authorization", bearer(second.at("/data/accessToken").asText()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"address":"%s"}
                                """.formatted(credentials.getAddress())))
                .andExpect(status().isOk())
                .andReturn();
        String message = read(nonceResult).at("/data/message").asText();
        String signature = signatureHex(Sign.signPrefixedMessage(
                message.getBytes(StandardCharsets.UTF_8),
                credentials.getEcKeyPair()));
        String verifyBody = """
                {"address":"%s","signature":"%s"}
                """.formatted(credentials.getAddress(), signature);

        mockMvc.perform(post("/auth/wallet/verify")
                        .header("Authorization", bearer(first.at("/data/accessToken").asText()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verifyBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("WALLET_VERIFICATION_FAILED"));

        mockMvc.perform(post("/auth/wallet/verify")
                        .header("Authorization", bearer(second.at("/data/accessToken").asText()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verifyBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verified").value(true));
    }

    private JsonNode register(String email, String role) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, role)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn();
        return read(result);
    }

    private String registerJson(String email, String role) {
        return """
                {
                  "email":"%s",
                  "password":"password123",
                  "fullName":"Test User",
                  "role":"%s"
                }
                """.formatted(email, role);
    }

    private JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsByteArray());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String uniqueEmail() {
        return UUID.randomUUID() + "@example.com";
    }

    private String signatureHex(Sign.SignatureData signature) {
        byte[] bytes = new byte[65];
        System.arraycopy(signature.getR(), 0, bytes, 0, 32);
        System.arraycopy(signature.getS(), 0, bytes, 32, 32);
        bytes[64] = signature.getV()[0];
        return Numeric.toHexString(bytes);
    }
}
