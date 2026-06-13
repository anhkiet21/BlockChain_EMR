package com.blockchain.emr.auth.api;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.blockchain.emr.auth.api.dto.LoginRequest;
import com.blockchain.emr.auth.api.dto.DoctorRegistrationRequest;
import com.blockchain.emr.auth.api.dto.PatientRegistrationRequest;
import com.blockchain.emr.auth.api.dto.RefreshRequest;
import com.blockchain.emr.auth.api.dto.RegisterRequest;
import com.blockchain.emr.auth.api.dto.TokenResponse;
import com.blockchain.emr.auth.api.dto.UserResponse;
import com.blockchain.emr.auth.api.dto.WalletNonceRequest;
import com.blockchain.emr.auth.api.dto.WalletNonceResponse;
import com.blockchain.emr.auth.api.dto.WalletResponse;
import com.blockchain.emr.auth.api.dto.WalletVerifyRequest;
import com.blockchain.emr.auth.application.AuthService;
import com.blockchain.emr.auth.application.WalletVerificationService;
import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.common.api.ApiResponse;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final WalletVerificationService walletVerificationService;

    public AuthController(AuthService authService, WalletVerificationService walletVerificationService) {
        this.authService = authService;
        this.walletVerificationService = walletVerificationService;
    }

    @PostMapping("/register")
    ApiResponse<TokenResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success(authService.register(request));
    }

    @PostMapping("/register/patient")
    ApiResponse<TokenResponse> registerPatient(
            @Valid @RequestBody PatientRegistrationRequest request) {
        return ApiResponse.success(authService.registerPatient(request));
    }

    @PostMapping("/register/doctor")
    ApiResponse<TokenResponse> registerDoctor(
            @Valid @RequestBody DoctorRegistrationRequest request) {
        return ApiResponse.success(authService.registerDoctor(request));
    }

    @PostMapping("/login")
    ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @PostMapping("/refresh")
    ApiResponse<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.success(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    ApiResponse<Void> logout(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody RefreshRequest request) {
        authService.logout(request.refreshToken(), user.id());
        return ApiResponse.success(null);
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    ApiResponse<UserResponse> me(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.success(authService.me(user.id()));
    }

    @PostMapping("/wallet/nonce")
    @PreAuthorize("isAuthenticated()")
    ApiResponse<WalletNonceResponse> walletNonce(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody WalletNonceRequest request) {
        return ApiResponse.success(walletVerificationService.createNonce(user.id(), request.address()));
    }

    @PostMapping("/wallet/verify")
    @PreAuthorize("isAuthenticated()")
    ApiResponse<WalletResponse> verifyWallet(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody WalletVerifyRequest request) {
        return ApiResponse.success(walletVerificationService.verify(user.id(), request.address(), request.signature()));
    }
}
