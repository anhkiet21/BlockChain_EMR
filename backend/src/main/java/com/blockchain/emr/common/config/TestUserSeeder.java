package com.blockchain.emr.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.blockchain.emr.auth.domain.Role;
import com.blockchain.emr.auth.domain.RoleName;
import com.blockchain.emr.auth.domain.User;
import com.blockchain.emr.auth.domain.WalletAddress;
import com.blockchain.emr.auth.infrastructure.RoleRepository;
import com.blockchain.emr.auth.infrastructure.UserRepository;
import com.blockchain.emr.auth.infrastructure.WalletAddressRepository;
import com.blockchain.emr.doctor.domain.DoctorProfile;
import com.blockchain.emr.doctor.infrastructure.DoctorProfileRepository;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

@Component
public class TestUserSeeder implements ApplicationRunner {

    private final boolean enabled;
    private final String password;
    private final UserRepository users;
    private final RoleRepository roles;
    private final PatientProfileRepository patients;
    private final DoctorProfileRepository doctors;
    private final WalletAddressRepository wallets;
    private final PasswordEncoder passwordEncoder;

    public TestUserSeeder(
            @Value("${app.seed.test-users.enabled:false}") boolean enabled,
            @Value("${app.seed.test-users.password:password123}") String password,
            UserRepository users,
            RoleRepository roles,
            PatientProfileRepository patients,
            DoctorProfileRepository doctors,
            WalletAddressRepository wallets,
            PasswordEncoder passwordEncoder) {
        this.enabled = enabled;
        this.password = password;
        this.users = users;
        this.roles = roles;
        this.patients = patients;
        this.doctors = doctors;
        this.wallets = wallets;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        User patient = seedUser("patient@test.local", "Benh Nhan Test", RoleName.PATIENT);
        User doctor = seedUser("doctor@test.local", "Bac Si Test", RoleName.DOCTOR);
        User admin = seedUser("admin@test.local", "Quan Tri Test", RoleName.ADMIN);

        patients.findByUserId(patient.getId()).orElseGet(() -> patients.save(new PatientProfile(patient)));
        doctors.findByUserId(doctor.getId()).orElseGet(() -> {
            DoctorProfile profile = new DoctorProfile(doctor, "TEST-LICENSE-001", "General Medicine");
            profile.setVerified(true);
            return doctors.save(profile);
        });
        seedWallet(patient, "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
        seedWallet(doctor, "0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
        seedWallet(admin, "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc");
    }

    private User seedUser(String email, String fullName, RoleName roleName) {
        return users.findByEmailIgnoreCase(email).orElseGet(() -> {
            Role role = roles.findByName(roleName)
                    .orElseThrow(() -> new IllegalStateException("Required role is missing: " + roleName));
            return users.save(new User(email, passwordEncoder.encode(password), fullName, role));
        });
    }

    private void seedWallet(User user, String address) {
        if (!wallets.existsByAddress(address)) {
            wallets.save(new WalletAddress(user, address));
        }
    }
}
