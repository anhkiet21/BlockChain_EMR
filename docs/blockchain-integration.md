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
`integration/blockchain/generated`.
