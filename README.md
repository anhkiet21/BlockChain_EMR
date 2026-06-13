# Blockchain EMR

Hệ thống quản lý hồ sơ bệnh án điện tử ứng dụng blockchain. Đây không phải hệ
thống HIS và không xử lý phòng khám, ca trực, vòng khám hoặc phân công điều trị.

## Mức độ ứng dụng blockchain

Đây là một hệ thống quản lý hồ sơ bệnh án điện tử theo kiến trúc hybrid:

- Blockchain là nguồn xác minh quyền truy cập của cơ sở y tế và bằng chứng toàn vẹn của hồ sơ.
- Backend là nguồn nghiệp vụ cho tài khoản, vai trò, hồ sơ cá nhân, trạng thái bác sĩ và metadata vận hành.
- IPFS lưu nội dung hồ sơ đã mã hóa; MySQL không lưu nội dung tệp bệnh án.
- MetaMask được dùng để chứng minh quyền sở hữu ví và ký các giao dịch cần sự đồng ý của người dùng.

Blockchain không được dùng như cơ sở dữ liệu bệnh án. Cách phân tách này giữ dữ liệu y tế và
thông tin định danh khỏi chuỗi công khai, đồng thời vẫn cung cấp bằng chứng khó sửa đổi cho
quyền truy cập và nội dung hồ sơ.

## Kiến trúc lưu trữ

- `frontend/`: Next.js và MetaMask.
- `backend/`: Spring Boot, JWT, MySQL, IPFS orchestration và Web3j.
- `blockchain/`: Solidity contract và Hardhat.
- `infrastructure/`: Docker Compose, MySQL, Kubo IPFS, Anvil, Nginx, Prometheus.

| Nơi lưu | Dữ liệu |
| --- | --- |
| MySQL | Tài khoản, hồ sơ bệnh nhân/bác sĩ, cơ sở y tế, yêu cầu truy cập, trạng thái đồng bộ và nhật ký |
| IPFS | Ciphertext của tệp bệnh án sau khi mã hóa AES-256-GCM |
| Blockchain | `patientWallet -> facilityId`, CID, SHA-256, ví người tải lên, nguồn hồ sơ, mã cơ sở và thời gian |

Không lưu nội dung tệp, CCCD, PII, JWT, chữ ký ví hoặc khóa mã hóa trên blockchain.
Hash được tính từ nội dung gốc; CID trỏ tới ciphertext đã mã hóa trên IPFS.

## Smart contract hiện lưu gì

Contract `MedicalRecordRegistry` lưu trạng thái tối thiểu cần thiết để xác minh quyền và
tính toàn vẹn, không lưu nội dung bệnh án.

### Trạng thái được lưu

| Trạng thái | Nội dung | Mục đích |
| --- | --- | --- |
| `owner` | Ví đã deploy contract | Chỉ ví này được kích hoạt hoặc ngừng kích hoạt mã cơ sở y tế |
| `activeFacilities[facilityId]` | Mã cơ sở và trạng thái hoạt động | Chặn cấp quyền cho cơ sở chưa được đăng ký trên contract |
| `facilityAccessGrants[patientWallet][facilityId]` | `true/false` | Quyền bệnh nhân cấp cho toàn bộ cơ sở y tế |
| `records[recordId]` | CID, SHA-256, ví bệnh nhân, ví tác giả, thời gian và bản ghi trước | Bằng chứng bất biến của từng phiên bản hồ sơ |
| `recordMetadata[recordId]` | Nguồn hồ sơ, ví tải lên và mã cơ sở | Phân biệt bệnh nhân tự tải với bác sĩ tải tại cơ sở y tế |
| `successorRecordIds[recordId]` | Mã phiên bản kế tiếp | Tạo chuỗi phiên bản và ngăn rẽ nhánh từ một bản cũ |
| `nextRecordId` | Bộ đếm hồ sơ | Sinh mã record on-chain mới |
| `accessGrants[patientWallet][granteeWallet]` | Quyền theo từng ví | Luồng quyền cũ theo ví, vẫn được giữ để tương thích với record/version API |

Mỗi record on-chain gồm:

- `cid`: địa chỉ ciphertext trên IPFS, không phải nội dung bệnh án.
- `contentHash`: SHA-256 của nội dung gốc để kiểm tra toàn vẹn sau khi giải mã.
- `patient`: ví bệnh nhân sở hữu hồ sơ.
- `author`: ví đã ký giao dịch tạo record.
- `createdAt`: thời gian block tạo record.
- `previousRecordId`: record trước đó nếu đây là một phiên bản sửa đổi.
- `sourceType`: `PATIENT_UPLOADED` hoặc `DOCTOR_UPLOADED`.
- `uploaderWallet`: ví thực hiện việc tải hồ sơ.
- `facilityId`: mã cơ sở khi hồ sơ do bác sĩ tải; bằng rỗng khi bệnh nhân tự tải.

### Event được phát ra

Contract phát event khi kích hoạt cơ sở, cấp/thu hồi quyền, tạo record và tạo phiên bản.
Backend dùng transaction receipt và event để đối chiếu người gửi, contract nhận, calldata,
record ID, CID, bệnh nhân, cơ sở và trạng thái giao dịch trước khi đồng bộ database.

Event là lịch sử giao dịch trên blockchain, không thay thế metadata nghiệp vụ trong MySQL.

### Dữ liệu không lưu trên contract

- Nội dung bệnh án hoặc ciphertext đầy đủ.
- Họ tên, CCCD, ngày sinh, số điện thoại hoặc địa chỉ.
- Chẩn đoán, đơn thuốc, kết quả xét nghiệm dưới dạng rõ.
- Mật khẩu, JWT, refresh token, nonce hoặc chữ ký MetaMask.
- Khóa AES, IV giải mã và thông tin cấu hình IPFS.
- Tên bác sĩ hoặc tên bệnh viện; contract chỉ biết ví và mã cơ sở dạng `bytes32`.

## Vai trò

- **Patient**: đăng ký/đăng nhập bằng CCCD, liên kết ví, cấp/thu hồi quyền facility,
  duyệt access request và upload hồ sơ cá nhân.
- **Doctor**: chọn facility khi đăng ký, liên kết ví, chờ admin verify, gửi access
  request và đọc/upload khi facility đã được cấp quyền.
- **Healthcare Facility**: 22 bệnh viện được seed sẵn trong database và kích hoạt trong contract.
  Các mã đang dùng là `BV001` và `BV003` đến `BV023`.
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

Deploy script kích hoạt `BV001` và `BV003` đến `BV023` trong contract, sau đó in
`contractAddress`. Copy địa chỉ vào `.env`:

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

## Tài khoản dùng thử

Các tài khoản sau được tạo khi `APP_SEED_TEST_USERS_ENABLED=true`:

| Vai trò | Thông tin đăng nhập | Mật khẩu mặc định |
| --- | --- | --- |
| Bệnh nhân | CCCD/mã định danh `079000000001` | `password123` |
| Bác sĩ | CCCD/mã định danh `079000000002` | `password123` |
| Quản trị viên | Email `admin@test.local` | `password123` |

Mật khẩu thực tế được cấu hình bằng `APP_SEED_TEST_USERS_PASSWORD`. Nếu đã thay đổi
biến này trong `.env`, hãy dùng giá trị mới thay cho `password123`.

Patient wallet: `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`

Doctor wallet: `0x70997970c51812dc3a010c7d01b50e0d17dc79c8`

MetaMask local: RPC `http://localhost:8545`, chain ID `31337`.

## Luồng hoạt động

### 1. Đăng ký và liên kết ví

1. Bệnh nhân đăng ký bằng CCCD/mã định danh và đăng nhập.
2. Bác sĩ đăng ký, khai báo chứng chỉ hành nghề và chọn một cơ sở y tế đang hoạt động.
3. Người dùng kết nối MetaMask và ký nonce do backend phát hành.
4. Backend khôi phục địa chỉ từ chữ ký, kiểm tra ví chưa thuộc tài khoản khác rồi lưu liên kết ví.
5. Bước liên kết ví không tạo giao dịch blockchain.

### 2. Xác thực bác sĩ

1. Bác sĩ mới có trạng thái chờ xác thực.
2. Quản trị viên kiểm tra thông tin, cơ sở công tác và việc liên kết ví.
3. Quản trị viên xác thực, từ chối hoặc khóa tài khoản bác sĩ trong database.
4. Bác sĩ chỉ được tìm bệnh nhân và sử dụng luồng bệnh án khi đã xác thực.

### 3. Bác sĩ gửi yêu cầu truy cập

1. Bác sĩ đã xác thực tìm bệnh nhân bằng tên, mã bệnh nhân hoặc định danh.
2. API tìm kiếm chỉ trả về thông tin tóm tắt, không trả hồ sơ bệnh án.
3. Backend lấy cơ sở y tế từ hồ sơ bác sĩ, không nhận mã cơ sở tùy ý từ frontend.
4. Nếu cơ sở chưa có quyền, backend tạo yêu cầu ở trạng thái `PENDING`.
5. Bước gửi yêu cầu chưa ghi blockchain.

### 4. Bệnh nhân cấp hoặc từ chối quyền

1. Bệnh nhân xem yêu cầu và chọn đồng ý hoặc từ chối.
2. Nếu từ chối, backend cập nhật yêu cầu thành `REJECTED`; không có giao dịch blockchain.
3. Nếu đồng ý, backend chuẩn bị chính xác dữ liệu gọi `grantFacilityAccess(facilityId)`.
4. MetaMask của bệnh nhân ký và gửi giao dịch.
5. Backend kiểm tra receipt, địa chỉ gửi/nhận, calldata, event và trạng thái quyền on-chain.
6. Chỉ sau khi xác minh thành công, backend đồng bộ quyền và cập nhật yêu cầu thành `APPROVED`.

### 5. Bác sĩ xem hoặc tải hồ sơ

Backend chỉ cho phép khi đồng thời thỏa mãn:

1. Tài khoản có vai trò bác sĩ và chưa bị khóa.
2. Bác sĩ đã được quản trị viên xác thực.
3. Bác sĩ thuộc một cơ sở y tế đang hoạt động và đã liên kết ví.
4. Bệnh nhân đã liên kết ví.
5. Quyền trong database đang hoạt động.
6. Contract trả về `hasFacilityAccess(patientWallet, facilityId) = true`.

Sau khi quyền bị thu hồi, bác sĩ thuộc cơ sở đó không thể xem hoặc tải lại hồ sơ.

### 6. Bệnh nhân tải hồ sơ cá nhân

1. Backend xác thực bệnh nhân và ví đã liên kết.
2. Backend kiểm tra loại, chữ ký nội dung và kích thước tệp.
3. Hash SHA-256 được tính từ nội dung gốc.
4. Tệp được mã hóa AES-256-GCM rồi ciphertext được tải lên IPFS.
5. MetaMask bệnh nhân ký `createRecordWithMetadata` với nguồn `PATIENT_UPLOADED`.
6. Backend xác minh transaction, event và dữ liệu record trên contract.
7. Metadata hồ sơ chỉ được hoàn tất trong database sau khi bằng chứng on-chain khớp.

### 7. Bác sĩ tải hồ sơ cho bệnh nhân

1. Backend kiểm tra toàn bộ điều kiện quyền ở luồng 5 trước khi nhận tệp.
2. Backend mã hóa tệp, tải ciphertext lên IPFS và trả dữ liệu giao dịch dự kiến.
3. Ví bác sĩ ký `createRecordWithMetadata` với nguồn `DOCTOR_UPLOADED` và mã cơ sở.
4. Backend kiểm tra ví ký là ví đã liên kết của bác sĩ, quyền chưa bị thu hồi, transaction,
   event, CID, hash, bệnh nhân, nguồn hồ sơ và mã cơ sở.
5. Khi tất cả dữ liệu khớp, backend lưu metadata và cho hồ sơ xuất hiện trong danh sách bệnh án.

### 8. Bệnh nhân thu hồi quyền và quản trị audit

1. Bệnh nhân ký `revokeFacilityAccess(facilityId)` bằng MetaMask.
2. Backend xác minh giao dịch rồi đồng bộ quyền trong database.
3. Mọi lần kiểm tra sau đó phải thấy cả database và blockchain đều không còn quyền.
4. Quản trị viên xem được lịch sử cấp/thu hồi, hồ sơ đã tải lên, CID/hash, mã giao dịch và thời gian.

### 9. Bác sĩ đính chính bệnh án

1. Bác sĩ chọn một hồ sơ đang ở trạng thái `ACTIVE` và nhập lý do đính chính bắt buộc.
2. Backend kiểm tra lại bác sĩ, cơ sở y tế, ví liên kết và quyền facility của bệnh nhân.
3. Tệp mới được kiểm tra, mã hóa AES-256-GCM và tải ciphertext lên IPFS.
4. Ví bác sĩ ký `createRecordVersionWithMetadata(previousRecordId, cid, hash, facilityId)`.
5. Contract chỉ tạo phiên bản mới nếu cơ sở đang hoạt động, bệnh nhân vẫn cấp quyền và bản cũ
   chưa có phiên bản kế tiếp.
6. Backend xác minh transaction, event, CID/hash, ví bác sĩ, bệnh nhân, mã cơ sở và
   `previousRecordId`.
7. Database chuyển bản cũ sang `CORRECTED`, giữ nguyên CID/hash cũ và tạo bản mới ở trạng thái
   `ACTIVE`.
8. Bệnh nhân và bác sĩ vẫn xem được bản cũ, bản mới, lý do đính chính và quan hệ phiên bản.

Hệ thống không ghi đè hoặc xóa bệnh án cũ. Mỗi phiên bản chỉ có tối đa một phiên bản kế tiếp,
vì vậy hai yêu cầu đính chính đồng thời không thể tạo hai nhánh hợp lệ.

Nếu người dùng từ chối MetaMask hoặc giao dịch thất bại, hồ sơ chưa được xác nhận sẽ không trở
thành bệnh án chính thức. Tác vụ dọn dẹp định kỳ xử lý ciphertext mồ côi sau thời gian lưu tạm.

## Giới hạn hiện tại

- Đây là nguyên mẫu EMR phục vụ quản lý và chia sẻ tệp bệnh án, không phải HIS đầy đủ.
- Chưa hỗ trợ chuẩn trao đổi y tế như HL7/FHIR, ký số pháp lý, đơn thuốc, chỉ định, thanh toán
  hoặc tích hợp VNeID/Cơ sở dữ liệu quốc gia về dân cư.
- Quyền đang được cấp theo cơ sở y tế, không theo từng bác sĩ hoặc từng hồ sơ.
- Contract chưa duy trì registry độc lập ánh xạ ví bác sĩ với cơ sở y tế. Backend là biên tin cậy
  xác thực tư cách bác sĩ và chỉ chấp nhận giao dịch từ ví bác sĩ đã liên kết, đã được duyệt.
- Khóa AES hiện là khóa cấu hình cấp hệ thống; triển khai thực tế cần KMS/HSM, luân chuyển khóa,
  sao lưu, giám sát, chính sách lưu trữ và quy trình tuân thủ dữ liệu y tế.
- Anvil là blockchain local và mất state khi container bị tạo lại; môi trường thật cần mạng
  blockchain bền vững và chiến lược xác nhận giao dịch phù hợp.

## Build và test

```powershell
cd backend
.\mvnw.cmd verify

cd ..\frontend
npm run build

cd ..\blockchain
npm test
```
