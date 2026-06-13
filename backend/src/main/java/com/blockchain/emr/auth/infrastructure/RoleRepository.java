package com.blockchain.emr.auth.infrastructure;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockchain.emr.auth.domain.Role;
import com.blockchain.emr.auth.domain.RoleName;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);
}

