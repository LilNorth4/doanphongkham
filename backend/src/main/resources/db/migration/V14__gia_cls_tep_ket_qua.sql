-- ---------- 1. Gia dich vu can lam sang sat thuc te ----------
-- GiaBHYT: muc BHYT thanh toan theo QD 402/QD-BYT ngay 09/02/2026 (Phong kham da khoa Truong DH Y Duoc Thai Nguyen):
--   tong phan tich te bao mau (laser) 49.700, glucose 22.400, tong phan tich nuoc tieu 28.600, X-quang nguc thang
--   so hoa 73.300, sieu am o bung 58.600, HbA1c 105.300. Noi soi thuc quan - da day - ta trang ong mem khong sinh thiet
--   244.000 (Phu luc III Thong tu 13/2019/TT-BYT; QD 402 tra cuu duoc khong co muc nay).
-- GiaDichVu: gia benh nhan tu tra tham khao phong kham tu nhan tinh (khong thap hon gia BHYT).
-- Phieu, hoa don da lap giu gia luc chi dinh (BR09).
UPDATE DichVu SET GiaDichVu = 90000,  GiaBHYT = 49700  WHERE MaDV = 6;   -- Tong phan tich te bao mau
UPDATE DichVu SET GiaDichVu = 35000,  GiaBHYT = 22400  WHERE MaDV = 7;   -- Duong huyet luc doi
UPDATE DichVu SET GiaDichVu = 50000,  GiaBHYT = 28600  WHERE MaDV = 8;   -- Tong phan tich nuoc tieu
UPDATE DichVu SET GiaDichVu = 130000, GiaBHYT = 73300  WHERE MaDV = 9;   -- X-quang nguc thang
UPDATE DichVu SET GiaDichVu = 180000, GiaBHYT = 58600  WHERE MaDV = 10;  -- Sieu am o bung tong quat
UPDATE DichVu SET GiaDichVu = 650000, GiaBHYT = 244000 WHERE MaDV = 11;  -- Noi soi da day ta trang
UPDATE DichVu SET GiaDichVu = 140000, GiaBHYT = 105300 WHERE MaDV = 12;  -- Xet nghiem HbA1c

-- ---------- 2. Tep ket qua CLS gan voi phieu chi dinh (UC9.3, UC9.4) ----------
-- Bac si CLS tai anh / PDF ngay khi dang thuc hien (truoc khi tra ket qua); CDHA, noi soi phai co anh moi tra duoc.
-- MaKQ giu lai cho du lieu cu, tep moi gan MaPCD.
ALTER TABLE TepDinhKem
  ADD COLUMN MaPCD INT NULL COMMENT 'Phieu chi dinh CLS (tai len khi dang thuc hien)' AFTER MaKQ,
  ADD CONSTRAINT fk_tep_pcd FOREIGN KEY (MaPCD) REFERENCES PhieuChiDinh(MaPCD);

UPDATE TepDinhKem t JOIN KetQuaCLS k ON k.MaKQ = t.MaKQ SET t.MaPCD = k.MaPCD WHERE t.MaPCD IS NULL;

ALTER TABLE TepDinhKem
  DROP CHECK tepdinhkem_chk_1,
  ADD CONSTRAINT chk_tep_mot_chu CHECK (
    (MaHSBA IS NOT NULL) + (MaPCD IS NOT NULL) + (MaDG IS NOT NULL) + (MaPhieu IS NOT NULL) = 1),
  ADD CONSTRAINT chk_tep_kq_pcd CHECK (MaKQ IS NULL OR MaPCD IS NOT NULL),
  ADD INDEX idx_tep_pcd (MaPCD);
