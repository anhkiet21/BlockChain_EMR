package com.blockchain.emr.blockchain;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigInteger;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.blockchain.emr.integration.blockchain.domain.BlockchainService;
import com.blockchain.emr.integration.blockchain.domain.BlockchainService.TransactionState;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BlockchainApiTests {

    private static final String WALLET_A = "0x1111111111111111111111111111111111111111";
    private static final String WALLET_B = "0x2222222222222222222222222222222222222222";
    private static final String TX = "0x" + "a".repeat(64);

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private BlockchainService blockchainService;

    @Test
    void requiresAuthenticationAndRejectsUnlinkedWalletsBeforeRpcCall() throws Exception {
        mockMvc.perform(get("/blockchain/access").param("patientWallet", WALLET_A).param("granteeWallet", WALLET_B))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/blockchain/facility-access").param("patientWallet", WALLET_A).param("facilityId", "BV001"))
                .andExpect(status().isUnauthorized());

        String token = registerPatient();
        mockMvc.perform(get("/blockchain/access").header("Authorization", bearer(token))
                        .param("patientWallet", WALLET_A).param("granteeWallet", WALLET_B))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
        mockMvc.perform(get("/blockchain/facility-access").header("Authorization", bearer(token))
                        .param("patientWallet", WALLET_A).param("facilityId", "BV001"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));

        mockMvc.perform(get("/blockchain/records/{recordId}", BigInteger.ZERO)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/blockchain/records/by-system-id/{recordId}", 999999L)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isNotFound());
        verifyNoInteractions(blockchainService);
    }

    @Test
    void authenticatedUserCanCheckTransactionStatus() throws Exception {
        String token = registerPatient();
        when(blockchainService.getTransactionState(TX))
                .thenReturn(new TransactionState(TX, TransactionState.Status.SUCCESS, BigInteger.TEN, null));

        mockMvc.perform(get("/blockchain/transactions/{transactionHash}", TX)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.blockNumber").value(10));
    }

    private String registerPatient() throws Exception {
        MvcResult result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123","fullName":"Chain Test","role":"PATIENT"}
                                """.formatted(UUID.randomUUID() + "@example.com")))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsByteArray()).at("/data/accessToken").asText();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
