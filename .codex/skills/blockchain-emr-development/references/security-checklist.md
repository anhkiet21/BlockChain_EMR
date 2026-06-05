# Security And IDOR Checklist

Apply this checklist to every API and application use case.

## Authentication Boundary

- Public endpoints are limited to health checks and explicitly approved auth
  entry points.
- All other endpoints require a valid access token.
- Refresh tokens are accepted only by the refresh/logout lifecycle that owns them.
- Validate token type, signature, expiry, revocation state, and subject.
- Never log access tokens, refresh tokens, passwords, wallet signatures, or raw
  medical data.

## Object-Level Authorization

For every path, query, or body field containing an ID:

1. Identify the resource owner and permitted roles.
2. Load the resource within the authorized scope, or explicitly compare its owner
   to the authenticated principal.
3. Reject access before returning any resource detail.
4. Repeat the critical authorization rule in the application service so internal
   callers cannot bypass it.
5. Test with a valid token belonging to a different account.

Use `/me` endpoints for current-user operations. Derive user identity from the
JWT principal; never accept `userId` from the client for these operations.

Role checks alone do not prevent IDOR. A doctor role does not automatically grant
access to every patient or medical record. Verify consent, assignment, ownership,
verification status, and record-level grants as required by the use case.

## Medical Data And Blockchain

- Return the minimum fields required by the caller.
- Search endpoints return summaries, never full sensitive records.
- Store protected files on IPFS only after applying the project's encryption and
  access strategy.
- Store only hashes, proofs, minimal identifiers, and grant state on-chain.
- Treat CID knowledge as insufficient authorization to retrieve a medical record.

## Required Security Tests

For each resource endpoint, cover:

- no token -> `401`
- malformed/expired token -> `401`
- valid token with wrong role -> `403`
- valid token with correct role but another owner's resource -> `403` or `404`
- valid permitted caller -> success
- revoked/expired grant -> denied
- tampered resource ID or user ID -> denied

