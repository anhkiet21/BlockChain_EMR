# Shared Codex Rules

Use the repository skill at
`.codex/skills/blockchain-emr-development/SKILL.md` for every planning,
implementation, review, or verification task in this repository.

## Required Invariants

- Preserve the monorepo and backend modular-domain structure.
- Treat APIs as authenticated by default and prevent IDOR with object-level
  authorization in both controllers and application services.
- Derive current-user identity from the authenticated principal, never from a
  client-supplied user ID.
- Use Flyway for schema changes and never edit an applied migration.
- Use `.properties` Spring configuration, Java `Long` IDs, and MySQL
  `BIGINT AUTO_INCREMENT`.
- Keep plaintext medical and personally identifiable data off-chain.
- Preserve unrelated contributor changes and coordinate shared contracts and
  migration numbers.
- Add tests with implementation and run the relevant verification commands.

Before finishing, run the skill's rule checker and follow its handoff template.
