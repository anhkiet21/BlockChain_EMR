# Testing And Operations

## Test Layers

Run the complete backend suite, including a real MySQL 8.4 Testcontainer:

```powershell
Set-Location backend
.\mvnw.cmd verify
```

The Testcontainers test skips only when Docker is unavailable. Default tests use
H2 and the in-memory storage adapter. Unit tests cover application authorization
and AES-GCM encryption behavior.

Run the smart-contract suite:

```powershell
Set-Location blockchain
npm test
```

## Local IPFS Smoke Test

```powershell
docker compose -f infrastructure/docker-compose.yml up -d ipfs
Set-Location backend
$env:IPFS_SMOKE_TEST="true"
.\mvnw.cmd -Dtest=KuboStorageSmokeTests test
```

## Local Blockchain Smoke Test

Start Anvil, deploy the smoke contract, then use the JSON output as environment
variables for the backend RPC test:

```powershell
docker compose -f infrastructure/docker-compose.yml up -d anvil
Set-Location blockchain
npx hardhat run scripts/backend-smoke.ts --network localhost

Set-Location ..\backend
$env:BLOCKCHAIN_SMOKE_TEST="true"
$env:BLOCKCHAIN_CONTRACT_ADDRESS="<contractAddress>"
$env:SMOKE_PATIENT_WALLET="<patientWallet>"
$env:SMOKE_DOCTOR_WALLET="<doctorWallet>"
$env:SMOKE_TRANSACTION_HASH="<transactionHash>"
.\mvnw.cmd -Dtest=Web3jBlockchainRpcTests test
```

## Docker

Build only the backend image:

```powershell
Set-Location backend
docker build -t blockchain-emr-backend:local .
```

Run the full local platform:

```powershell
docker compose -f infrastructure/docker-compose.yml up -d
```

Important URLs:

- API: `http://localhost:8080/api`
- Swagger UI: `http://localhost:8080/api/swagger-ui.html`
- Health: `http://localhost:8080/api/actuator/health`
- Prometheus: `http://localhost:9090`

Production must replace all default secrets in `.env`, restrict access to
Swagger, Prometheus, and Actuator at the network layer, and use a durable backup
target outside the Docker host.

## Backup And Restore

`mysql-backup` creates compressed, transaction-consistent dumps in the
`mysql-backups` volume. The default interval is 24 hours and retention is 7
days. Configure these with `BACKUP_INTERVAL_SECONDS` and
`BACKUP_RETENTION_DAYS`.

List backup files:

```powershell
docker compose -f infrastructure/docker-compose.yml exec mysql-backup ls -lh /backups
```

Restore a selected backup after stopping backend writes:

```powershell
docker compose -f infrastructure/docker-compose.yml exec -T mysql-backup `
  bash -c "gunzip -c /backups/<backup-file>.sql.gz" |
docker compose -f infrastructure/docker-compose.yml exec -T mysql `
  mysql -uemr -pemr_password emr
```

Backups must be periodically restored into a separate environment to verify
that they are usable.

## Monitoring And Logs

Prometheus scrapes `/api/actuator/prometheus` every 15 seconds and retains
metrics for 15 days. Spring Boot exposes health, info, and Prometheus metrics.

Application file logs rotate at 20 MB, retain 30 files, and cap total log size
at 1 GB by default. Docker JSON logs rotate at 20 MB with five files per
container. Each API response and application log contains an `X-Request-Id` for
request tracing.
