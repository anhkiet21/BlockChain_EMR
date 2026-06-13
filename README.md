# Blockchain EMR

Hệ thống quản lý hồ sơ bệnh án điện tử ứng dụng blockchain. Đây không phải hệ
thống HIS và không xử lý phòng khám, ca trực, vòng khám hoặc phân công điều trị.

## Kiến trúc lưu trữ

- `frontend/`: Next.js và MetaMask.
- `backend/`: Spring Boot, JWT, MySQL, IPFS orchestration và Web3j.
- `blockchain/`: Solidity contract và Hardhat.
- `infrastructure/`: Docker Compose, MySQL, Kubo IPFS, Anvil, Nginx, Prometheus.

File bệnh án được mã hóa AES-256-GCM trước khi lưu IPFS. Blockchain chỉ lưu quyền
`patientWallet -> facilityId`, CID, SHA-256 hash, uploader, `sourceType`, facility ID
và timestamp. Không lưu file, CCCD, PII, JWT hoặc khóa mã hóa trên chain.

## Vai trò

- **Patient**: đăng ký/đăng nhập bằng CCCD, liên kết ví, cấp/thu hồi quyền facility,
  duyệt access request và upload hồ sơ cá nhân.
- **Doctor**: chọn facility khi đăng ký, liên kết ví, chờ admin verify, gửi access
  request và đọc/upload khi facility đã được cấp quyền.
- **Healthcare Facility**: seed sẵn, không có tài khoản. ID: `BV001`, `BV002`, `PK001`.
- **Admin**: không cần ví; verify/reject doctor và lock/unlock tài khoản.

Quyền được cấp ở cấp cơ sở y tế. Kiểm soát nhân sự nội bộ của bệnh viện nằm ngoài
phạm vi demo. CCCD chỉ mô phỏng định danh tương tự VNeID; hệ thống không tích hợp
VNeID hoặc Cơ sở dữ liệu quốc gia về dân cư. Ví deployer chỉ deploy/seed contract.

## Chạy local

```powershell
Copy-Item .env.example .env
docker compose --env-file .env -f infrastructure\docker-compose.yml up -d --build
```

| Dịch vụ | URL |
| --- | --- |
| Frontend/gateway | http://localhost:8088 |
| Backend | http://localhost:8080/api |
| Swagger | http://localhost:8088/api/swagger-ui.html |
| Anvil | http://localhost:8545 |
| IPFS API | http://localhost:5001 |

## Deploy contract

```powershell
cd blockchain
npm install
npm run deploy:local
```

Deploy script seed `BV001`, `BV002`, `PK001` và in `contractAddress`. Copy vào `.env`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
BLOCKCHAIN_CONTRACT_ADDRESS=0x...
```

```powershell
docker compose --env-file .env -f infrastructure\docker-compose.yml up -d --no-build --force-recreate backend gateway

docker build `
  --build-arg NEXT_PUBLIC_API_URL=/api `
  --build-arg NEXT_PUBLIC_CHAIN_ID=31337 `
  --build-arg NEXT_PUBLIC_RPC_URL=http://localhost:8545 `
  --build-arg NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress `
  -t blockchain-emr-frontend:local frontend

docker compose --env-file .env -f infrastructure\docker-compose.yml up -d --no-build --force-recreate frontend gateway
```

Anvil mất state khi container bị recreate, vì vậy phải deploy/seed contract lại.

## Tài khoản test

```text
Patient: 079000000001 / password123
Doctor:  079000000002 / password123
Admin:   admin@test.local / password123
```

Patient wallet: `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`

Doctor wallet: `0x70997970c51812dc3a010c7d01b50e0d17dc79c8`

MetaMask local: RPC `http://localhost:8545`, chain ID `31337`.

## Luồng kiểm thử

1. Start Docker và deploy contract.
2. Patient đăng nhập bằng CCCD, liên kết MetaMask.
3. Doctor đăng nhập, liên kết ví, thuộc `BV001`.
4. Admin verify doctor.
5. Doctor tìm patient và gửi access request.
6. Patient duyệt và ký `grantFacilityAccess(BV001)`.
7. Doctor đọc/upload hồ sơ.
8. Patient upload hồ sơ cá nhân.
9. Kiểm tra `PATIENT_UPLOADED` và `DOCTOR_UPLOADED`.
10. Patient revoke; doctor phải bị chặn khi đọc lại.

## Build và test

```powershell
cd backend
.\mvnw.cmd verify

cd ..\frontend
npm run build

cd ..\blockchain
npm test
```
