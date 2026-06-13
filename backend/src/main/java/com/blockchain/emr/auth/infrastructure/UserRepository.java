package com.blockchain.emr.auth.infrastructure;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.auth.domain.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    Optional<User> findByIdentityNumberIgnoreCase(String identityNumber);
    boolean existsByIdentityNumberIgnoreCase(String identityNumber);
}
