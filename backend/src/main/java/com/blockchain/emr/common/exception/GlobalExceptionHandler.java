package com.blockchain.emr.common.exception;

import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.blockchain.emr.common.api.ApiError;
import com.blockchain.emr.common.api.ApiResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApplicationException.class)
    ResponseEntity<ApiResponse<Void>> handleApplicationException(
            ApplicationException exception,
            HttpServletRequest request) {
        ErrorCode code = exception.getErrorCode();
        return buildResponse(code, exception.getMessage(), request.getRequestURI(), Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> handleValidationException(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        Map<String, String> details = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> details.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return buildResponse(
                ErrorCode.VALIDATION_ERROR,
                ErrorCode.VALIDATION_ERROR.defaultMessage(),
                request.getRequestURI(),
                details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiResponse<Void>> handleConstraintViolation(
            ConstraintViolationException exception,
            HttpServletRequest request) {
        Map<String, String> details = new LinkedHashMap<>();
        exception.getConstraintViolations().forEach(violation ->
                details.putIfAbsent(violation.getPropertyPath().toString(), violation.getMessage()));
        return buildResponse(
                ErrorCode.VALIDATION_ERROR,
                ErrorCode.VALIDATION_ERROR.defaultMessage(),
                request.getRequestURI(),
                details);
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class,
            HttpRequestMethodNotSupportedException.class
    })
    ResponseEntity<ApiResponse<Void>> handleBadRequest(
            Exception exception,
            HttpServletRequest request) {
        return buildResponse(
                ErrorCode.BAD_REQUEST,
                ErrorCode.BAD_REQUEST.defaultMessage(),
                request.getRequestURI(),
                Map.of());
    }

    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    ResponseEntity<ApiResponse<Void>> handleNotFound(
            Exception exception,
            HttpServletRequest request) {
        return buildResponse(
                ErrorCode.RESOURCE_NOT_FOUND,
                ErrorCode.RESOURCE_NOT_FOUND.defaultMessage(),
                request.getRequestURI(),
                Map.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResponse<Void>> handleDataConflict(
            DataIntegrityViolationException exception,
            HttpServletRequest request) {
        return buildResponse(
                ErrorCode.CONFLICT,
                ErrorCode.CONFLICT.defaultMessage(),
                request.getRequestURI(),
                Map.of());
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    ResponseEntity<ApiResponse<Void>> handleAccessDenied(
            RuntimeException exception,
            HttpServletRequest request) {
        return buildResponse(
                ErrorCode.ACCESS_DENIED,
                ErrorCode.ACCESS_DENIED.defaultMessage(),
                request.getRequestURI(),
                Map.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> handleUnexpectedException(
            Exception exception,
            HttpServletRequest request) {
        log.error("Unhandled exception for {}", request.getRequestURI(), exception);
        return buildResponse(
                ErrorCode.INTERNAL_ERROR,
                ErrorCode.INTERNAL_ERROR.defaultMessage(),
                request.getRequestURI(),
                Map.of());
    }

    private ResponseEntity<ApiResponse<Void>> buildResponse(
            ErrorCode code,
            String message,
            String path,
            Map<String, String> details) {
        ApiError error = new ApiError(code.name(), message, path, details);
        return ResponseEntity.status(code.status()).body(ApiResponse.failure(error));
    }
}
