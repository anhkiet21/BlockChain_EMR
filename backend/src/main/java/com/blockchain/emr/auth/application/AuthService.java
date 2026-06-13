package com.blockchain.emr.auth.application;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.auth.api.dto.LoginRequest;
import com.blockchain.emr.auth.api.dto.DoctorRegistrationRequest;
import com.blockchain.emr.auth.api.dto.PatientRegistrationRequest;
import com.blockchain.emr.auth.api.dto.RegisterRequest;
import com.blockchain.emr.auth.api.dto.TokenResponse;
import com.blockchain.emr.auth.api.dto.UserResponse;
import com.blockchain.emr.auth.domain.Role;
import com.blockchain.emr.auth.domain.RoleName;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.infrastructure.RoleRepository;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.auth.security.AuthenticatedUser;
import com.blockchain.emr.auth.security.JwtService;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;
import com.blockchain.emr.doctor.application.DoctorRegistrationService;
import com.blockchain.emr.facility.application.HealthcareFacilityService;
import com.blockchain.emr.patient.application.PatientRegistrationService;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final WalletAddressRepository walletAddressRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenService tokenService;
    private final PatientRegistrationService patientRegistrationService;
    private final DoctorRegistrationService doctorRegistrationService;
    private final HealthcareFacilityService facilityService;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            WalletAddressRepository walletAddressRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            TokenService tokenService,
            PatientRegistrationService patientRegistrationService,
            DoctorRegistrationService doctorRegistrationService,
            HealthcareFacilityService facilityService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.walletAddressRepository = walletAddressRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tokenService = tokenService;
        this.patientRegistrationService = patientRegistrationService;
        this.doctorRegistrationService = doctorRegistrationService;
        this.facilityService = facilityService;
    }

    @Transactional
    public TokenResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApplicationException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        if (request.role() == RoleName.ADMIN) {
            throw new ApplicationException(ErrorCode.ROLE_NOT_ALLOWED);
        }

        Role role = roleRepository.findByName(request.role())
                .orElseThrow(() -> new IllegalStateException("Required role is missing"));
        User user = userRepository.save(new User(
                email,
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                role));
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        User user = findLoginUser(request)
                .orElseThrow(() -> new ApplicationException(ErrorCode.INVALID_CREDENTIALS));
        if (!user.isEnabled() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApplicationException(ErrorCode.INVALID_CREDENTIALS);
        }
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse registerPatient(PatientRegistrationRequest request) {
        String identityNumber = normalizeIdentityNumber(request.identityNumber());
        ensureIdentityNumberAvailable(identityNumber);
        User user = userRepository.save(User.withIdentityNumber(
                identityNumber,
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                requiredRole(RoleName.PATIENT)));
        patientRegistrationService.createInitialProfile(
                user,
                request.dateOfBirth(),
                request.gender(),
                request.phoneNumber(),
                request.address());
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse registerDoctor(DoctorRegistrationRequest request) {
        String identityNumber = normalizeIdentityNumber(request.identityNumber());
        ensureIdentityNumberAvailable(identityNumber);
        var facility = facilityService.findActiveByFacilityId(request.facilityId());
        User user = userRepository.save(User.withIdentityNumber(
                identityNumber,
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                requiredRole(RoleName.DOCTOR)));
        doctorRegistrationService.createInitialProfile(
                user,
                request.licenseNumber(),
                request.dateOfBirth(),
                request.gender(),
                request.phoneNumber(),
                facility);
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse refresh(String refreshToken) {
        User user = tokenService.consume(refreshToken).getUser();
        if (!user.isEnabled()) {
            throw new ApplicationException(ErrorCode.INVALID_TOKEN);
        }
        return issueTokens(user);
    }

    @Transactional
    @PreAuthorize("#userId == authentication.principal.id")
    public void logout(String refreshToken, Long userId) {
        tokenService.revoke(refreshToken, userId);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("#userId == authentication.principal.id")
    public UserResponse me(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toResponse(user);
    }

    private TokenResponse issueTokens(User user) {
        AuthenticatedUser principal = AuthenticatedUser.from(user);
        return new TokenResponse(
                "Bearer",
                jwtService.createAccessToken(principal),
                jwtService.accessTokenExpirationSeconds(),
                tokenService.issueRefreshToken(user),
                toResponse(user));
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                maskIdentityNumber(user.getIdentityNumber()),
                user.getFullName(),
                user.isEnabled() ? "ACTIVE" : "LOCKED",
                user.getRoles().stream()
                        .map(role -> role.getName().name())
                        .collect(java.util.stream.Collectors.toUnmodifiableSet()),
                walletAddressRepository.findAllByUserId(user.getId()).stream()
                        .map(wallet -> wallet.getAddress())
                        .toList());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private java.util.Optional<User> findLoginUser(LoginRequest request) {
        if (request.identityNumber() != null && !request.identityNumber().isBlank()) {
            return userRepository.findByIdentityNumberIgnoreCase(
                    normalizeIdentityNumber(request.identityNumber()));
        }
        if (request.email() != null && !request.email().isBlank()) {
            return userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()));
        }
        throw new ApplicationException(ErrorCode.VALIDATION_ERROR, "Identity number is required");
    }

    private void ensureIdentityNumberAvailable(String identityNumber) {
        if (userRepository.existsByIdentityNumberIgnoreCase(identityNumber)) {
            throw new ApplicationException(ErrorCode.IDENTITY_NUMBER_ALREADY_EXISTS);
        }
    }

    private Role requiredRole(RoleName roleName) {
        return roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Required role is missing: " + roleName));
    }

    private String normalizeIdentityNumber(String identityNumber) {
        return identityNumber.trim().toUpperCase(Locale.ROOT);
    }

    private String maskIdentityNumber(String identityNumber) {
        if (identityNumber == null) {
            return null;
        }
        int visibleLength = Math.min(4, identityNumber.length());
        return "*".repeat(identityNumber.length() - visibleLength)
                + identityNumber.substring(identityNumber.length() - visibleLength);
    }
}
