# Verification And Definition Of Done

Run checks relevant to the changed areas. Do not claim a check passed unless it
was actually run.

## Shared Rules

```powershell
powershell -ExecutionPolicy Bypass -File .codex/skills/blockchain-emr-development/scripts/check-project-rules.ps1
git diff --check
```

## Backend

```powershell
Set-Location backend
.\mvnw.cmd verify
```

For migration or MySQL-specific changes, also verify against the local MySQL
service when available.

## Frontend

```powershell
Set-Location frontend
npm run build
```

## Blockchain

```powershell
Set-Location blockchain
npm test
```

## Infrastructure

```powershell
docker compose -f infrastructure/docker-compose.yml config
```

## Definition Of Done

- The change belongs to one clear owner/domain.
- Public contracts and migration impacts are documented.
- Authentication and object-level authorization are enforced and tested.
- No sensitive medical data is exposed or placed on-chain.
- Relevant tests and builds pass.
- The handoff lists commands run and any remaining risk.

