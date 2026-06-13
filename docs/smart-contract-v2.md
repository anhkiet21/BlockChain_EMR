# MedicalRecordRegistry V2

`MedicalRecordRegistry` is immutable and has no owner, proxy, privileged admin,
or private-key custody in the backend.

## Access Control

- Patients call `grantAccess(doctor)` and `revokeAccess(doctor)` from MetaMask.
- Duplicate grants and revocations revert with custom errors.
- `hasAccess(patient, grantee)` also returns true for the patient.
- Backend transaction verification checks signer, contract, calldata, receipt,
  and the matching `AccessGranted` or `AccessRevoked` event.

## Medical Record References

`createRecord(patient, cid, contentHash)` stores only:

- CID of encrypted content.
- SHA-256 integrity hash.
- Patient and author wallet addresses.
- Creation timestamp.
- Previous version ID.

No plaintext medical data or personal profile data is stored on-chain.

`createRecordVersion(previousRecordId, cid, contentHash)` creates an immutable
successor and rejects branching from a superseded record. Revoked doctors cannot
read records or create new versions.

## Deployment

```powershell
Set-Location blockchain
npm run compile
npm test
npm run test:gas
npm run deploy:local
```

After every deployment, update `BLOCKCHAIN_CONTRACT_ADDRESS` for that
environment. Existing V1 deployments are not upgradeable and must not be used
with the V2 backend ABI.
