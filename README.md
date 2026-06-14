# Blockchain EMR

Blockchain EMR là hệ thống quản lý hồ sơ bệnh án điện tử theo mô hình hybrid: backend quản lý nghiệp vụ, IPFS lưu tệp bệnh án đã mã hóa, blockchain lưu bằng chứng toàn vẹn và quyền truy cập tối thiểu.

Dự án này phục vụ demo/đồ án về chia sẻ hồ sơ bệnh án an toàn. Đây không phải HIS đầy đủ, không xử lý ca trực, phòng khám, chỉ định, đơn thuốc, thanh toán hoặc tích hợp pháp lý y tế thật.

## Công Nghệ Chính

| Tầng | Công nghệ | Vai trò |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | Giao diện bệnh nhân, bác sĩ, admin |
| Wallet | MetaMask, ethers.js | Ký giao dịch blockchain và liên kết ví |
| Backend | Spring Boot 3, Java 17+, Spring Security, JWT | API nghiệp vụ, xác thực, phân quyền, kiểm tra IDOR |
| Database | MySQL, Flyway, Spring Data JPA | Lưu tài khoản, hồ sơ, cơ sở y tế, audit log |
| Storage | IPFS Kubo | Lưu ciphertext của tệp bệnh án |
| Blockchain | Solidity, Hardhat, Anvil, Web3j | Smart contract, test/deploy local, backend đọc dữ liệu on-chain |
| Infra | Docker Compose, Nginx, Prometheus | Chạy môi trường local, gateway, monitoring |

## Nguyên Tắc Dữ Liệu

| Nơi lưu | Dữ liệu |
| --- | --- |
| MySQL | Tài khoản, vai trò, hồ sơ bệnh nhân/bác sĩ, cơ sở y tế, metadata hồ sơ, audit log |
| IPFS | Tệp bệnh án đã mã hóa AES-256-GCM |
| Blockchain | CID, hash nội dung gốc, ví bệnh nhân, ví người tải lên, quyền facility, mã facility, version record |

Không lưu plaintext bệnh án, CCCD, JWT, refresh token, chữ ký ví, khóa AES hoặc thông tin cá nhân nhạy cảm trên blockchain.

## Blockchain Trong Dự Án

Smart contract chính là `MedicalRecordRegistry`.

Contract lưu:

- `activeFacilities[facilityId]`: cơ sở y tế có được kích hoạt on-chain không.
- `doctorFacilities[doctorWallet]`: ví bác sĩ thuộc cơ sở y tế nào.
- `facilityAccessGrants[patientWallet][facilityId]`: bệnh nhân đã cấp quyền cho cơ sở y tế chưa.
- `records[recordId]`: CID, hash nội dung, ví bệnh nhân, ví tác giả, thời gian, record trước đó.
- `recordMetadata[recordId]`: nguồn hồ sơ `PATIENT_UPLOADED` hoặc `DOCTOR_UPLOADED`, ví upload, facility.
- `successorRecordIds[recordId]`: phiên bản kế tiếp khi hồ sơ được đính chính.

Điều kiện quan trọng:

- Bệnh nhân tự upload thì ví ký giao dịch phải là ví bệnh nhân.
- Bác sĩ upload/sửa/xem hồ sơ on-chain thì ví bác sĩ phải được gán vào đúng facility bằng `setDoctorFacility`.
- Facility đó phải đang active và bệnh nhân phải cấp quyền bằng `grantFacilityAccess`.
- Khi bệnh nhân thu hồi quyền, bác sĩ thuộc facility đó không còn đọc được record doctor-uploaded trên contract.

Backend không tự ký thay bệnh nhân hoặc bác sĩ. Người dùng ký giao dịch bằng MetaMask, backend đọc và xác minh receipt/event/on-chain state.

## Cấu Trúc Thư Mục

```text
backend/        Spring Boot API
frontend/       Next.js UI
blockchain/     Solidity contract, Hardhat test, deploy script
infrastructure/ Docker Compose, Nginx, MySQL, IPFS, Anvil, monitoring
docs/           Tài liệu kỹ thuật
```

## Yêu Cầu Cài Đặt

- Docker Desktop
- Node.js 20+
- Java 17+ hoặc 21
- MetaMask extension
- Git

Nếu chỉ chạy bằng Docker Compose, Docker Desktop là phần quan trọng nhất. Node/Java cần khi bạn muốn chạy test hoặc dev từng module.

## Chạy Dự Án Bằng Docker

Tại thư mục gốc dự án:

```powershell
Copy-Item .env.example .env
docker compose --env-file .env -f infrastructure\docker-compose.yml up -d --build
```

Các URL chính:

| Dịch vụ | URL |
| --- | --- |
| Frontend | http://localhost:8088 |
| Backend API | http://localhost:8080/api |
| Swagger qua gateway | http://localhost:8088/api/swagger-ui.html |
| Anvil RPC | http://localhost:8545 |
| IPFS API | http://localhost:5001 |
| IPFS Gateway | http://localhost:8081/ipfs |
| Prometheus | http://localhost:9090 |

Xem log:

```powershell
docker compose --env-file .env -f infrastructure\docker-compose.yml logs -f backend
docker compose --env-file .env -f infrastructure\docker-compose.yml logs -f frontend
```

Dừng dự án:

```powershell
docker compose --env-file .env -f infrastructure\docker-compose.yml down
```

Xóa sạch database/IPFS/blockchain local:

```powershell
docker compose --env-file .env -f infrastructure\docker-compose.yml down -v
```

## Deploy Smart Contract Local

Sau khi Docker đã chạy Anvil:

```powershell
cd blockchain
npm install
npm run deploy:local
```

Lệnh deploy sẽ in ra `contractAddress`. Copy địa chỉ đó vào `.env`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xDiaChiContract
BLOCKCHAIN_CONTRACT_ADDRESS=0xDiaChiContract
```

Sau khi đổi contract address, chạy lại backend và frontend để nhận cấu hình mới:

```powershell
cd ..
docker compose --env-file .env -f infrastructure\docker-compose.yml up -d --build backend frontend gateway
```

Lưu ý: Anvil là blockchain local. Nếu container Anvil bị xóa/recreate hoặc chạy `down -v`, state blockchain mất và phải deploy lại contract.

## Gán Ví Bác Sĩ Vào Cơ Sở Y Tế On-Chain

Contract mới yêu cầu ví bác sĩ phải thuộc cơ sở y tế trên blockchain. Với tài khoản test mặc định, doctor wallet là `0x70997970c51812dc3a010c7d01b50e0d17dc79c8` và facility là `BV001`.

Sau khi deploy contract, chạy:

```powershell
cd blockchain
npx hardhat console --network localhost
```

Trong console:

```javascript
const registry = await ethers.getContractAt("MedicalRecordRegistry", "0xDiaChiContract");
const facilityId = ethers.encodeBytes32String("BV001");
await (await registry.setFacilityStatus(facilityId, true)).wait();
await (await registry.setDoctorFacility("0x70997970c51812dc3a010c7d01b50e0d17dc79c8", facilityId)).wait();
await registry.doctorFacilities("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
```

Nếu bỏ qua bước này, bác sĩ sẽ bị contract từ chối khi upload/sửa/xem hồ sơ do facility upload.

## Cấu Hình MetaMask Local

Thêm network mới trong MetaMask:

| Trường | Giá trị |
| --- | --- |
| Network name | Localhost 8545 |
| RPC URL | http://localhost:8545 |
| Chain ID | 31337 |
| Currency symbol | ETH |

Import ví test bằng private key của Anvil:

| Mục đích | Address | Private key |
| --- | --- | --- |
| Patient / deployer / owner contract | `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| Doctor | `0x70997970c51812dc3a010c7d01b50e0d17dc79c8` | `0x59c6995e998f97a5a0044966f094538d9e86dae9b9c471163793f7a4fd17a3b` |
| Ví phụ | `0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc` | `0x5de4111a24b7d4b5c1f43fcb18e1b9b58a12b3f76d9c9b849e7c4815f6f2e9b3` |

Các ví Anvil mặc định có ETH sẵn khi Anvil mới chạy. Đây là ETH giả lập, chỉ dùng trong local.

Nếu MetaMask chưa hiện ETH:

- Kiểm tra đang chọn network `Localhost 8545`.
- Kiểm tra RPC URL đúng `http://localhost:8545`.
- Reset account trong MetaMask nếu nonce/balance bị cache sai.
- Nếu đã recreate Anvil, import lại ví hoặc deploy lại contract.

## Tài Khoản Test

Các tài khoản sau được seed khi `APP_SEED_TEST_USERS_ENABLED=true`.

| Vai trò | Đăng nhập | Mật khẩu |
| --- | --- | --- |
| Bệnh nhân | `079000000001` | `password123` |
| Bác sĩ | `079000000002` | `password123` |
| Admin | `admin@test.local` | `password123` |

Bác sĩ test đã được verify và thuộc facility `BV001`.

Nếu muốn backend tự liên kết ví test với tài khoản test, đặt trong `.env`:

```env
APP_SEED_TEST_WALLETS_ENABLED=true
```

Sau đó restart backend:

```powershell
docker compose --env-file .env -f infrastructure\docker-compose.yml up -d --force-recreate backend
```

Ví được gắn khi bật seed wallet:

| Tài khoản | Ví |
| --- | --- |
| Bệnh nhân `079000000001` | `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` |
| Bác sĩ `079000000002` | `0x70997970c51812dc3a010c7d01b50e0d17dc79c8` |

Nếu `APP_SEED_TEST_WALLETS_ENABLED=false`, bạn vẫn đăng nhập được nhưng cần vào hồ sơ để liên kết ví bằng MetaMask.

## Luồng Test Nhanh

1. Chạy Docker Compose.
2. Deploy smart contract local.
3. Copy contract address vào `.env`, rebuild/recreate backend + frontend.
4. Import patient wallet và doctor wallet vào MetaMask.
5. Gán doctor wallet vào `BV001` bằng `setDoctorFacility`.
6. Đăng nhập bệnh nhân `079000000001`.
7. Vào quyền truy cập, cấp quyền cho `BV001` và ký MetaMask.
8. Đăng nhập bác sĩ `079000000002`.
9. Upload hồ sơ cho bệnh nhân, ký MetaMask bằng doctor wallet.
10. Đăng nhập bệnh nhân để xem hồ sơ, kiểm tra toàn vẹn và audit log.
11. Thu hồi quyền `BV001`, sau đó kiểm tra bác sĩ không còn xem/tải hồ sơ bằng quyền thường.

## Chạy Từng Module Khi Dev

Backend:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Blockchain:

```powershell
cd blockchain
npm install
npm test
```

## Build Và Test

Từ từng thư mục:

```powershell
cd backend
.\mvnw.cmd verify

cd ..\frontend
npm run build

cd ..\blockchain
npm test
```

Rule checker của repo:

```powershell
powershell -ExecutionPolicy Bypass -File .codex/skills/blockchain-emr-development/scripts/check-project-rules.ps1
git diff --check
```

## Ghi Chú Bảo Mật

- API mặc định yêu cầu JWT, trừ auth/public endpoints.
- Backend kiểm tra object-level authorization để tránh IDOR.
- Backend lấy current user từ JWT principal, không tin `userId` client gửi lên.
- CID không được xem là quyền truy cập. Có CID vẫn phải qua kiểm tra quyền.
- Blockchain chỉ lưu hash/CID/quyền tối thiểu, không lưu dữ liệu bệnh án rõ.
- Private key trong README chỉ là private key mặc định của Anvil local, không dùng cho testnet/mainnet.

## Giới Hạn Hiện Tại

- Chưa tích hợp HL7/FHIR, VNeID, ký số pháp lý hoặc HSM/KMS thật.
- Quyền truy cập cấp theo cơ sở y tế, không cấp theo từng bác sĩ riêng lẻ.
- Admin verify bác sĩ trong database; contract chỉ biết ví bác sĩ thuộc facility qua `doctorFacilities`.
- Anvil local không bền vững, mất state khi reset container.
- Khóa mã hóa local phục vụ demo; triển khai thật cần quản lý khóa nghiêm ngặt hơn.
