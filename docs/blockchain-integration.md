# Blockchain Integration

Backend does not hold private keys or sign grant/revoke transactions. The frontend
uses MetaMask; the backend reads, verifies, and synchronizes on-chain state.

Authenticated APIs:

```text
GET  /api/blockchain/access?patientWallet=...&granteeWallet=...
GET  /api/blockchain/records/{recordId}?callerWallet=...
GET  /api/blockchain/transactions/{transactionHash}
POST /api/blockchain/events/sync                         ADMIN
```

Wallet query parameters must belong to the authenticated account, except for an
administrator performing reconciliation. The Java wrapper is generated from the
compiled `MedicalRecordRegistry.sol` ABI and lives under
`integration/blockchain/generated`. Runtime code is grouped under `api`,
`application`, `domain`, and `infrastructure`.

## Contract V2

`MedicalRecordRegistry` stores only encrypted-content references and integrity
hashes. It never stores plaintext medical data.

- Patients call `grantFacilityAccess` and `revokeFacilityAccess` through MetaMask.
- Patients and verified doctors call `createRecordWithMetadata` through MetaMask.
- Authorized doctors create immutable updates with `createRecordVersion`.
- `getRecord`, `getSuccessorRecordId`, and `isLatestVersion` reject callers
  without current patient authorization.
- The backend verifies CID, content hash, patient wallet, author wallet,
  transaction signer, contract address, and emitted event before trusting
  on-chain data.

## Trust Boundary

The blockchain proves patient consent and that a wallet committed a specific
CID/hash payload. The backend remains authoritative for user identity, verified
doctor status, current facility employment, and access to encryption keys.

Every confirmation verifies the mined transaction's signer, destination,
calldata, status, emitted event, and resulting on-chain state. A successful but
unrelated transaction cannot approve an access request or attach a record.
Facility membership is intentionally not duplicated on-chain because it changes
operationally and does not grant access to plaintext without backend approval.

V2 is not ABI-compatible with the earlier contract. Deploy it as a new contract
and update `BLOCKCHAIN_CONTRACT_ADDRESS`; do not point the V2 backend wrapper at
an older deployment.
