UPDATE healthcare_facilities
SET name = 'Bệnh viện Chợ Rẫy',
    address = 'TP. Hồ Chí Minh',
    description = 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh',
    active = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE facility_id = 'BV001';

UPDATE healthcare_facilities
SET active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE facility_id IN ('BV002', 'PK001');

INSERT INTO healthcare_facilities (facility_id, name, address, description, active) VALUES
('BV003', 'Bệnh viện Đại học Y Dược TP.HCM', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV004', 'Bệnh viện Nhân dân 115', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV005', 'Bệnh viện Quân y 175', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV006', 'Bệnh viện Nhân dân Gia Định', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV007', 'Bệnh viện Thống Nhất', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV008', 'Bệnh viện Đa khoa Sài Gòn', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV009', 'Bệnh viện Nguyễn Tri Phương', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV010', 'Bệnh viện An Bình', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV011', 'Bệnh viện Từ Dũ', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV012', 'Bệnh viện Hùng Vương', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV013', 'Bệnh viện Nhi Đồng 1', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV014', 'Bệnh viện Nhi Đồng 2', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV015', 'Bệnh viện Nhi Đồng Thành Phố', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV016', 'Bệnh viện Ung Bướu TP.HCM', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV017', 'Bệnh viện Chấn thương Chỉnh hình TP.HCM', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV018', 'Bệnh viện Bình Dân', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV019', 'Bệnh viện Bệnh Nhiệt đới', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV020', 'Bệnh viện Mắt TP.HCM', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV021', 'Bệnh viện Tai Mũi Họng TP.HCM', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV022', 'Bệnh viện Răng Hàm Mặt TP.HCM', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE),
('BV023', 'Bệnh viện Da Liễu TP.HCM', 'TP. Hồ Chí Minh', 'Cơ sở khám chữa bệnh tại TP. Hồ Chí Minh', TRUE);
