# Facility Access Control

Quyền chính thức được lưu trên blockchain theo `patientWallet -> facilityId`.
Access request chỉ là workflow MySQL. Doctor đã verify và có ví gửi request thay
mặt facility của mình; backend không nhận facility ID từ request của doctor.

Patient ký grant/revoke bằng MetaMask. Backend chỉ đồng bộ SQL sau khi transaction
thành công và `hasFacilityAccess(patientWallet, facilityId)` khớp.

Doctor được truy cập khi doctor `VERIFIED`, hai bên có ví, facility active, SQL
grant active và quyền on-chain còn hiệu lực. Thu hồi on-chain làm doctor bị chặn.
