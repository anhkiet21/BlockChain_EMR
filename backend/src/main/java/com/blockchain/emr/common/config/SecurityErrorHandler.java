package com.blockchain.emr.common.config;

import java.io.IOException;
import java.util.Map;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import com.blockchain.emr.common.api.ApiError;
import com.blockchain.emr.common.api.ApiResponse;
import com.blockchain.emr.common.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class SecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    public SecurityErrorHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException {
        writeError(response, request, ErrorCode.UNAUTHORIZED);
    }

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException exception) throws IOException, ServletException {
        writeError(response, request, ErrorCode.ACCESS_DENIED);
    }

    private void writeError(
            HttpServletResponse response,
            HttpServletRequest request,
            ErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.status().value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        ApiError error = new ApiError(
                errorCode.name(),
                errorCode.defaultMessage(),
                request.getRequestURI(),
                Map.of());
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.failure(error));
    }
}

