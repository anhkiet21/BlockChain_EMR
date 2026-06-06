# Access Control API

All access-control endpoints require a patient JWT. The backend derives the
patient identity from the authenticated principal and never accepts a patient
profile ID from the client.

## MetaMask Flow

1. Call `POST /access-control/transactions/prepare`.
2. Send the returned `from`, `to`, `data`, and `value` fields with MetaMask on
   the returned `chainId`.
3. After the transaction is mined, call
   `POST /access-control/transactions/verify` with the transaction hash and the
   same doctor, wallet, and grant state.
4. Read the patient's paginated grant/revoke history from
   `GET /access-control/history`.

The verify endpoint checks the mined transaction status, signer, contract
address, calldata, and matching `AccessGranted` or `AccessRevoked` event before updating SQL. A
transaction hash can be synchronized only once; repeating the same request is
idempotent.

## Requests

Prepare:

```json
{
  "doctorProfileId": 12,
  "patientWallet": "0x...",
  "doctorWallet": "0x...",
  "granted": true
}
```

Verify:

```json
{
  "doctorProfileId": 12,
  "patientWallet": "0x...",
  "doctorWallet": "0x...",
  "granted": true,
  "transactionHash": "0x..."
}
```

Both wallets must already be verified and linked to the expected patient and
doctor accounts. The doctor must also be verified.
