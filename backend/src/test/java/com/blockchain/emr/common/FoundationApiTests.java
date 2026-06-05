package com.blockchain.emr.common;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.exception.ResourceNotFoundException;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(FoundationApiTests.TestEndpointConfiguration.class)
class FoundationApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthUsesStandardResponseAndRequestId() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Request-Id", matchesPattern("[a-f0-9-]{36}")))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void preservesValidClientRequestId() throws Exception {
        mockMvc.perform(get("/health").header("X-Request-Id", "frontend-request-123"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Request-Id", "frontend-request-123"));
    }

    @Test
    @WithMockUser
    void rejectsInvalidPayloadWithFieldDetails() throws Exception {
        mockMvc.perform(post("/auth/test-validation")
                        .contentType("application/json")
                        .content("""
                                {"name": ""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.details.name").value("Tên không được để trống"));
    }

    @Test
    @WithMockUser
    void mapsApplicationExceptionToStandardError() throws Exception {
        mockMvc.perform(get("/auth/test-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("Không tìm thấy dữ liệu kiểm thử"));
    }

    @Test
    void allowsConfiguredFrontendOrigin() throws Exception {
        mockMvc.perform(options("/health")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    @Test
    void returnsStandardErrorForUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/private-test"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    @WithMockUser
    void returnsStandardErrorForUnknownPublicRoute() throws Exception {
        mockMvc.perform(get("/auth/route-does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @WithMockUser(roles = "PATIENT")
    void rejectsUserWithoutRequiredRole() throws Exception {
        mockMvc.perform(get("/doctor-test"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
    }

    @Test
    @WithMockUser(roles = "DOCTOR")
    void allowsUserWithRequiredRole() throws Exception {
        mockMvc.perform(get("/doctor-test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("doctor"));
    }

    @TestConfiguration
    static class TestEndpointConfiguration {

        @Bean
        TestController testController() {
            return new TestController();
        }
    }

    @RestController
    static class TestController {

        @PostMapping("/auth/test-validation")
        ApiResponse<TestRequest> validate(@Valid @RequestBody TestRequest request) {
            return ApiResponse.success(request);
        }

        @org.springframework.web.bind.annotation.GetMapping("/auth/test-not-found")
        ApiResponse<Void> notFound() {
            throw new ResourceNotFoundException("Không tìm thấy dữ liệu kiểm thử");
        }

        @org.springframework.web.bind.annotation.GetMapping("/private-test")
        ApiResponse<String> privateEndpoint() {
            return ApiResponse.success("private");
        }

        @PreAuthorize("hasRole('DOCTOR')")
        @org.springframework.web.bind.annotation.GetMapping("/doctor-test")
        ApiResponse<String> doctorEndpoint() {
            return ApiResponse.success("doctor");
        }
    }

    record TestRequest(@NotBlank(message = "Tên không được để trống") String name) {
    }
}
