package com.blockchain.emr.auth.application;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.auth.api.dto.AccountStatusResponse;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.common.exception.ApplicationException;
import com.blockchain.emr.common.exception.ErrorCode;
import com.blockchain.emr.common.exception.ResourceNotFoundException;

@Service
public class AdminAccountService {

    private final UserRepository userRepository;

    public AdminAccountService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') and #adminUserId == authentication.principal.id")
    public AccountStatusResponse setLocked(Long adminUserId, Long targetUserId, boolean locked) {
        if (adminUserId.equals(targetUserId)) {
            throw new ApplicationException(ErrorCode.BAD_REQUEST, "Admin cannot change their own account status");
        }
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (locked) {
            user.lock();
        } else {
            user.unlock();
        }
        return new AccountStatusResponse(user.getId(), user.isEnabled() ? "ACTIVE" : "LOCKED");
    }
}

