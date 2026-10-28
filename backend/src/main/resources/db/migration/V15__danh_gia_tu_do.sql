-- Danh gia tu do (khong can sau kham): benh nhan cham co so vat chat, dich vu, cham tung nhan vien (le tan, bac si)
-- va viet gop y bat ky luc nao. Danh gia sau kham (UC12.1, BR24) giu nguyen; ca hai loai cung nam trong bang DanhGia.
ALTER TABLE DanhGia
  ADD COLUMN LoaiDanhGia ENUM('SAU_KHAM','TU_DO') NOT NULL DEFAULT 'SAU_KHAM' AFTER MaDG,
  MODIFY MaLK INT NULL COMMENT 'NULL voi danh gia tu do',
  MODIFY MaBS INT NULL COMMENT 'Bac si cua luot kham; NULL voi danh gia tu do (diem tung nhan vien o DanhGiaNhanVien)',
  DROP CHECK danhgia_chk_8,
  ADD CONSTRAINT chk_dg_sau_kham CHECK (LoaiDanhGia <> 'SAU_KHAM' OR (MaLK IS NOT NULL AND MaBS IS NOT NULL)),
  ADD CONSTRAINT chk_dg_tu_do CHECK (LoaiDanhGia <> 'TU_DO' OR (MaLK IS NULL AND DiemBacSi IS NULL)),
  ADD INDEX idx_dg_bn_tg (MaBN, ThoiGian);

-- Diem tung nhan vien trong mot danh gia tu do; khong bat buoc cham het, cham ai thi co dong cua nguoi do
CREATE TABLE DanhGiaNhanVien (
  MaDG    INT NOT NULL,
  MaNV    INT NOT NULL,
  Diem    TINYINT NOT NULL,
  NhanXet VARCHAR(500) NULL,
  PRIMARY KEY (MaDG, MaNV),
  FOREIGN KEY (MaDG) REFERENCES DanhGia(MaDG) ON DELETE CASCADE,
  FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV),
  INDEX idx_dgnv_nv (MaNV),
  CHECK (Diem BETWEEN 1 AND 5)
) ENGINE=InnoDB COMMENT = 'Diem le tan, bac si trong danh gia tu do';

-- BR24 (da thanh toan, trong 7 ngay) chi ap dung cho danh gia sau kham
DROP TRIGGER IF EXISTS trg_DanhGia_bi;
DELIMITER $$
CREATE TRIGGER trg_DanhGia_bi BEFORE INSERT ON DanhGia FOR EACH ROW
BEGIN
  IF NEW.MaLK IS NOT NULL THEN
    SET @bn = NULL, @bs = NULL, @tt = NULL;
    SELECT lk.MaBN, lk.MaBS, hd.NgayThanhToan INTO @bn, @bs, @tt
    FROM LuotKham lk LEFT JOIN HoaDon hd ON hd.MaLK = lk.MaLK AND hd.TrangThai = 'DA_THANH_TOAN'
    WHERE lk.MaLK = NEW.MaLK AND lk.TrangThai = 'HOAN_THANH';
    IF @tt IS NULL OR NEW.ThoiGian > @tt + INTERVAL 7 DAY THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR24: chi danh gia luot kham da thanh toan, trong vong 7 ngay';
    END IF;
    SET NEW.MaBN = @bn, NEW.MaBS = @bs;
  END IF;
END$$
DELIMITER ;
