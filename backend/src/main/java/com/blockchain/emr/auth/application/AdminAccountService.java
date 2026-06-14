package com.blockchain.emr.auth.application;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.auth.api.dto.AccountStatusResponse;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.audit.SystemAuditService;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;

@Service
public class AdminAccountService {

    private final UserRepository userRepository;
    private final SystemAuditService auditService;

    public AdminAccountService(UserRepository userRepository, SystemAuditService auditService) {
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') and #adminUserId == authentication.principal.id")
    public AccountStatusResponse setLocked(Long adminUserId, Long targetUserId, boolean locked) {
        if (adminUserId.equals(targetUserId)) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Admin cannot change their own account status");
        }
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String previous = user.isEnabled() ? "ACTIVE" : "LOCKED";
        if (locked) {
            user.lock();
        } else {
            user.unlock();
        }
        String current = user.isEnabled() ? "ACTIVE" : "LOCKED";
        auditService.record(
                locked ? "USER_LOCKED" : "USER_UNLOCKED",
                adminUserId,
                userRepository.findById(adminUserId).map(User::getFullName)
                        .orElse("Quản trị viên #" + adminUserId),
                "ADMIN",
                "USER",
                user.getId().toString(),
                user.getFullName(),
                null,
                previous,
                current,
                null);
        return new AccountStatusResponse(user.getId(), current);
    }
}

