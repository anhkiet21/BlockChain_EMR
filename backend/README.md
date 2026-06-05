# Backend

Spring Boot API cho hệ thống Blockchain EMR.

## Profiles

- `dev`: MySQL local, log ứng dụng ở mức DEBUG. Đây là profile mặc định.
- `test`: H2 in-memory và Flyway, dùng khi chạy automated test.
- `prod`: nhận toàn bộ thông tin nhạy cảm từ biến môi trường và ghi log ra file.

Build và chạy profile cụ thể:

```powershell
.\mvnw.cmd package "-DskipTests"
java -jar target\emr-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev
```

Cách chạy JAR này hoạt động ổn định cả khi repository nằm trong đường dẫn
Windows có ký tự Unicode.

## Chuẩn response

Thành công:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-06-05T03:00:00Z"
}
```

Thất bại:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu gửi lên không hợp lệ",
    "path": "/api/example",
    "details": {
      "field": "Thông báo validation"
    }
  },
  "timestamp": "2026-06-05T03:00:00Z"
}
```

Mỗi HTTP response chứa `X-Request-Id`. Client có thể gửi header này để đối chiếu
request với log backend.

## Database migration

Không dùng Hibernate để tự sửa schema. Tạo migration mới trong:

```text
src/main/resources/db/migration/V{version}__{description}.sql
```

Ví dụ: `V2__create_users.sql`.

## Quy ước ID và index

Các bảng nghiệp vụ dùng khóa chính số nguyên tăng dần:

```sql
id BIGINT AUTO_INCREMENT PRIMARY KEY
```

Entity Java tương ứng dùng:

```java
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;
```

`BIGINT AUTO_INCREMENT` giúp khóa chính InnoDB được chèn gần tuần tự và phù hợp
cho truy vấn theo ID. ID chỉ đảm bảo duy nhất và tăng dần, không đảm bảo liên tục;
rollback hoặc xóa dữ liệu có thể tạo khoảng trống.

Ngoại lệ có chủ đích:

- `system_metadata` dùng `metadata_key` làm khóa chính vì luôn truy vấn trực tiếp
  theo tên cấu hình.
- `user_roles` dùng khóa chính ghép `(user_id, role_id)` để ngăn gán trùng vai trò.

Các cột dùng để tìm kiếm hoặc join phải có index riêng. Schema hiện tại đã index
`email`, `full_name`, `address`, `token_hash` và các khóa ngoại `user_id` cần thiết.

## Authentication API

Các endpoint công khai:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
```

Các endpoint yêu cầu header `Authorization: Bearer <accessToken>`:

```text
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/wallet/nonce
POST /api/auth/wallet/verify
```

Access token là JWT có thời hạn ngắn. Refresh token là chuỗi ngẫu nhiên; database
chỉ lưu SHA-256 hash và token cũ bị thu hồi ngay khi refresh thành công.

Luồng liên kết MetaMask:

1. Gọi `/auth/wallet/nonce` với địa chỉ ví.
2. Dùng MetaMask `personal_sign` hoặc ethers `signMessage` để ký chính xác trường
   `message` trong response.
3. Gửi địa chỉ và chữ ký đến `/auth/wallet/verify`.
4. Backend khôi phục địa chỉ người ký bằng Web3j và chỉ lưu ví khi địa chỉ khớp.

Phân quyền được bật bằng Spring Method Security. Các endpoint nghiệp vụ có thể dùng:

```java
@PreAuthorize("hasRole('DOCTOR')")
```

## User Profile API

Hồ sơ bệnh nhân:

```text
GET  /api/patients/me
PUT  /api/patients/me
GET  /api/patients?query=...      DOCTOR đã xác minh hoặc ADMIN; chỉ trả tóm tắt
GET  /api/patients/{profileId}    chỉ ADMIN
```

Hồ sơ bác sĩ và khoa:

```text
GET  /api/doctors/me
PUT  /api/doctors/me
GET  /api/doctors/{profileId}                 ADMIN
PUT  /api/doctors/{profileId}/verification   ADMIN

GET  /api/departments
POST /api/departments                         ADMIN
PUT  /api/departments/{id}                    ADMIN
```

Một `users` record có thể có cả role `PATIENT` và `DOCTOR`, vì vậy patient profile
và doctor profile là hai quan hệ 1-1 độc lập với cùng `user_id`.

API theo ID bị giới hạn cho admin cho đến khi domain `accesscontrol` cung cấp kiểm
tra quyền đối tượng. Người dùng thường chỉ đọc/sửa hồ sơ của mình qua endpoint
`/me`; backend luôn lấy `userId` từ access token, không nhận `userId` từ client.

Tìm kiếm bệnh nhân bắt buộc từ khóa tối thiểu 3 ký tự, trả tối đa 20 kết quả mỗi
trang và không trả email, số điện thoại, địa chỉ, người liên hệ hoặc nhóm máu.

## Lưu trữ file bệnh án

Giai đoạn 4 cung cấp API file riêng cho bệnh nhân:

```text
POST /api/medical-files/me
GET  /api/medical-files/me
GET  /api/medical-files/{fileId}/content
```

Upload sử dụng `multipart/form-data` với part tên `file`. Backend chỉ chấp nhận
PDF, JSON, JPEG và PNG, tối đa 20 MB theo mặc định. File được mã hóa AES-256-GCM
trước khi tải lên IPFS; database chỉ lưu CID, metadata, IV và SHA-256 hash.

API không trả CID hoặc IV cho client. Khi tải xuống, backend kiểm tra ownership từ
JWT, lấy ciphertext từ IPFS, giải mã và kiểm tra hash trước khi trả file.

Storage provider được chọn bằng `STORAGE_PROVIDER=kubo` hoặc `pinata`. Production
phải cung cấp `STORAGE_ENCRYPTION_KEY` là khóa 32 byte được mã hóa Base64.

Tạo khóa development:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

## Authorization và chống IDOR

- Chỉ `/health`, `/auth/register`, `/auth/login`, `/auth/refresh` và CORS preflight
  là public. Mọi API nghiệp vụ khác yêu cầu access token.
- API `/me` lấy `userId` từ principal JWT và kiểm tra ownership lại ở application
  service; client không được gửi `userId`.
- API hồ sơ theo `profileId` hiện chỉ dành cho `ADMIN`. Sau này bác sĩ chỉ được
  truy cập khi domain `accesscontrol` xác nhận quyền của chính bệnh nhân.
- Bác sĩ chưa được admin xác minh không thể tìm kiếm bệnh nhân.
- Security được kiểm tra tại HTTP filter chain, controller và application service.
- Logout chỉ thu hồi refresh token thuộc đúng người dùng đang đăng nhập.
