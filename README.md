# Blockchain EMR

Monorepo cho hệ thống quản lý bệnh án điện tử, lưu file trên IPFS và quản lý
CID/quyền truy cập bằng Ethereum smart contract.

## Cấu trúc

```text
.
|-- frontend/        Next.js, Tailwind CSS, MetaMask
|-- backend/         Spring Boot, Security, JPA, Web3j
|-- blockchain/      Solidity, Hardhat
|-- infrastructure/  Docker Compose, MySQL, IPFS, Anvil
`-- docs/            Tài liệu kiến trúc và API
```

Backend dùng modular monolith. Mỗi nghiệp vụ có các lớp:

- `api`: REST controller và request/response DTO
- `application`: use case và điều phối nghiệp vụ
- `domain`: entity, value object, domain rule
- `infrastructure`: repository và adapter cụ thể

## Chạy môi trường phát triển

1. Sao chép `.env.example` thành `.env`.
2. Chạy hạ tầng: `docker compose -f infrastructure/docker-compose.yml up -d`
3. Chạy backend: `cd backend && ./mvnw package -DskipTests && java -jar target/emr-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev`
4. Chạy frontend: `cd frontend && npm install && npm run dev`
5. Deploy contract: `cd blockchain && npm install && npm run deploy:local`

Các cổng mặc định:

| Dịch vụ | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/api |
| Anvil RPC | http://localhost:8545 |
| IPFS API | http://localhost:5001 |
| IPFS Gateway | http://localhost:8081 |
| MySQL | localhost:3306 |

## Nguyên tắc dữ liệu

- Blockchain chỉ lưu CID, chủ sở hữu, quyền truy cập và dấu vết thời gian.
- IPFS lưu nội dung bệnh án đã mã hóa; không đưa dữ liệu y tế thô lên chain.
- MySQL lưu tài khoản, hồ sơ tổ chức và audit log phục vụ ứng dụng.
