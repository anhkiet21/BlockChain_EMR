# Blockchain EMR

Monorepo for an electronic medical record demo using:

- Frontend: Next.js, Tailwind CSS, MetaMask.
- Backend: Spring Boot, Spring Security/JWT, JPA, Web3j.
- Storage: IPFS/Kubo, optional Pinata adapter.
- Database: MySQL.
- Blockchain: Solidity smart contract on local Anvil.
- Infrastructure: Docker Compose, Nginx gateway, Prometheus, MySQL backup job.

The system stores encrypted medical files in IPFS. The blockchain stores only access grants and immutable medical-record references such as CID and content hash.

## Project Structure

```text
.
|-- frontend/        Next.js UI and MetaMask flows
|-- backend/         Spring Boot API
|-- blockchain/      Solidity contracts and Hardhat scripts
|-- infrastructure/  Docker Compose, gateway, monitoring, backup
|-- docs/            Architecture and workflow documents
`-- .codex/          Project rules and local development skill
```

Backend modules follow a modular monolith layout:

- `api`: REST controllers and DTOs.
- `application`: use cases and transaction boundaries.
- `domain`: entities, value objects, domain rules.
- `infrastructure`: repositories and external adapters.
- `integration`: IPFS and blockchain adapters.

## Main Local URLs

When using Docker Compose, use the gateway:

| Service | URL |
|---|---|
| Frontend + API gateway | http://localhost:8088 |
| Backend API direct | http://localhost:8080/api |
| Swagger via gateway | http://localhost:8088/api/swagger-ui.html |
| Health via gateway | http://localhost:8088/api/actuator/health |
| Anvil RPC | http://localhost:8545 |
| IPFS API | http://localhost:5001 |
| IPFS gateway | http://localhost:8081 |
| Prometheus | http://localhost:9090 |
| MySQL | localhost:3306 |

## Environment

Create `.env` from `.env.example` if it does not exist:

```powershell
Copy-Item .env.example .env
```

Important variables:

```env
MYSQL_DATABASE=emr
MYSQL_USER=emr
MYSQL_PASSWORD=emr_password
MYSQL_ROOT_PASSWORD=root_password

NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CONTRACT_ADDRESS=

BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_CONTRACT_ADDRESS=

APP_SEED_TEST_USERS_ENABLED=true
APP_SEED_TEST_USERS_PASSWORD=password123
```

`NEXT_PUBLIC_CONTRACT_ADDRESS` and `BLOCKCHAIN_CONTRACT_ADDRESS` must be updated after deploying the smart contract.

## Run Everything With Docker

Start the full local stack:

```powershell
docker compose --env-file .env -f infrastructure\docker-compose.yml up -d --build
```

Check containers:

```powershell
docker ps
```

Check backend health:

```powershell
Invoke-WebRequest http://localhost:8088/api/actuator/health -UseBasicParsing
```

Open the app:

```text
http://localhost:8088
```

## Deploy Smart Contract

Anvil resets when the `emr-anvil` container is recreated. After starting the stack, deploy the contract:

```powershell
cd blockchain
npm install
npm run deploy:local
```

Output example:

```json
{
  "contract": "MedicalRecordRegistry",
  "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "chainId": "31337"
}
```

Copy `contractAddress` into `.env`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
BLOCKCHAIN_CONTRACT_ADDRESS=0xYourContractAddress
```

Restart backend with the updated env:

```powershell
docker compose --env-file .env -f infrastructure\docker-compose.yml up -d --no-build --force-recreate backend gateway
```

Rebuild frontend because `NEXT_PUBLIC_CONTRACT_ADDRESS` is compiled into the Next.js bundle:

```powershell
docker build `
  --build-arg NEXT_PUBLIC_API_URL=/api `
  --build-arg NEXT_PUBLIC_CHAIN_ID=31337 `
  --build-arg NEXT_PUBLIC_RPC_URL=http://localhost:8545 `
  --build-arg NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress `
  -t blockchain-emr-frontend:local frontend

docker compose --env-file .env -f infrastructure\docker-compose.yml up -d --no-build --force-recreate frontend gateway
```

## Test Accounts

Local seeding creates these accounts when `APP_SEED_TEST_USERS_ENABLED=true`:

```text
Patient:
patient@test.local / password123

Doctor:
doctor@test.local / password123

Admin:
admin@test.local / password123
```

The frontend login page also has quick-fill buttons for these accounts.

## MetaMask Local Network

Add a custom network in MetaMask:

```text
Network name: Anvil Local
RPC URL: http://localhost:8545
Chain ID: 31337
Currency symbol: ETH
Block explorer: empty
```

Select `Anvil Local` before signing wallet verification or blockchain transactions.

## Anvil Wallets With ETH

Anvil provides funded test wallets. Import these private keys into MetaMask if you want ready-to-use ETH.

Patient wallet:

```text
Address:     0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Doctor wallet:

```text
Address:     0x70997970c51812dc3a010c7d01b50e0d17dc79c8
Private key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

Admin wallet:

```text
Address:     0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc
Private key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

## Fund Any MetaMask Wallet

If you use another wallet, add local ETH with `anvil_setBalance`:

```powershell
$wallet = "0xYourWalletAddress"
$body = @{
  jsonrpc = "2.0"
  method = "anvil_setBalance"
  params = @($wallet, "0x21E19E0C9BAB2400000")
  id = 1
} | ConvertTo-Json -Compress

Invoke-RestMethod -Uri http://localhost:8545 -Method Post -ContentType "application/json" -Body $body
```

`0x21E19E0C9BAB2400000` is `10000 ETH`.

If MetaMask still shows no ETH:

1. Make sure the selected network is `Anvil Local`.
2. Make sure the selected account address is the funded address.
3. In MetaMask, use `Settings > Advanced > Clear activity and nonce data`.
4. Close the transaction popup and try again.

## Frontend Test Flow

Suggested order:

1. Login as Patient.
2. Go to `/profile` and verify/link wallet.
3. Go to `/patient/access` and grant Doctor access.
4. Login as Doctor.
5. Go to `/doctor/records`, search patient, upload file, sign `createRecord`.
6. Go to `/blockchain` and check access, transaction status, or on-chain record.
7. Login as Admin.
8. Go to `/admin` and test department create/update, doctor verification, blockchain event sync.

## Stop The Stack

Stop containers but keep local volumes:

```powershell
docker compose --env-file .env -f infrastructure\docker-compose.yml down
```

Stop and delete local volumes:

```powershell
docker compose --env-file .env -f infrastructure\docker-compose.yml down -v
```

Warning: `down -v` deletes local MySQL/IPFS/Prometheus data.

## Useful Checks

Backend tests:

```powershell
cd backend
.\mvnw.cmd test
```

Frontend build:

```powershell
cd frontend
npm install
npm run build
```

Smart contract tests:

```powershell
cd blockchain
npm install
npm test
```
