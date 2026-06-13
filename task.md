PHASE 0 — Đọc project và lập kế hoạch sửa

Bạn hãy đọc kỹ README.md và cấu trúc project hiện tại trước khi sửa code.

Bối cảnh:
Dự án là hệ thống quản lý hồ sơ bệnh án điện tử ứng dụng blockchain. Stack hiện tại gồm:

* Frontend: Next.js
* Backend: Spring Boot
* Database: MySQL
* Storage: IPFS/Kubo
* Blockchain: Solidity smart contract trên local Anvil

Scope nghiệp vụ mới cần triển khai dần:

1. Bệnh nhân

* Đăng ký/đăng nhập bằng CCCD hoặc mã định danh cá nhân + mật khẩu.
* Sau khi đăng nhập, liên kết ví MetaMask bằng cách ký message xác minh.
* Có thể cấp quyền/thu hồi quyền cho cơ sở y tế.
* Có thể duyệt/từ chối yêu cầu truy cập từ bác sĩ đại diện cơ sở y tế.
* Có thể upload hồ sơ cá nhân.
* File hồ sơ lưu IPFS, blockchain chỉ lưu CID/hash/metadata.
* Hồ sơ bệnh nhân upload phải có sourceType = PATIENT_UPLOADED.

2. Bác sĩ

* Đăng ký/đăng nhập bằng CCCD hoặc mã định danh cá nhân + mật khẩu.
* Khi đăng ký chọn cơ sở y tế từ danh sách có sẵn.
* Sau khi đăng nhập, liên kết ví MetaMask.
* Trạng thái ban đầu là PENDING_VERIFICATION.
* Admin verify thì chuyển thành VERIFIED.
* Chỉ bác sĩ VERIFIED và đã liên kết ví mới được gửi yêu cầu truy cập, đọc hồ sơ, upload hồ sơ.
* Hồ sơ bác sĩ upload phải có sourceType = DOCTOR_UPLOADED.

3. Cơ sở y tế

* Không có tài khoản đăng ký riêng trong demo.
* Được seed sẵn. (ví dụ Bệnh viện Chợ Rẫy)
* Smart contract chỉ lưu facilityId + trạng thái active/hợp lệ.
* Backend/database lưu thông tin hiển thị như tên, địa chỉ, mô tả.
* Bệnh nhân cấp quyền cho facilityId, không cấp trực tiếp cho doctorWallet.

4. Admin

* Không cần ví.
* Quản lý tài khoản/trạng thái trong backend.
* Verify/reject/lock bác sĩ.

Yêu cầu trong phase này:

* Không sửa code lớn ngay.
* Hãy phân tích code hiện tại và sửa cho phù hợp
* Không xóa chức năng hiện có nếu chưa cần.


PHASE 1 — Rà soát và chỉnh sửa smart contract tối thiểu, không viết lại toàn bộ

Bạn hãy đọc kỹ smart contract hiện tại trước khi sửa. Smart contract hiện tại đang hoạt động, vì vậy KHÔNG được viết lại toàn bộ nếu không cần thiết. Chỉ sửa hoặc bổ sung những phần thiếu/chưa hợp lý để phù hợp với scope nghiệp vụ mới.

Bối cảnh:
Dự án là hệ thống quản lý hồ sơ bệnh án điện tử ứng dụng blockchain. File hồ sơ lưu trên IPFS, blockchain chỉ lưu quyền truy cập và thông tin tham chiếu hồ sơ như CID/contentHash/metadata.

Scope mới:

* Quyền truy cập nên được quản lý theo mô hình:
  patientWallet -> facilityId
* Bệnh nhân cấp quyền cho cơ sở y tế, không cấp trực tiếp cho doctorWallet.
* Bác sĩ chỉ là người thuộc cơ sở y tế và sử dụng quyền của cơ sở y tế sau khi được backend verify.
* Cơ sở y tế được seed sẵn trong contract bằng facilityId.
* Không lưu file bệnh án trực tiếp trên blockchain.

Yêu cầu quan trọng:

* Ưu tiên giữ nguyên cấu trúc contract hiện tại nếu còn dùng được.
* Không xóa hàm/event hiện có nếu backend/frontend/test còn phụ thuộc, trừ khi thật sự cần.
* Nếu contract hiện tại đã có hàm grant/revoke/record, hãy refactor nhẹ hoặc thêm overload/hàm mới thay vì viết lại toàn bộ.
* Nếu hàm cũ đang cấp quyền theo doctorWallet, hãy bổ sung mô hình mới theo facilityId và chỉ sửa luồng cần thiết.
* Giữ backward compatibility tối đa để hệ thống hiện tại không hỏng hàng loạt.
* Chỉ thay đổi deploy script/test tương ứng với phần đã sửa.

Các việc cần làm:

1. Rà soát contract hiện tại

* Xác định contract đang lưu access grant theo doctorWallet, patientWallet hay đối tượng nào.
* Xác định record hiện tại đang lưu những trường nào: CID, hash, uploader, timestamp...
* Xác định hàm nào backend/frontend đang gọi.
* Trước khi sửa lớn, ghi chú ngắn trong câu trả lời: phần nào giữ nguyên, phần nào cần bổ sung.

2. Bổ sung facility whitelist nếu chưa có
   Nếu contract chưa có danh sách cơ sở y tế hợp lệ, thêm cơ chế tối thiểu:

* facilityId: dùng bytes32 hoặc string, ưu tiên kiểu ít làm vỡ code hiện tại.
* active: bool hoặc mapping facilityId => bool.
* Hàm kiểm tra facility có active/hợp lệ không.
* Event FacilityAdded hoặc FacilityStatusChanged nếu phù hợp.

Ví dụ ý tưởng, nhưng hãy điều chỉnh theo code hiện tại:

* mapping(bytes32 => bool) activeFacilities;
  hoặc
* mapping(string => bool) activeFacilities;

3. Cập nhật/bổ sung access grant theo facilityId
   Nếu contract hiện tại đã có grantAccess/revokeAccess:

* Không xóa vội hàm cũ.
* Thêm hàm mới hoặc sửa tối thiểu để hỗ trợ facilityId.

Yêu cầu logic mới:

* Bệnh nhân cấp quyền cho facilityId.
* Kiểm tra facilityId phải active.
* Lưu trạng thái quyền kiểu patientWallet + facilityId => granted.
* Có hàm hasAccess(patientWallet, facilityId) trả về bool.
* Có revokeAccess(patientWallet/facilityId) để bệnh nhân thu hồi quyền.
* Emit event AccessGranted(patientWallet, facilityId).
* Emit event AccessRevoked(patientWallet, facilityId).

Lưu ý:

* Nếu dùng msg.sender làm patientWallet thì hàm grantAccess có thể không cần truyền patientWallet, chỉ cần facilityId.
* Nếu contract hiện tại đang có patient parameter, đảm bảo không cho người khác cấp quyền thay bệnh nhân.

4. Cập nhật record metadata tối thiểu
   Nếu contract hiện tại đã lưu record reference:

* Không viết lại toàn bộ record structure nếu không cần.
* Chỉ bổ sung trường còn thiếu nếu hợp lý:

  * sourceType: PATIENT_UPLOADED hoặc DOCTOR_UPLOADED.
  * uploaderWallet.
  * facilityId nếu uploader là bác sĩ.
* Nếu thêm enum dễ gây migration/test vỡ, có thể dùng uint8 hoặc bytes32/string sourceType tùy code hiện tại.
* Giữ CID/contentHash/timestamp hiện có.
* Không lưu file bệnh án trực tiếp trên blockchain.

Yêu cầu logic:

* Hồ sơ do bệnh nhân upload phải phân biệt được sourceType = PATIENT_UPLOADED.
* Hồ sơ do bác sĩ upload phải phân biệt được sourceType = DOCTOR_UPLOADED và có facilityId nếu phù hợp.
* Nếu chưa thể enforce hết trong contract, ít nhất contract phải lưu được metadata để backend/frontend hiển thị đúng.

5. Cập nhật deploy script tối thiểu

* Không thay đổi toàn bộ flow deploy nếu không cần.
* Bổ sung seed danh sách cơ sở y tế sau khi deploy:

  * BV001
  * BV002
  * PK001
* facilityId phải thống nhất với backend/database ở phase sau.
* Sau deploy vẫn output contractAddress như README hiện tại đang yêu cầu để copy vào .env.

6. Cập nhật test smart contract
   Chỉ thêm/cập nhật test cần thiết:

* Add/seed facility thành công.
* Không grant được cho facility không tồn tại hoặc inactive.
* Patient grant access cho facility.
* Patient revoke access.
* hasAccess đúng trước/sau revoke.
* Nếu có record tests, kiểm tra record lưu được sourceType PATIENT_UPLOADED/DOCTOR_UPLOADED.

PHASE 2 — Backend: user, auth, facility, doctor verification

Hãy cập nhật backend Spring Boot theo mô hình tài khoản mới, tập trung vào auth/user/facility/doctor verification. Chưa cần hoàn thiện frontend ở phase này.

Yêu cầu nghiệp vụ:

1. Patient register/login
   Bệnh nhân đăng ký bằng:

* identityNumber hoặc nationalId: CCCD/mã định danh cá nhân, unique.
* password.
* fullName.
* dateOfBirth.
* gender.
* phoneNumber.
* address.

Bệnh nhân đăng nhập bằng:

* identityNumber/nationalId + password.

Sau khi đăng ký:

* role = PATIENT.
* status = ACTIVE.
* walletAddress chưa có.
* walletVerified = false.

2. Doctor register/login
   Bác sĩ đăng ký bằng:

* identityNumber hoặc nationalId.
* password.
* fullName.
* dateOfBirth.
* gender.
* phoneNumber.
* licenseNumber hoặc doctorCode.
* facilityId: chọn từ danh sách cơ sở y tế có sẵn.

Bác sĩ đăng nhập bằng:

* identityNumber/nationalId + password.

Sau khi đăng ký:

* role = DOCTOR.
* status = ACTIVE hoặc tương đương.
* doctor verificationStatus = PENDING_VERIFICATION.
* walletAddress chưa có.
* walletVerified = false.

3. Admin

* Admin có thể giữ login hiện tại nếu đang dùng email/username.
* Admin không cần ví.
* Admin có API:

  * GET /api/admin/doctors/pending
  * POST /api/admin/doctors/{id}/verify
  * POST /api/admin/doctors/{id}/reject
 

4. Facility
   Tạo hoặc cập nhật entity HealthcareFacility:

* facilityId
* name
* address
* description
* active

Thêm API:

* GET /api/facilities

  * trả danh sách cơ sở y tế active.
  * dùng cho form đăng ký bác sĩ và giao diện bệnh nhân cấp quyền.

Seed database:

* BV001
* BV002
* PK001
  FacilityId phải trùng với deploy script smart contract ở phase 1.

5. Security

* Refactor login để hỗ trợ identityNumber/nationalId + password.
* Nếu code hiện tại phụ thuộc email, refactor nhẹ nhàng, không làm vỡ JWT/Spring Security.
* Không bắt buộc email cho patient/doctor.
* identityNumber/nationalId phải unique.
* Doctor không được tự set verificationStatus = VERIFIED khi register.


Nguyên tắc:

* Giữ kiến trúc modular monolith hiện tại.
* Không sửa frontend ở phase này trừ khi cần để build không lỗi.
* Cuối cùng trả lời: file đã sửa, schema/entity/API mới, migration/seed mới, lệnh cần chạy.

PHASE 4 — Backend: access request và quyền truy cập theo facilityId

Hãy cập nhật backend Spring Boot để hỗ trợ luồng yêu cầu quyền truy cập và kiểm tra quyền theo facilityId. Không làm frontend lớn trong phase này.

Bối cảnh:

* Smart contract đã hoặc sẽ hỗ trợ quyền truy cập theo patientWallet -> facilityId.
* Cơ sở y tế được seed sẵn.
* Bác sĩ thuộc một facilityId.
* Bác sĩ chỉ là người đại diện cơ sở y tế gửi yêu cầu.
* Bệnh nhân duyệt thì blockchain ghi quyền cho facilityId, không ghi quyền cho doctorWallet.

Yêu cầu nghiệp vụ:

1. AccessRequest entity
   Tạo hoặc cập nhật entity AccessRequest:

Fields đề xuất:

* id
* patientId
* facilityId
* requestedByDoctorId
* reason
* status: PENDING, APPROVED, REJECTED, CANCELED
* blockchainTxHash nullable
* createdAt
* respondedAt

Quan hệ:

* patientId trỏ tới user role PATIENT.
* requestedByDoctorId trỏ tới user role DOCTOR.
* facilityId là cơ sở y tế của bác sĩ, lấy từ DoctorProfile, không lấy từ client.

2. Doctor tạo yêu cầu truy cập
   API:

* POST /api/doctor/access-requests

Điều kiện:

* User phải role DOCTOR.
* Doctor phải walletVerified = true.
* Doctor verificationStatus phải là VERIFIED.
* Doctor phải có facilityId hợp lệ.
* Doctor tìm patient bằng patientId hoặc identityNumber tùy code hiện tại.
* Backend tự lấy facilityId từ DoctorProfile.
* Không tin facilityId client gửi lên.

Body đề xuất:

* patientIdentifier hoặc patientId
* reason

Logic:

* Nếu facility đã có quyền với patient rồi thì không cần tạo request mới, trả thông báo đã có quyền.
* Nếu đã có request PENDING cùng patientId + facilityId thì không tạo trùng.
* Nếu chưa có, tạo AccessRequest status PENDING.

3. Patient xem yêu cầu truy cập
   API:

* GET /api/patient/access-requests

Điều kiện:

* User phải role PATIENT.
* Chỉ trả request của chính patient đang login.

Response nên hiển thị đủ:

* requestId
* facilityId
* facilityName
* doctorName
* reason
* status
* createdAt

Nội dung UI sau này sẽ là:
“Bác sĩ [doctorName] thuộc [facilityName] yêu cầu quyền truy cập hồ sơ cho [facilityName].”

4. Patient reject request
   API:

* POST /api/patient/access-requests/{id}/reject

Điều kiện:

* User phải role PATIENT.
* Chỉ được reject request của chính mình.
* Request phải đang PENDING.

Logic:

* Cập nhật status = REJECTED.
* respondedAt = now.
* Không ghi blockchain.

5. Patient approve request
   API:

* POST /api/patient/access-requests/{id}/approve

Lưu ý quan trọng:

* Việc ký transaction grantAccess nên do frontend MetaMask thực hiện.
* Backend endpoint approve nhận txHash sau khi frontend đã ký và transaction thành công.
* Backend kiểm tra request thuộc patient đang login và đang PENDING.
* Backend có thể kiểm tra lại on-chain hasAccess(patientWallet, facilityId) nếu adapter hiện có hỗ trợ.
* Nếu hợp lệ:

  * status = APPROVED.
  * blockchainTxHash = txHash.
  * respondedAt = now.

Body đề xuất:

* txHash

6. Patient chủ động cấp quyền/thu hồi quyền
   Nếu backend đã có API access grant cũ, refactor theo facilityId.

API đề xuất:

* GET /api/patient/access/grants
* POST /api/patient/access/grants/sync hoặc /grant-confirm
* POST /api/patient/access/revoke-confirm

Lưu ý:

* Transaction grant/revoke do frontend MetaMask ký.
* Backend chỉ lưu/sync hoặc kiểm tra trạng thái sau tx.
* Không để backend tự cấp quyền thay bệnh nhân nếu không có chữ ký ví của bệnh nhân.

7. Kiểm tra quyền cho doctor
   Tạo service trung tâm, ví dụ AccessControlService:

Hàm:

* boolean canDoctorAccessPatient(doctorUserId, patientId)

Điều kiện:

* doctor role = DOCTOR.
* doctor walletVerified = true.
* doctor verificationStatus = VERIFIED.
* doctor có facilityId.
* patient có walletAddress và walletVerified.
* facilityId active.
* Smart contract hasAccess(patientWallet, facilityId) = true.
  Hoặc nếu project hiện đang sync quyền về database, phải đảm bảo trạng thái database khớp blockchain.

Dùng service này cho các phase sau khi đọc/upload hồ sơ.

8. Tests
   Thêm/cập nhật test:

* Doctor PENDING_VERIFICATION không tạo được request.
* Doctor VERIFIED nhưng chưa link ví không tạo được request.
* Doctor VERIFIED + walletVerified tạo được request.
* Không tạo duplicate PENDING request cùng patient + facility.
* Patient chỉ xem request của mình.
* Patient reject request thành công.
* Patient approve request với txHash thì status APPROVED.
* Doctor chỉ canAccess nếu facility đã được grant.

9. Không làm trong phase này

* Không làm frontend UI lớn.
* Không upload file.
* Không xử lý phân công bác sĩ theo phòng/khoa/ca trực.
* Không cấp quyền trực tiếp cho doctorWallet.
* Không thêm tài khoản cơ sở y tế.

Sau khi sửa:

* Chạy backend tests.
* Trả lời lại gồm:

  1. File đã sửa.
  2. Entity/API/service mới.
  3. Logic kiểm tra quyền.
  4. Lệnh test.
  5. TODO còn lại cho record upload/read và frontend.
PHASE 5 — Backend: upload/read hồ sơ với IPFS + blockchain metadata + sourceType

Hãy cập nhật backend phần hồ sơ bệnh án. Mục tiêu là đảm bảo file hồ sơ lưu IPFS, blockchain chỉ lưu thông tin tham chiếu như CID/contentHash/metadata, và phân biệt rõ hồ sơ do bệnh nhân upload hay bác sĩ upload.

Bối cảnh:

* Project hiện đã có IPFS/Kubo và blockchain adapter.
* Smart contract đã hoặc sẽ hỗ trợ lưu record reference.
* Access control theo facilityId đã có service ở phase trước.
* Không lưu file bệnh án trực tiếp trên blockchain.

Yêu cầu nghiệp vụ:

1. MedicalRecord model
   Tạo hoặc cập nhật MedicalRecord entity/model:

Fields đề xuất:

* id
* patientId
* cid
* contentHash
* originalFileName
* mimeType
* fileSize
* sourceType: PATIENT_UPLOADED, DOCTOR_UPLOADED
* uploadedByUserId
* uploadedByWallet
* facilityId nullable
* blockchainTxHash
* createdAt

Giải thích:

* sourceType = PATIENT_UPLOADED nếu bệnh nhân tự upload hồ sơ cá nhân.
* sourceType = DOCTOR_UPLOADED nếu bác sĩ upload hồ sơ cho bệnh nhân.
* facilityId chỉ bắt buộc khi sourceType = DOCTOR_UPLOADED.
* uploadedByWallet là ví đã verify của người upload.

2. Patient upload record
   API:

* POST /api/patient/records

Điều kiện:

* User phải role PATIENT.
* Patient phải walletVerified = true.
* File upload lên IPFS.
* Backend tính contentHash của file.
* Ghi metadata vào blockchain với sourceType = PATIENT_UPLOADED.
* Lưu record metadata vào database.

Logic:

* patientId = user đang login.
* uploadedByUserId = patient user id.
* uploadedByWallet = patient walletAddress.
* facilityId = null hoặc empty.
* sourceType = PATIENT_UPLOADED.

Response:

* recordId
* cid
* contentHash
* blockchainTxHash nếu có
* sourceType

3. Doctor upload record cho patient
   API:

* POST /api/doctor/records

Điều kiện:

* User phải role DOCTOR.
* Doctor phải VERIFIED.
* Doctor phải walletVerified = true.
* Doctor phải thuộc facilityId active.
* Patient phải tồn tại.
* Patient phải walletVerified = true nếu cần ghi blockchain theo patientWallet.
* AccessControlService.canDoctorAccessPatient(doctorId, patientId) phải true.
* File upload lên IPFS.
* Backend tính contentHash.
* Ghi metadata vào blockchain với sourceType = DOCTOR_UPLOADED.
* Lưu record metadata vào database.

Logic:

* patientId = bệnh nhân được chọn.
* uploadedByUserId = doctor user id.
* uploadedByWallet = doctor walletAddress.
* facilityId = facilityId của doctor.
* sourceType = DOCTOR_UPLOADED.

Không cho doctor tự truyền facilityId từ client để tránh giả mạo. Backend lấy facilityId từ DoctorProfile.

4. Patient xem hồ sơ của mình
   API:

* GET /api/patient/records

Điều kiện:

* User role PATIENT.
* Chỉ trả hồ sơ của chính patient.
* Response hiển thị:

  * recordId
  * cid
  * contentHash
  * sourceType
  * uploader name
  * facilityName nếu có
  * createdAt
  * blockchainTxHash

5. Doctor xem hồ sơ bệnh nhân
   API:

* GET /api/doctor/records?patientId=...

Điều kiện:

* User role DOCTOR.
* Doctor VERIFIED.
* Doctor walletVerified.
* AccessControlService.canDoctorAccessPatient = true.
* Nếu không có quyền, trả 403.

Response tương tự patient records.

6. Download/read file từ IPFS
   Nếu hệ thống hiện có API đọc file từ IPFS:

* Đảm bảo kiểm tra quyền trước khi trả file.
* Patient chỉ đọc file của chính mình.
* Doctor chỉ đọc nếu facility đã được cấp quyền.
* Không expose IPFS raw CID nếu hệ thống muốn proxy qua backend; nếu hiện tại đã expose CID thì giữ nhưng vẫn cần kiểm tra quyền ở endpoint tải/xem.

7. Blockchain adapter
   Cập nhật adapter gọi smart contract để tạo record reference:

* sourceType PATIENT_UPLOADED/DOCTOR_UPLOADED.
* cid.
* contentHash.
* uploaderWallet.
* facilityId nếu doctor upload.
* patientWallet hoặc patient id theo contract hiện tại.

Nếu transaction ghi record cần MetaMask ký phía frontend:

* Backend chỉ chuẩn bị metadata/IPFS upload.
* Frontend ký transaction.
* Sau tx thành công frontend gọi backend confirm.
  Nếu hiện tại backend đang ký transaction bằng service key thì giữ cách hiện tại nếu project đang hoạt động, nhưng ghi chú rõ trong summary. Ưu tiên ít phá hệ thống hiện tại.

8. Tests
   Thêm/cập nhật test:

* Patient chưa link ví không upload record được.
* Patient upload record tạo sourceType PATIENT_UPLOADED.
* Doctor chưa VERIFIED không upload được.
* Doctor VERIFIED nhưng facility chưa được cấp quyền không upload/read được.
* Doctor VERIFIED + facility đã được cấp quyền upload được sourceType DOCTOR_UPLOADED.
* Patient xem được hồ sơ của mình.
* Doctor chỉ xem được hồ sơ khi có quyền.
* contentHash được tính và lưu.
* CID được lưu sau khi upload IPFS.

9. Không làm trong phase này

* Không làm frontend UI lớn.
* Không làm phân công bác sĩ theo bệnh nhân.
* Không lưu file trực tiếp lên blockchain.
* Không cấp quyền theo doctorWallet.
* Không thêm tài khoản cơ sở y tế.

Sau khi sửa:

* Chạy backend tests.
* Nếu có thể, test thủ công upload file lên IPFS local.
* Trả lời lại gồm:

  1. File đã sửa.
  2. API record mới/cập nhật.
  3. Cách lưu IPFS và blockchain metadata.
  4. Logic sourceType.
  5. Lệnh test.
  6. TODO cho frontend Phase 6.
PHASE 6 — Frontend Next.js: cập nhật UI theo luồng Patient/Doctor/Admin mới

Hãy cập nhật frontend Next.js theo backend/smart contract đã sửa ở các phase trước. Không viết lại toàn bộ frontend nếu không cần. Ưu tiên sửa/bổ sung các page/component hiện có để chạy đúng luồng mới.

Bối cảnh:

* Patient và Doctor đăng ký/đăng nhập bằng CCCD/mã định danh + mật khẩu.
* Sau khi đăng nhập, người dùng liên kết ví MetaMask bằng cách ký message.
* Patient cấp quyền/thu hồi quyền cho cơ sở y tế.
* Doctor gửi yêu cầu truy cập thay mặt cơ sở y tế.
* Patient duyệt request và ký transaction grantAccess(facilityId).
* File hồ sơ lưu IPFS, blockchain chỉ lưu CID/hash/metadata.
* sourceType phân biệt PATIENT_UPLOADED và DOCTOR_UPLOADED.
* Admin không cần ví, chỉ verify bác sĩ.

Yêu cầu cập nhật frontend:

1. Auth UI
   Cập nhật form login:

* Dùng CCCD/mã định danh cá nhân + mật khẩu.
* Không bắt buộc email cho patient/doctor.

Cập nhật form đăng ký bệnh nhân:

* CCCD/mã định danh cá nhân.
* Mật khẩu.
* Họ tên.
* Ngày sinh.
* Giới tính.
* Số điện thoại.
* Địa chỉ.

Cập nhật form đăng ký bác sĩ:

* CCCD/mã định danh cá nhân.
* Mật khẩu.
* Họ tên.
* Ngày sinh.
* Giới tính.
* Số điện thoại.
* Mã chứng chỉ hành nghề/mã bác sĩ.
* Cơ sở y tế đang công tác.

  * Lấy danh sách từ GET /api/facilities.
  * Hiển thị bằng select/dropdown.

Nếu form cũ đang dùng email, hãy refactor nhẹ, không phá layout quá nhiều.

2. Profile + wallet linking
   Tạo/cập nhật trang profile cho Patient và Doctor:

Hiển thị:

* Họ tên.
* Vai trò.
* CCCD/mã định danh, có thể mask nếu project đã có.
* walletAddress.
* walletVerified.
* Với doctor: verificationStatus.

Thêm nút:

* “Kết nối ví MetaMask”
* Khi bấm:

  1. Gọi POST /api/wallet/link-message để lấy message.
  2. Gọi MetaMask request account.
  3. Dùng ví ký message.
  4. Gửi walletAddress + signature + message/nonce về POST /api/wallet/verify.
  5. Nếu thành công, reload profile và hiển thị wallet đã xác minh.

Không cho user nhập walletAddress thủ công.

3. Patient UI
   Tạo/cập nhật các trang sau:

A. Danh sách cơ sở y tế

* Route gợi ý: /patient/facilities hoặc dùng route hiện có.
* Gọi GET /api/facilities.
* Hiển thị facilityName, address, description.
* Nút “Cấp quyền”.
* Khi bấm:

  * Kiểm tra patient đã walletVerified.
  * Gọi smart contract grantAccess(facilityId) bằng MetaMask.
  * Sau tx thành công, gọi backend confirm/sync nếu backend có endpoint.
  * Hiển thị txHash.

B. Quyền đã cấp

* Route gợi ý: /patient/access.
* Hiển thị danh sách cơ sở y tế đã được cấp quyền nếu backend/contract API hỗ trợ.
* Nút “Thu hồi quyền”.
* Khi bấm:

  * Gọi smart contract revokeAccess(facilityId) bằng MetaMask.
  * Sau tx thành công, gọi backend confirm/sync nếu có.
  * Cập nhật UI.

C. Yêu cầu truy cập

* Route gợi ý: /patient/access-requests.
* Gọi GET /api/patient/access-requests.
* Hiển thị câu rõ ràng:
  “Bác sĩ [doctorName] thuộc [facilityName] yêu cầu quyền truy cập hồ sơ cho [facilityName].”
* Hiển thị reason, createdAt, status.
* Nút “Đồng ý”:

  * Gọi smart contract grantAccess(facilityId) bằng MetaMask.
  * Sau tx thành công, gọi POST /api/patient/access-requests/{id}/approve với txHash.
* Nút “Từ chối”:

  * Gọi POST /api/patient/access-requests/{id}/reject.
  * Không gọi blockchain.

D. Upload hồ sơ cá nhân

* Route gợi ý: /patient/records/upload.
* Chỉ cho upload nếu walletVerified.
* Gọi POST /api/patient/records.
* Hiển thị kết quả: CID, contentHash, txHash nếu có, sourceType = PATIENT_UPLOADED.

E. Danh sách hồ sơ bệnh nhân

* Route gợi ý: /patient/records.
* Gọi GET /api/patient/records.
* Hiển thị:

  * tên file
  * CID
  * contentHash
  * sourceType
  * uploader
  * facilityName nếu có
  * createdAt
  * txHash

4. Doctor UI
   Tạo/cập nhật các trang sau:

A. Doctor dashboard/profile

* Hiển thị verificationStatus.
* Nếu chưa walletVerified: nhắc liên kết ví.
* Nếu chưa VERIFIED: hiển thị thông báo “Tài khoản bác sĩ đang chờ admin xác thực”.
* Nếu VERIFIED + walletVerified: cho truy cập chức năng tìm bệnh nhân/hồ sơ.

B. Tìm bệnh nhân

* Route gợi ý: /doctor/patients/search hoặc route hiện có.
* Tìm bằng CCCD/mã định danh hoặc patientId tùy API backend.
* Sau khi tìm được patient:

  * Gọi API kiểm tra quyền nếu backend có.
  * Nếu facility chưa được cấp quyền:

    * Hiển thị form “Yêu cầu quyền truy cập”.
    * Cho nhập reason.
    * Gọi POST /api/doctor/access-requests.
  * Nếu đã được cấp quyền:

    * Hiển thị nút xem hồ sơ.
    * Hiển thị nút upload hồ sơ.

C. Doctor xem hồ sơ bệnh nhân

* Gọi GET /api/doctor/records?patientId=...
* Nếu 403, hiển thị “Cơ sở y tế của bạn chưa được bệnh nhân cấp quyền truy cập”.
* Nếu có quyền, hiển thị danh sách record tương tự patient.

D. Doctor upload hồ sơ cho bệnh nhân

* Gọi POST /api/doctor/records.
* Không cho doctor tự chọn facilityId; backend tự lấy.
* Hiển thị sourceType = DOCTOR_UPLOADED sau khi upload thành công.

5. Admin UI
   Cập nhật admin dashboard:

A. Danh sách bác sĩ chờ xác thực

* Gọi GET /api/admin/doctors/pending.
* Hiển thị:

  * họ tên
  * CCCD/mã định danh
  * số điện thoại
  * mã chứng chỉ hành nghề/mã bác sĩ
  * cơ sở y tế
  * walletAddress nếu đã liên kết
  * verificationStatus

B. Hành động

* Nút Verify:

  * POST /api/admin/doctors/{id}/verify.
* Nút Reject:

  * POST /api/admin/doctors/{id}/reject.
* Nếu có lock API:

  * Nút Lock.

Admin không có flow MetaMask.

6. MetaMask/smart contract integration

* Cập nhật ABI nếu smart contract đã thay đổi.
* Cập nhật hàm gọi grantAccess/revokeAccess theo facilityId.
* Không gọi grantAccess(patient, doctorWallet) nữa.
* Nếu facilityId là bytes32:

  * Convert BV001/BV002/PK001 sang bytes32 đúng cách.
* Nếu facilityId là string:

  * Truyền string đúng như backend/database.
* Đảm bảo chainId/RPC/contractAddress vẫn lấy từ env theo flow hiện tại.

7. UX/validation

* Nếu user chưa liên kết ví, chặn các thao tác cần blockchain và hiển thị hướng dẫn liên kết ví.
* Nếu doctor chưa VERIFIED, chặn tìm/upload/read hồ sơ.
* Nếu patient reject request, không bật MetaMask.
* Nếu transaction lỗi/rejected, không gọi backend approve.
* Hiển thị loading/error/success rõ ràng.

8. Không làm trong phase này

* Không viết lại toàn bộ UI.
* Không thêm tài khoản cơ sở y tế.
* Không thêm ví cho admin.
* Không làm phân phòng/khoa/ca trực.
* Không tích hợp VNeID thật.
* Không lưu file trực tiếp lên blockchain.

Sau khi sửa:

* Chạy npm run build trong frontend.
* Test thủ công các luồng chính:

  1. Patient đăng nhập.
  2. Patient link ví.
  3. Doctor đăng nhập, link ví.
  4. Admin verify doctor.
  5. Doctor gửi request.
  6. Patient approve bằng MetaMask.
  7. Doctor đọc/upload record.
  8. Patient upload record.
* Trả lời lại gồm:

  1. File/page/component đã sửa.
  2. Route mới/cập nhật.
  3. API frontend đang gọi.
  4. Cách gọi smart contract.
  5. Lệnh build/test.
  6. TODO nếu còn thiếu.
PHASE 7 — Đồng bộ seed, cập nhật README/docs, test flow cuối cùng

Hãy hoàn thiện tài liệu, seed data và test flow cuối cùng để dự án nhất quán theo scope mới. Không thêm nghiệp vụ lớn nữa.

Bối cảnh:
Dự án hiện là hệ thống quản lý hồ sơ bệnh án điện tử ứng dụng blockchain:

* Frontend: Next.js
* Backend: Spring Boot
* Database: MySQL
* Storage: IPFS/Kubo
* Blockchain: Solidity smart contract trên local Anvil
* File hồ sơ lưu IPFS
* Blockchain lưu access grants và record references như CID/contentHash/sourceType

Scope chốt:

* Patient/Doctor đăng ký và đăng nhập bằng CCCD/mã định danh + mật khẩu.
* Patient/Doctor liên kết MetaMask sau khi đăng nhập bằng chữ ký xác minh.
* Healthcare Facility được seed sẵn, không đăng ký trong demo.
* Smart contract lưu facilityId + active/hợp lệ.
* Patient cấp/thu hồi quyền cho facilityId.
* Doctor VERIFIED thuộc facilityId có thể gửi access request thay mặt cơ sở y tế.
* Patient duyệt request thì ký MetaMask và blockchain ghi quyền cho facilityId.
* Doctor đọc/upload hồ sơ nếu facilityId của doctor đã được patient cấp quyền.
* Admin không cần ví, chỉ verify doctor và quản lý trạng thái backend.
* Hồ sơ upload lưu IPFS, blockchain lưu CID/hash/metadata/sourceType.
* sourceType gồm PATIENT_UPLOADED và DOCTOR_UPLOADED.

Yêu cầu phase này:

1. Đồng bộ seed cơ sở y tế
   Đảm bảo facilityId giống nhau ở:

* Smart contract deploy script.
* Backend database seed/migration.
* Frontend hiển thị.

Seed tối thiểu:

* BV001: Bệnh viện A
* BV002: Bệnh viện B
* PK001: Phòng khám C

Nếu contract dùng bytes32:

* Ghi rõ cách convert facilityId trong frontend/backend/test.
  Nếu contract dùng string:
* Đảm bảo truyền string thống nhất.

2. Đồng bộ test accounts
   Cập nhật seed users nếu project có seeding:

Patient test:

* identityNumber/nationalId: ví dụ 079000000001
* password: password123
* fullName: Nguyễn Văn Bệnh Nhân
* role: PATIENT
* status: ACTIVE

Doctor test:

* identityNumber/nationalId: ví dụ 079000000002
* password: password123
* fullName: Trần Văn Bác Sĩ
* role: DOCTOR
* facilityId: BV001
* verificationStatus: VERIFIED hoặc PENDING_VERIFICATION tùy muốn test admin verify
* status: ACTIVE

Admin test:

* Giữ đơn giản theo code hiện tại.
* Có thể dùng username/email cũ nếu admin login chưa đổi.
* Admin không cần wallet.

3. Cập nhật README.md
   Cập nhật README để phản ánh đúng scope mới:

A. Tổng quan

* Hệ thống quản lý hồ sơ bệnh án điện tử ứng dụng blockchain.
* Không phải hệ thống quản lý bệnh viện/HIS.
* Không xử lý phân phòng khám, vòng khám, ca trực, phân công bác sĩ điều trị.

B. Kiến trúc lưu trữ

* File hồ sơ được mã hóa/lưu IPFS.
* Blockchain chỉ lưu:

  * quyền truy cập theo patientWallet -> facilityId.
  * CID.
  * contentHash.
  * uploader/sourceType.
  * timestamp.
* Không lưu file bệnh án trực tiếp trên blockchain.

C. Vai trò
Patient:

* Đăng ký/đăng nhập bằng CCCD/mã định danh + mật khẩu.
* Liên kết ví MetaMask.
* Cấp/thu hồi quyền cho cơ sở y tế.
* Duyệt/từ chối access request.
* Upload hồ sơ cá nhân.

Doctor:

* Đăng ký/đăng nhập bằng CCCD/mã định danh + mật khẩu.
* Chọn cơ sở y tế đang công tác.
* Liên kết ví MetaMask.
* Chờ admin verify.
* Gửi yêu cầu truy cập.
* Đọc/upload hồ sơ nếu cơ sở y tế đã được cấp quyền.

Healthcare Facility:

* Seed sẵn.
* Là đối tượng được cấp quyền.
* Không có tài khoản đăng ký trong demo.

Admin:

* Không cần ví.
* Verify/reject/lock doctor.
* Quản lý trạng thái tài khoản trong backend.

D. Giải thích facility access
Thêm đoạn:
“Trong hệ thống, quyền truy cập hồ sơ được cấp ở cấp cơ sở y tế. Bác sĩ đã xác thực có thể thay mặt cơ sở y tế gửi yêu cầu truy cập đến bệnh nhân. Khi bệnh nhân đồng ý, quyền truy cập được ghi nhận trên blockchain theo facilityId. Việc kiểm soát chi tiết nhân sự nội bộ của cơ sở y tế nằm ngoài phạm vi đồ án.”

E. Giải thích định danh
Thêm đoạn:
“Hệ thống sử dụng CCCD/mã định danh cá nhân làm tên đăng nhập nhằm mô phỏng cơ chế định danh tương tự VNeID. Hệ thống không tích hợp trực tiếp với VNeID hoặc Cơ sở dữ liệu quốc gia về dân cư trong phạm vi đồ án.”

F. Giải thích admin/deployer
Thêm đoạn:
“Admin hệ thống không cần ví. Ví deployer/owner chỉ dùng để triển khai smart contract và seed dữ liệu ban đầu, không tham gia luồng nghiệp vụ hằng ngày.”

4. Cập nhật local run/deploy instructions
   Đảm bảo README có:

* Lệnh chạy docker compose.
* Lệnh deploy smart contract.
* Cách copy contractAddress vào .env.
* Cách restart backend/frontend.
* Lưu ý Anvil reset thì phải deploy/seed contract lại.
* Lưu ý facility seed trong contract/database phải trùng nhau.
* Cập nhật MetaMask local network nếu cần.

5. Cập nhật frontend test flow
   Thay flow cũ bằng flow mới:

6. Start Docker stack.

7. Deploy smart contract và seed facilities.

8. Copy contractAddress vào .env.

9. Restart backend/frontend nếu cần.

10. Login/register Patient bằng CCCD/mã định danh.

11. Patient link MetaMask.

12. Login/register Doctor bằng CCCD/mã định danh, chọn BV001.

13. Doctor link MetaMask.

14. Login Admin.

15. Admin verify doctor.

16. Doctor tìm patient và gửi access request.

17. Patient vào access requests.

18. Patient approve request và ký MetaMask grantAccess(facilityId).

19. Doctor xem hồ sơ patient.

20. Doctor upload hồ sơ cho patient.

21. Patient upload hồ sơ cá nhân.

22. Kiểm tra record list hiển thị sourceType PATIENT_UPLOADED/DOCTOR_UPLOADED.

23. Patient revoke access.

24. Doctor thử đọc lại hồ sơ và phải bị chặn.

25. Cập nhật docs nếu có
    Nếu thư mục docs có architecture/workflow:

* Cập nhật sơ đồ/luồng mô tả access theo facilityId.
* Xóa hoặc chỉnh các đoạn nói patient grant trực tiếp cho doctor nếu không còn đúng.
* Ghi rõ access request lưu database, access grant chính thức lưu blockchain.
* Ghi rõ blockchain không lưu file bệnh án.

7. Final validation
   Chạy hoặc hướng dẫn chạy:

Backend:

* cd backend
* ./mvnw test hoặc .\mvnw.cmd test

Frontend:

* cd frontend
* npm install nếu cần
* npm run build

Blockchain:

* cd blockchain
* npm install nếu cần
* npm test

Docker/local:

* docker compose --env-file .env -f infrastructure/docker-compose.yml up -d --build
* deploy smart contract
* restart backend/frontend nếu contractAddress thay đổi

8. Không làm thêm trong phase này

* Không thêm nghiệp vụ mới.
* Không thêm tài khoản cơ sở y tế.
* Không thêm ví cho admin.
* Không tích hợp VNeID thật.
* Không làm phân công bác sĩ/phòng/khoa/ca trực.
* Không chuyển file bệnh án lên blockchain.

Sau khi hoàn tất, trả lời summary gồm:

1. Tài liệu nào đã sửa.
2. Seed data nào đã đồng bộ.
3. Flow test cuối cùng.
4. Lệnh build/test/deploy.
5. Những TODO/hạn chế còn lại để đưa vào báo cáo.





