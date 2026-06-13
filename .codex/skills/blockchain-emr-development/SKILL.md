---
name: blockchain-emr-development
description: Enforce the shared architecture, security, migration, testing, and delivery workflow for the Blockchain EMR monorepo. Use whenever Codex plans, implements, reviews, or verifies changes in this repository across the Spring Boot backend, Next.js frontend, Solidity contracts, IPFS, MySQL, Docker, authentication, profiles, medical records, or access control.
---

# Blockchain EMR Development

Use this skill to keep changes from different contributors compatible, secure, and reviewable.

## Load The Right Context

Read these references before editing:

1. Always read [architecture.md](references/architecture.md) and [collaboration.md](references/collaboration.md).
2. For backend work, read [backend-rules.md](references/backend-rules.md).
3. For any API, identity, authorization, patient data, medical record, wallet, or token work, read [security-checklist.md](references/security-checklist.md).
4. For feature implementation, read [change-workflows.md](references/change-workflows.md).
5. Before finishing, read [verification.md](references/verification.md).

## Required Workflow

1. Inspect `AGENTS.md`, `git status`, the owning domain, its tests, and existing patterns.
2. State the owning domain and behavioral contract before changing code.
3. Keep edits scoped to that domain and its explicit integration boundaries.
4. Add authorization and IDOR protection while designing the API, not after it.
5. Add or update tests with the implementation.
6. Run the project rule checker and the relevant verification commands.
7. Report changed contracts, migrations, tests, and remaining risks in the handoff.

## Non-Negotiable Rules

- Treat every API as authenticated unless it is explicitly listed as public.
- Never trust a client-supplied user ID for operations on the current user. Derive identity from the authenticated principal.
- Apply object-level authorization to every resource ID before returning or mutating data.
- Use new Flyway migrations for schema changes. Never modify an already applied migration.
- Use `application.properties` and profile `.properties` files, not YAML.
- Use Java `Long` and database `BIGINT AUTO_INCREMENT` for relational entity IDs.
- Keep raw medical data and personally identifiable data off-chain. Store only required proofs, hashes, and authorization state on-chain.
- Do not weaken tests or security controls to make a change pass.

## Rule Checker

Run from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .codex/skills/blockchain-emr-development/scripts/check-project-rules.ps1
```

