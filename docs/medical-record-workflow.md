# Medical Record Workflow

1. Backend xác thực caller và quyền đối tượng.
2. Backend kiểm tra file, tính SHA-256 và mã hóa AES-256-GCM.
3. Ciphertext được lưu IPFS; SQL giữ CID, IV và metadata.
4. Frontend ký `createRecordWithMetadata` bằng MetaMask.
5. Contract lưu CID, hash, patient, uploader, source type và facility ID.
6. Backend đối chiếu metadata on-chain trước khi tạo `medical_records`.

Patient upload dùng `PATIENT_UPLOADED`, facility rỗng. Doctor upload dùng
`DOCTOR_UPLOADED`, facility lấy từ verified doctor profile.

Patient chỉ đọc record của mình. Doctor phải có facility access ở cả SQL và chain.
CID không phải authorization; file chỉ được giải mã qua backend sau kiểm tra quyền.
