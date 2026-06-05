# Multi-Contributor Collaboration

## Before Work

1. Define the task's owning area and domain.
2. List any shared contracts: API DTO, event, database table, smart-contract ABI.
3. Check `git status` and preserve unrelated work.
4. For database work, reserve the next Flyway version with the team before
   creating the file.

## Split Work By Ownership

Prefer independent assignments such as:

- Contributor A owns a domain use case and its backend tests.
- Contributor B owns the related frontend flow against an agreed API contract.
- Contributor C owns a smart-contract change and ABI/deployment artifacts.
- Contributor D owns infrastructure or integration verification.

One contributor owns each shared contract change. Other contributors consume
that agreed contract instead of creating competing versions.

## Change Discipline

- Keep changes narrow and avoid unrelated refactors.
- Do not edit another contributor's active files unless coordination is explicit.
- Do not rewrite or delete changes you did not create.
- Never modify applied migrations. Add a new migration with the reserved number.
- Update generated contract bindings only after the contract interface is agreed.
- Add documentation when a public API, schema, environment variable, or workflow changes.

## Handoff Template

Every handoff should state:

```text
Scope:
Contracts changed:
Migration added:
Security decisions:
Tests run:
Known risks or follow-up:
```

The next contributor must be able to continue without inferring hidden decisions.

