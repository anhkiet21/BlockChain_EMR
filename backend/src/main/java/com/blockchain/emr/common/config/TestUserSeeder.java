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
import com.blockchain.emr.facility.infrastructure.HealthcareFacilityRepository;
import com.blockchain.emr.patient.domain.PatientProfile;
import com.blockchain.emr.patient.infrastructure.PatientProfileRepository;

@Component
public class TestUserSeeder implements ApplicationRunner {

    private final boolean enabled;
    private final boolean walletsEnabled;
    private final String password;
    private final UserRepository users;
    private final RoleRepository roles;
    private final PatientProfileRepository patients;
    private final DoctorProfileRepository doctors;
    private final WalletAddressRepository wallets;
    private final HealthcareFacilityRepository facilities;
    private final PasswordEncoder passwordEncoder;

    public TestUserSeeder(
            @Value("${app.seed.test-users.enabled:false}") boolean enabled,
            @Value("${app.seed.test-users.wallets-enabled:false}") boolean walletsEnabled,
            @Value("${app.seed.test-users.password:password123}") String password,
            UserRepository users,
            RoleRepository roles,
            PatientProfileRepository patients,
            DoctorProfileRepository doctors,
            WalletAddressRepository wallets,
            HealthcareFacilityRepository facilities,
            PasswordEncoder passwordEncoder) {
        this.enabled = enabled;
        this.walletsEnabled = walletsEnabled;
        this.password = password;
        this.users = users;
        this.roles = roles;
        this.patients = patients;
        this.doctors = doctors;
        this.wallets = wallets;
        this.facilities = facilities;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        User patient = seedIdentityUser("079000000001", "Benh Nhan Test", RoleName.PATIENT);
        User doctor = seedIdentityUser("079000000002", "Bac Si Test", RoleName.DOCTOR);
        User admin = seedUser("admin@test.local", "Quan Tri Test", RoleName.ADMIN);

        patients.findByUserId(patient.getId()).orElseGet(() -> patients.save(new PatientProfile(patient)));
        doctors.findByUserId(doctor.getId()).orElseGet(() -> {
            var facility = facilities.findByFacilityIdIgnoreCase("BV001")
                    .orElseThrow(() -> new IllegalStateException("Seed facility BV001 is missing"));
            DoctorProfile profile = new DoctorProfile(
                    doctor,
                    "TEST-LICENSE-079000000002",
                    java.time.LocalDate.of(1985, 1, 1),
                    com.blockchain.emr.patient.domain.Gender.MALE,
                    "+84901112223",
                    facility);
            profile.setVerified(true);
            return doctors.save(profile);
        });
        if (walletsEnabled) {
            seedWallet(patient, "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
            seedWallet(doctor, "0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
        } else {
            wallets.deleteAll(wallets.findAllByUserId(patient.getId()));
            wallets.deleteAll(wallets.findAllByUserId(doctor.getId()));
        }
        wallets.deleteAll(wallets.findAllByUserId(admin.getId()));
    }

    private User seedUser(String email, String fullName, RoleName roleName) {
        return users.findByEmailIgnoreCase(email).orElseGet(() -> {
            Role role = roles.findByName(roleName)
                    .orElseThrow(() -> new IllegalStateException("Required role is missing: " + roleName));
            return users.save(new User(email, passwordEncoder.encode(password), fullName, role));
        });
    }

    private User seedIdentityUser(String identityNumber, String fullName, RoleName roleName) {
        return users.findByIdentityNumberIgnoreCase(identityNumber).orElseGet(() -> {
            Role role = roles.findByName(roleName)
                    .orElseThrow(() -> new IllegalStateException("Required role is missing: " + roleName));
            return users.save(User.withIdentityNumber(
                    identityNumber,
                    passwordEncoder.encode(password),
                    fullName,
                    role));
        });
    }

    private void seedWallet(User user, String address) {
        WalletAddress wallet = wallets.findByAddress(address)
                .orElseGet(() -> new WalletAddress(user, address));
        if (!wallet.getUser().getId().equals(user.getId())) {
            wallet.reassignTo(user);
        }
        wallets.save(wallet);
    }
}
