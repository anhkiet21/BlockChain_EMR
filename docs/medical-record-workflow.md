# Medical Record Workflow

The doctor workflow requires both an active SQL `access_grants` row and an active
smart-contract `accessGrants(patientWallet, doctorWallet)` value. Both wallet
addresses must be linked to the corresponding authenticated users.

## Flow

1. The verified doctor uploads an encrypted file for a patient:
   `POST /api/medical-records/patients/{patientId}/files`.
2. The frontend uses the returned CID and SHA-256 content hash in a MetaMask-signed
   `createRecord(patient, cid, contentHash)` transaction.
3. After the transaction succeeds, the frontend submits its `onChainRecordId` to
   `POST /api/medical-records`.
4. The backend verifies the on-chain CID, content hash, patient wallet, and author
   wallet before saving relational metadata.

## Protected APIs

```text
POST /api/medical-records/patients/{patientId}/files
POST /api/medical-records
POST /api/medical-records/{recordId}/files
GET  /api/medical-records
GET  /api/medical-records/{recordId}
GET  /api/medical-records/{recordId}/files/{fileId}/content
```

All endpoints require a doctor access token. List, detail, upload, edit, and
download operations repeat object-level application and on-chain authorization.
Successful `UPLOAD`, `CREATE`, `EDIT`, `VIEW`, and `DOWNLOAD` actions are written
to `record_access_logs`.
