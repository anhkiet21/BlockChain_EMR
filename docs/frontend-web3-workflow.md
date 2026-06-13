# Frontend Web3 Workflow

The Next.js frontend owns browser session UX and MetaMask interaction. Backend
authorization remains authoritative for every protected resource and ID.

## Environment

```properties
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed MedicalRecordRegistry V2 address>
```

Restart Next.js after changing a `NEXT_PUBLIC_*` value.

Create `frontend/.env.local` from `frontend/.env.example` for local development.
The root `.env` is used by Docker Compose and is not automatically loaded by a
Next.js process started from `frontend/`.

## Authentication And Wallet Binding

1. User signs in through `/auth/login`.
2. Access and refresh tokens are retained in browser `sessionStorage`, never
   written to logs, URLs, or blockchain.
3. The API client retries one failed authenticated request after rotating the
   refresh token.
4. The user connects MetaMask, requests a backend nonce, signs its message, and
   submits the signature to `/auth/wallet/verify`.
5. Before a transaction, the frontend verifies the expected chain and signer
   address. The backend independently verifies identity, ownership, calldata,
   receipt, event, and object-level authorization.

## Patient Access Flow

1. Enter the verified doctor profile ID and doctor wallet.
2. Call `/access-control/transactions/prepare`.
3. Sign the prepared `grantAccess` or `revokeAccess` transaction with MetaMask.
4. Submit the mined transaction hash to `/access-control/transactions/verify`.
5. Read synchronized grant and revoke history from `/access-control/history`.

## Doctor Record Flow

1. Search for a patient summary and enter the patient's verified wallet.
2. Upload the medical file. The backend encrypts it before IPFS storage and
   returns its CID and integrity hash.
3. Sign `createRecord(patient, cid, contentHash)` with the verified doctor wallet.
4. Parse the `RecordCreated` event and submit its record ID to `/medical-records`.
5. The backend verifies current application/on-chain access, patient wallet,
   author wallet, CID, and content hash before persisting metadata.
6. List and download operations repeat authorization and on-chain integrity
   checks; knowing a record ID or CID is insufficient.

## Local Verification

```powershell
Set-Location frontend
npm install
npm run build
npm run dev
```

Use MetaMask with local chain ID `31337` and an account funded by Anvil. The
patient-facing doctor selection currently requires a known verified doctor
profile ID and wallet because the backend intentionally exposes no public doctor
directory yet.

If a user rejects a transaction after upload, the encrypted IPFS object and its
SQL metadata can remain unattached to a medical record. A scheduled orphan-file
retention/cleanup job is a backend operations follow-up; the frontend never
deletes medical objects directly.
