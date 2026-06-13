# MedicalRecordRegistry

`MedicalRecordRegistry` stores only authorization state and protected-record
references. Plaintext medical or identity data must remain off-chain.

## Facility Access

- Facilities are seeded by the contract owner with `setFacilityStatus`.
- Patients grant or revoke access for a `facilityId` from MetaMask.
- A verified doctor can use a patient's records only through the doctor's active
  backend facility membership and the matching on-chain facility grant.
- The backend verifies the mined transaction and synchronizes its SQL projection;
  SQL state alone never authorizes medical-record access.

Legacy wallet-to-wallet grant functions remain for compatibility, but the new
patient and doctor workflows do not use them.

## Medical Record References

`createRecordWithMetadata` stores the encrypted-content CID, integrity hash,
patient/uploader wallets, source type, facility identifier, timestamp, and
version reference. It does not store profile fields or plaintext record content.

`sourceType` distinguishes `PATIENT_UPLOADED` and `DOCTOR_UPLOADED`. Doctor
records carry a facility identifier so the backend can enforce the same consent
boundary when listing or downloading content.

## Deployment

```powershell
Set-Location blockchain
npm run compile
npm test
npm run deploy:local
```

The deployment script seeds `BV001`, `BV002`, and `PK001`. Update
`BLOCKCHAIN_CONTRACT_ADDRESS` after every deployment and regenerate the backend
binding whenever the ABI changes.
