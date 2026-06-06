# Staging Deployment Checklist

## Required Secrets

- Generate unique MySQL credentials and a JWT secret of at least 32 random bytes.
- Generate a random 32-byte AES key and store its Base64 form as
  `STORAGE_ENCRYPTION_KEY`.
- Use a dedicated RPC provider URL and Pinata JWT. Never commit these values.
- Deploy `MedicalRecordRegistry` V2 and set both backend
  `BLOCKCHAIN_CONTRACT_ADDRESS` and frontend `NEXT_PUBLIC_CONTRACT_ADDRESS`.

## Deployment Order

1. Provision private MySQL, IPFS/Pinata, RPC, backup storage, and monitoring.
2. Deploy the V2 contract and record its chain ID, address, deployment block,
   compiler version, and verified source.
3. Build frontend with the final public API URL, chain ID, RPC URL, and contract
   address. These are browser-visible configuration, not secrets.
4. Start backend and allow Flyway to apply migrations.
5. Start frontend and TLS reverse proxy.
6. Verify health, authentication, wallet binding, grant/revoke, upload,
   `createRecord`, list, download, revoke denial, metrics, and backup restore.

## Production Controls

- Expose only HTTPS ingress. Keep MySQL, IPFS API, RPC management endpoints,
  Prometheus, Swagger, and actuator metrics on private networks.
- Use a managed secret store and rotate JWT, database, Pinata, and RPC
  credentials through a documented procedure.
- Use multiple backend instances only with shared/distributed ingress rate
  limiting and a single-leader or distributed-lock strategy for scheduled jobs.
- Alert on API error rate, RPC failure, event sync lag, backup age, disk usage,
  orphan cleanup failures, and repeated authorization denials.
- Restore backups into an isolated environment regularly; a backup that has not
  been restored is not verified.

## Release Gate

Run:

```powershell
backend\mvnw.cmd -f backend\pom.xml verify
Set-Location frontend; npm ci; npm run build; npm audit --omit=dev
Set-Location ..\blockchain; npm ci; npm test; npm audit --omit=dev
Set-Location ..; docker compose -f infrastructure\docker-compose.yml config --quiet
```

Then complete a MetaMask E2E test on the selected staging chain. Mainnet or a
production network should not be used before an independent smart-contract and
application security review.
