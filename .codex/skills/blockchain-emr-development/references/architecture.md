# Architecture And Ownership

## Monorepo Areas

| Area | Responsibility |
| --- | --- |
| `frontend/` | Next.js UI, authenticated API client, wallet interaction |
| `backend/` | Spring Boot modular monolith and system-of-record orchestration |
| `blockchain/` | Solidity contracts, deployment scripts, contract tests |
| `infrastructure/` | Docker Compose, MySQL, IPFS, local blockchain services |
| `docs/` | Architecture decisions and shared technical documentation |

## Backend Package Shape

Each business domain follows:

```text
<domain>/
  api/             HTTP controllers and DTOs
  application/     use cases, transactions, authorization
  domain/          entities, value objects, business rules
  infrastructure/  repositories and external adapters
```

Dependencies flow inward. Controllers call application services. Application
services coordinate domain behavior and ports. Infrastructure implements
persistence or external integration.

## Domain Ownership

| Domain | Owns |
| --- | --- |
| `auth` | users, roles, credentials, JWTs, refresh tokens, wallet addresses, wallet nonces |
| `patient` | patient profile and patient-facing profile operations |
| `doctor` | doctor profile, verification status, departments |
| `medicalrecord` | record metadata, lifecycle, CID/hash references |
| `accesscontrol` | grants, revocations, consent rules, on-chain synchronization state |
| `integration.storage` | IPFS/Pinata adapters |
| `integration.blockchain` | Web3j and smart-contract adapters |
| `common` | small technical primitives only; no domain business rules |

Do not let multiple domains mutate the same entity. Cross-domain behavior goes
through an application service or a narrow interface owned by the called
domain. Avoid direct cross-domain repository access in new code.

## Data Placement

- SQL: accounts, profiles, departments, logs, record metadata, operational state.
- IPFS: encrypted or otherwise protected medical files and large payloads.
- Blockchain: hashes, proofs, authorization events, and minimal identifiers.
- Never place plaintext medical data, secrets, JWTs, or refresh tokens on-chain.

