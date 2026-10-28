-- The BHYT do le tan nhap (UC7.6, BR08): so the 15 ky tu = ma doi tuong (2 chu) + ma muc huong (1-5)
-- + ma tinh phat hanh (01-99) + ma so BHXH (10 so). Cong giam dinh BHXH duoc gia lap bang bang TheBHYT.

-- Mot nguoi (mot ma so BHXH) co the co nhieu the qua cac nam / khi doi doi tuong, nen bo rang buoc duy nhat
ALTER TABLE TheBHYT DROP INDEX MaSoBHXH, ADD INDEX idx_the_bhxh (MaSoBHXH);

-- Du lieu thu cu lay ma BHXH tu ky tu thu 4; dung la 10 ky tu cuoi cua so the (o 4)
UPDATE TheBHYT SET MaSoBHXH = RIGHT(MaThe, 10) WHERE MaSoBHXH <> RIGHT(MaThe, 10);

-- Du lieu thu cu ghi the huu tri "HT2..." (muc 2 = 100%) nhung luu 95%; doi tuong HT thuoc muc 3 (95%).
-- Sua so the o ca the va luot kham da dung the (khoa ngoai LuotKham.MaThe khong tu cap nhat theo)
SET FOREIGN_KEY_CHECKS = 0;
UPDATE LuotKham SET MaThe = CONCAT('HT3', SUBSTRING(MaThe, 4)) WHERE MaThe LIKE 'HT2%';
UPDATE TheBHYT SET MaThe = CONCAT('HT3', SUBSTRING(MaThe, 4)) WHERE MaThe LIKE 'HT2%';
SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE TheBHYT
  ADD COLUMN MaDoiTuong CHAR(2) AS (LEFT(MaThe, 2)) STORED COMMENT 'O 1: ma doi tuong tham gia' AFTER MaSoBHXH,
  ADD COLUMN MaMucHuong TINYINT AS (CAST(SUBSTRING(MaThe, 3, 1) AS UNSIGNED)) STORED COMMENT 'O 2: 1-5' AFTER MaDoiTuong,
  ADD COLUMN MaTinh CHAR(2) AS (SUBSTRING(MaThe, 4, 2)) STORED COMMENT 'O 3: tinh phat hanh' AFTER MaMucHuong,
  ADD COLUMN NgayDu5NamLienTuc DATE NULL COMMENT 'In tren the: thoi diem du 5 nam tham gia lien tuc' AFTER MucHuong,
  ADD COLUMN MienCungChiTraTu DATE NULL COMMENT 'Giay mien cung chi tra trong nam: hieu luc tu ngay nay den 31/12' AFTER NgayDu5NamLienTuc,
  ADD COLUMN MaTKCapNhat INT NULL COMMENT 'Le tan nhap / sua the' AFTER MienCungChiTraTu,
  ADD CONSTRAINT fk_the_tk FOREIGN KEY (MaTKCapNhat) REFERENCES TaiKhoan(MaTK),
  ADD CONSTRAINT chk_the_dinh_dang CHECK (MaThe REGEXP '^[A-Z]{2}[1-5][0-9]{2}[0-9]{10}$' AND SUBSTRING(MaThe, 4, 2) <> '00'),
  ADD CONSTRAINT chk_the_bhxh CHECK (MaSoBHXH = RIGHT(MaThe, 10)),
  ADD CONSTRAINT chk_the_muc CHECK (MucHuong = CASE CAST(SUBSTRING(MaThe, 3, 1) AS UNSIGNED) WHEN 3 THEN 95 WHEN 4 THEN 80 ELSE 100 END);

-- Luot kham ghi ma muc huong (5 = tra ca ngoai pham vi) va truong hop mien cung chi tra tai thoi diem check-in
ALTER TABLE LuotKham
  ADD COLUMN MaMucHuong TINYINT NULL COMMENT 'O 2 cua the luc check-in' AFTER MucHuong,
  ADD COLUMN MienCungChiTra BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Co giay mien cung chi tra: muc 3, 4 huong 100%' AFTER MaMucHuong;

UPDATE LuotKham lk JOIN TheBHYT t ON t.MaThe = lk.MaThe
SET lk.MaMucHuong = t.MaMucHuong
WHERE lk.TrangThaiBHYT = 'HOP_LE';

-- Hoa don ghi ly do BHYT tra 100% (chi phi duoi 15% luong co so, giay mien cung chi tra)
ALTER TABLE HoaDon ADD COLUMN GhiChuBHYT VARCHAR(255) NULL AFTER NgayHoanBHYT;
