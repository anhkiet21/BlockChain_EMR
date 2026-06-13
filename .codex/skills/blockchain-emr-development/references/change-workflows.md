# Change Workflows

## Add A Backend Feature

1. Select the owning domain and write the use-case authorization rule.
2. Define request/response DTOs and the API contract.
3. Add or update domain behavior.
4. Implement the application service with authorization and transaction boundaries.
5. Add infrastructure persistence or integration adapters.
6. Add the controller with explicit authentication/authorization.
7. Add security and behavior tests.
8. Run the rule checker and backend verification.

## Add An Entity Or Schema Change

1. Confirm which domain owns the table.
2. Reserve the next Flyway migration number.
3. Add a new migration; do not edit an applied migration.
4. Use `BIGINT AUTO_INCREMENT` and matching Java `Long` IDs.
5. Add constraints and indexes based on invariants and query patterns.
6. Update the entity and repository.
7. Add repository/integration tests and run against MySQL when practical.

## Add A Protected API

1. Decide whether it is current-user (`/me`) or resource-ID based.
2. Define permitted roles and object-level authorization.
3. Enforce security in the HTTP configuration, controller, and application service.
4. Minimize response fields.
5. Add the complete IDOR test matrix from `security-checklist.md`.

## Add A Smart-Contract Change

1. Keep plaintext medical and personal data out of contract storage and events.
2. Define caller permissions, state transitions, revocation behavior, and emitted events.
3. Test unauthorized callers, duplicate operations, revoked grants, and edge cases.
4. Deploy locally and regenerate bindings only after tests pass.
5. Update backend adapters and document the ABI/address configuration change.

## Add A Frontend Flow

1. Use the agreed backend API and contract ABI.
2. Treat route guards as user experience only; backend authorization remains mandatory.
3. Do not expose tokens, secrets, or medical data in logs or browser storage beyond
   the approved authentication design.
4. Handle wallet rejection, wrong network, expired sessions, and denied access.
5. Build and verify the affected flow.

