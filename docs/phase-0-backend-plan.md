# Phase 0 Backend Assessment And Plan

## Scope

This phase assesses the existing Spring Boot backend and defines the migration
path for the new identity, healthcare facility, and doctor verification model.
It intentionally makes no runtime code, schema, API, frontend, or smart-contract
changes.

The first implementation increment should cover Phase 2 from `task.md`:

- patient and doctor registration with a national identity number;
- login with national identity number and password;
- seeded healthcare facilities;
- doctor-to-facility membership;
- explicit doctor verification states and admin verification APIs;
- preservation of JWT, refresh-token, and wallet-verification behavior.

## Current Backend

### Authentication

- `users.email` is mandatory and unique.
- `POST /api/auth/register` accepts email, password, full name, and a caller-selected
  role.
- `POST /api/auth/login` accepts email and password.
- Registration creates only a `User`; patient and doctor profiles are created later
  through separate `/patients/me` and `/doctors/me` calls.
- JWT subject is the internal `Long` user ID. The token also contains email and roles.
- Refresh tokens and MetaMask nonce/signature verification are already implemented
  and should be retained.
- Account availability is represented by `users.enabled`.

### Patient

- `patient_profiles` already stores date of birth, gender, phone, and address.
- The profile is optional immediately after registration.
- `patient_code` is generated from the internal user ID.
- Patient search currently uses name/patient code and returns a limited summary.

### Doctor

- `doctor_profiles` stores license number, specialty, department, phone, biography,
  and a boolean `verified` flag.
- A doctor is not associated with a healthcare facility.
- Date of birth and gender are not stored for doctors.
- Verification currently uses `PUT /api/doctors/{profileId}/verification` with a
  boolean request.
- Verified-doctor authorization depends on `verified = true`.

### Facilities And Admin

- `departments` exist, but they represent clinical departments and must not be
  reused as healthcare facilities.
- There is no `healthcare_facilities` table or facility API.
- There is no dedicated admin controller for pending, verify, reject, or lock
  workflows.
- The development seeder creates email-based patient, doctor, and admin accounts
  and links a wallet to the admin even though the new workflow does not require one.

## Gaps Against The Target Model

| Target behavior | Current gap |
| --- | --- |
| Patient/doctor login by CCCD or national ID | Authentication is email-only. |
| Required profile data captured at registration | Profiles are created in a second, optional step. |
| Doctor selects a seeded facility | No facility domain or doctor-facility relation exists. |
| Doctor starts as `PENDING_VERIFICATION` | Only a boolean `verified` flag exists. |
| Admin verifies, rejects, or locks doctors | Only a generic boolean verification endpoint exists. |
| Admin does not require a wallet | Seeder currently links an admin wallet. |
| Facility-level consent | Existing access control and blockchain integration use doctor wallet addresses. This belongs to later backend/contract phases. |
| Record upload source | Existing medical records do not yet expose the required `PATIENT_UPLOADED`/`DOCTOR_UPLOADED` model. This belongs to Phase 5. |

## Ownership And Contracts

### Owning domains

- `auth`: national identity, credentials, account enabled state, JWT, refresh token,
  wallet verification.
- `patient`: patient registration profile fields.
- `doctor`: doctor registration profile, facility membership, verification state.
- `facility`: facility catalogue and active-facility lookup.

The `facility` domain should be a small independent domain rather than part of
`doctor` or `accesscontrol`, because registration, doctor membership, patient
consent, and later blockchain synchronization all consume it.

### Shared contracts

- `identityNumber` is the canonical API name for CCCD/personal identity number.
- Facility business IDs are stable strings: `BV001`, `BV002`, and `PK001`.
- Relational primary keys remain `Long`/`BIGINT AUTO_INCREMENT`; `facilityId` is a
  separate unique business key.
- Doctor verification values are `PENDING_VERIFICATION`, `VERIFIED`, and `REJECTED`.
- `users.enabled` remains the account lock switch for this increment. API responses
  can map it to `ACTIVE` or `LOCKED` without introducing a second mutable account
  status source.
- JWT subject remains the internal user ID, so existing authorization and refresh
  tokens do not need a structural rewrite.

## Proposed Phase 2 API

### Public APIs

```text
POST /api/auth/register/patient
POST /api/auth/register/doctor
POST /api/auth/login
POST /api/auth/refresh
GET  /api/facilities
```

Patient registration request:

```json
{
  "identityNumber": "012345678901",
  "password": "password123",
  "fullName": "Nguyen Van A",
  "dateOfBirth": "1995-06-15",
  "gender": "MALE",
  "phoneNumber": "+84901234567",
  "address": "Ho Chi Minh City"
}
```

Doctor registration request:

```json
{
  "identityNumber": "012345678902",
  "password": "password123",
  "fullName": "Tran Thi B",
  "dateOfBirth": "1985-03-20",
  "gender": "FEMALE",
  "phoneNumber": "+84901112223",
  "licenseNumber": "LIC-001",
  "facilityId": "BV001"
}
```

Login request:

```json
{
  "identityNumber": "012345678901",
  "password": "password123"
}
```

`GET /api/facilities` is public because the doctor registration form needs the
active facility catalogue before authentication. It returns display fields only.

### Admin APIs

```text
GET  /api/admin/doctors/pending?page=0&size=20
POST /api/admin/doctors/{doctorProfileId}/verify
POST /api/admin/doctors/{doctorProfileId}/reject
POST /api/admin/users/{userId}/lock
POST /api/admin/users/{userId}/unlock
```

All admin APIs require `ROLE_ADMIN`. Doctor IDs and user IDs are loaded and checked
in the application service before mutation. List endpoints are paginated.

### Compatibility policy

- Keep email nullable for the existing admin and transitional seeded accounts.
- Keep legacy email login temporarily for existing accounts while new patient and
  doctor registrations use identity numbers. Admin continues to use email.
- Patient and doctor registration must use the new role-specific endpoints; clients
  cannot submit an arbitrary role.
- Retain the current `/auth/register` endpoint only during the transition if the
  frontend build still depends on it. It should be deprecated and must not allow
  creation of admin accounts.
- Existing `/patients/me` and `/doctors/me` profile endpoints remain available for
  later profile updates, but registration creates the required initial profile in
  the same transaction as the user.

## Proposed Schema Migration

The next available migration is currently `V11`, but its number must be reserved
before implementation if another contributor is adding migrations.

Candidate `V11__add_identity_facilities_and_doctor_verification.sql`:

1. Add nullable unique `identity_number` to `users` and index it for login.
2. Make `users.email` nullable to support patient/doctor accounts without email.
3. Create `healthcare_facilities` with:
   - `id BIGINT AUTO_INCREMENT PRIMARY KEY`;
   - `facility_id VARCHAR(30) NOT NULL UNIQUE`;
   - `name`, `address`, `description`, `active`, timestamps.
4. Seed `BV001`, `BV002`, and `PK001` idempotently within the migration.
5. Add `facility_id` foreign key to `doctor_profiles` referencing the relational
   facility row and index the foreign key.
6. Add doctor `date_of_birth` and `gender` fields.
7. Add `verification_status`, backfill it from `verified`, and make it non-null.
8. Keep or remove the old `verified` column only in the same implementation that
   updates every entity/query. There must be one authoritative verification field.
9. Make `specialization` nullable because it is not part of the required doctor
   registration contract; it can still be completed through `/doctors/me`.

No applied migration from `V1` through `V10` will be edited.

## Implementation Order

1. Add the Flyway migration and facility entity/repository.
2. Add facility list service/controller with an active-only query.
3. Refactor `User` and `UserRepository` for identity-number lookup while retaining
   transitional admin email lookup.
4. Introduce separate patient and doctor registration DTOs and transactional use
   cases that create `User` plus the corresponding profile atomically.
5. Update login DTO/service to use identity number, with the bounded admin fallback.
6. Replace doctor boolean verification behavior with the verification enum and add
   paginated admin workflows.
7. Update `ProfileAuthorization` to require `VERIFIED`.
8. Update development seed data to use stable test identity numbers, assign the
   doctor to `BV001`, and stop linking an admin wallet.
9. Update API responses without exposing password hashes, full identity numbers, or
   unnecessary profile data.
10. Update backend tests and only then make the minimum frontend compatibility
    adjustment if its build requires the legacy auth contract.

## Security Decisions

- National identity numbers are authentication identifiers and PII. They must never
  be logged, placed in JWT claims, returned in patient search summaries, sent to
  IPFS, or written on-chain.
- JWT continues to identify users by internal ID. Authorization never trusts an
  identity number or user ID supplied for a current-user operation.
- Registration endpoints assign roles server-side. A request cannot self-register
  as admin or set doctor verification status.
- Doctor registration validates that the selected facility exists and is active.
- Admin verification and account locking are enforced in both HTTP security and
  application services.
- Wallet verification remains a separate authenticated action after registration.
- A verified doctor is not automatically authorized to access a patient. Facility
  consent and object-level record authorization remain mandatory in later phases.

## Required Tests For Phase 2

- Patient registration creates an active patient user and complete patient profile.
- Doctor registration creates a pending doctor linked to an active facility.
- Duplicate identity number and duplicate license number are rejected.
- Unknown or inactive facility is rejected during doctor registration.
- Patient and doctor can login with identity number and password.
- Disabled/locked users cannot login or refresh tokens.
- Registration cannot create an admin or choose a verification state.
- Wallet nonce and signature verification still work after the identity refactor.
- Unauthenticated and non-admin callers cannot use admin APIs.
- Admin can list only pending doctors and verify/reject a selected doctor.
- Cross-resource or tampered doctor/user IDs cannot mutate unrelated resources.
- `GET /api/facilities` returns only active facilities and no internal fields.
- Existing profile, refresh-token, and JWT authorization tests continue to pass.

## Deferred Work

- Smart-contract facility whitelist and facility-level grants belong to Phase 1.
- Access requests and `patientWallet -> facilityId` authorization belong to Phase 4.
- IPFS upload/read integration and record `sourceType` belong to Phase 5.
- Frontend workflow changes belong to Phase 6.
- Final seed synchronization and end-to-end documentation belong to Phase 7.

Backend implementation can start before the smart-contract change as long as
facility IDs are fixed to `BV001`, `BV002`, and `PK001`. Facility-level access must
not be considered complete until the contract ABI and backend blockchain adapter
are updated and verified together.
