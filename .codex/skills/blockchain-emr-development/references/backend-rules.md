# Backend Rules

## Spring Boot Structure

- Keep controllers thin. Validate input, call one application use case, and map
  the response.
- Put transactions, authorization, and orchestration in application services.
- Keep domain entities free of HTTP and external integration concerns.
- Put Spring Data repositories and external clients in infrastructure packages.
- Use request and response DTOs. Do not expose JPA entities from controllers.
- Follow existing `ApiResponse`, `ApiError`, and `PageResponse` conventions.

## Database

- Use Java `Long` IDs with `GenerationType.IDENTITY`.
- Use `BIGINT AUTO_INCREMENT` in MySQL migrations.
- Use Flyway for every schema or seed-data change.
- Never edit existing `V1` through `V4` migrations. Create the next available
  migration and coordinate its version with other contributors.
- Keep Hibernate schema behavior at `validate`; never use `create`, `update`, or
  `create-drop`.
- Add indexes for actual query predicates and ordering, then verify the query.

## Configuration

- Use `application.properties` and `application-<profile>.properties`.
- Keep secrets in environment variables. Commit only safe defaults and examples.
- Add new variables to `.env.example` and relevant documentation.

## API And Transactions

- Validate all request DTOs.
- Use stable error codes and avoid leaking internal exceptions or sensitive data.
- Paginate list and search endpoints; cap page sizes.
- Mark mutating use cases transactional.
- Design retries and idempotency for IPFS and blockchain writes.
- Persist enough state to reconcile external operations after failures.

## Tests

- Add focused unit tests for domain rules where useful.
- Add integration tests for repository queries, transactions, and security.
- For every protected endpoint, test unauthenticated, unauthorized, allowed, and
  cross-account access.

