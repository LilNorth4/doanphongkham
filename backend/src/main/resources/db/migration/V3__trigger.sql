-- #####################################################
-- PHAN 3. TRIGGER: rang buoc nghiep vu kiem tra ngay trong CSDL
-- (vong doi luot kham, phieu chi dinh, hoa don; BR03, BR06, BR21, BR24, BR26)
-- #####################################################
DELIMITER $$

-- Luot kham: ngay kham, bac si luon lay theo khung gio; BR03 toi da 3 lich chua hoan thanh
CREATE TRIGGER trg_LuotKham_bi BEFORE INSERT ON LuotKham FOR EACH ROW
BEGIN
  SET @ngay = NULL, @bs = NULL;
  SELECT kg.NgayKham, ca.MaBS INTO @ngay, @bs
  FROM KhungGio kg JOIN CaLamViec ca ON ca.MaCa = kg.MaCa WHERE kg.MaKG = NEW.MaKG;
  SET NEW.NgayKham = @ngay, NEW.MaBS = @bs;
  IF (SELECT COUNT(*) FROM LuotKham WHERE MaBN = NEW.MaBN
        AND TrangThai IN ('CHO_XAC_NHAN','DA_XAC_NHAN','DA_CHECK_IN','DANG_KHAM','CHO_CLS','DA_CO_KET_QUA')) >= 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR03: benh nhan da co 3 lich hen chua hoan thanh';
  END IF;
END$$

-- Luot kham: chi cho phep chuyen trang thai theo vong doi
CREATE TRIGGER trg_LuotKham_bu BEFORE UPDATE ON LuotKham FOR EACH ROW
BEGIN
  IF NEW.MaKG <> OLD.MaKG THEN
    SELECT kg.NgayKham, ca.MaBS INTO @ngay, @bs
    FROM KhungGio kg JOIN CaLamViec ca ON ca.MaCa = kg.MaCa WHERE kg.MaKG = NEW.MaKG;
    SET NEW.NgayKham = @ngay, NEW.MaBS = @bs;
  END IF;
  IF NEW.TrangThai <> OLD.TrangThai AND NOT (
       (OLD.TrangThai = 'CHO_XAC_NHAN'  AND NEW.TrangThai IN ('DA_XAC_NHAN','DA_HUY'))
    OR (OLD.TrangThai = 'DA_XAC_NHAN'   AND NEW.TrangThai IN ('CHO_XAC_NHAN','DA_CHECK_IN','DA_HUY','VANG_MAT'))
    OR (OLD.TrangThai = 'DA_CHECK_IN'   AND NEW.TrangThai = 'DANG_KHAM')
    OR (OLD.TrangThai = 'DANG_KHAM'     AND NEW.TrangThai IN ('CHO_CLS','HOAN_THANH'))
    OR (OLD.TrangThai = 'CHO_CLS'       AND NEW.TrangThai = 'DA_CO_KET_QUA')
    OR (OLD.TrangThai = 'DA_CO_KET_QUA' AND NEW.TrangThai = 'DANG_KHAM')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chuyen trang thai luot kham khong hop le';
  END IF;
END$$

-- Phieu chi dinh: vong doi Cho thanh toan -> Cho thuc hien -> Dang thuc hien -> Co ket qua
CREATE TRIGGER trg_PhieuChiDinh_bu BEFORE UPDATE ON PhieuChiDinh FOR EACH ROW
BEGIN
  IF NEW.TrangThai <> OLD.TrangThai AND NOT (
       (OLD.TrangThai = 'CHO_THANH_TOAN' AND NEW.TrangThai IN ('CHO_THUC_HIEN','DA_HUY'))
    OR (OLD.TrangThai = 'CHO_THUC_HIEN'  AND NEW.TrangThai IN ('DANG_THUC_HIEN','DA_HUY'))
    OR (OLD.TrangThai = 'DANG_THUC_HIEN' AND NEW.TrangThai IN ('CO_KET_QUA','CHO_THUC_HIEN'))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chuyen trang thai phieu chi dinh khong hop le';
  END IF;
  IF OLD.TrangThai <> 'CHO_THANH_TOAN' AND (NEW.GiaDichVu <> OLD.GiaDichVu OR NEW.BHYTChiTra <> OLD.BHYTChiTra) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong duoc sua chi phi phieu da thanh toan';
  END IF;
END$$

-- Hoa don: BR26 hoa don da thanh toan khong duoc sua, chi duoc huy; hoa don da huy giu nguyen de doi soat
CREATE TRIGGER trg_HoaDon_bu BEFORE UPDATE ON HoaDon FOR EACH ROW
BEGIN
  IF OLD.TrangThai = 'DA_HUY' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hoa don da huy khong duoc thay doi';
  END IF;
  IF NEW.TrangThai <> OLD.TrangThai AND NOT (
       (OLD.TrangThai = 'CHUA_THANH_TOAN' AND NEW.TrangThai IN ('DA_THANH_TOAN','DA_HUY'))
    OR (OLD.TrangThai = 'DA_THANH_TOAN'   AND NEW.TrangThai = 'DA_HUY')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chuyen trang thai hoa don khong hop le';
  END IF;
  IF OLD.TrangThai = 'DA_THANH_TOAN' AND NOT (
        NEW.MaLK <=> OLD.MaLK AND NEW.TongTien <=> OLD.TongTien AND NEW.BHYTChiTra <=> OLD.BHYTChiTra
    AND NEW.DaTamThu <=> OLD.DaTamThu AND NEW.HinhThuc <=> OLD.HinhThuc
    AND NEW.TienKhachDua <=> OLD.TienKhachDua AND NEW.NgayThanhToan <=> OLD.NgayThanhToan
    AND NEW.MaThuNgan <=> OLD.MaThuNgan) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR26: hoa don da thanh toan khong duoc sua';
  END IF;
END$$

CREATE TRIGGER trg_ChiTietHoaDon_bi BEFORE INSERT ON ChiTietHoaDon FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM HoaDon WHERE MaHD = NEW.MaHD) <> 'CHUA_THANH_TOAN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR26: chi sua chi tiet cua hoa don chua thanh toan';
  END IF;
END$$

CREATE TRIGGER trg_ChiTietHoaDon_bu BEFORE UPDATE ON ChiTietHoaDon FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM HoaDon WHERE MaHD = OLD.MaHD) <> 'CHUA_THANH_TOAN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR26: chi sua chi tiet cua hoa don chua thanh toan';
  END IF;
END$$

CREATE TRIGGER trg_ChiTietHoaDon_bd BEFORE DELETE ON ChiTietHoaDon FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM HoaDon WHERE MaHD = OLD.MaHD) <> 'CHUA_THANH_TOAN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR26: chi sua chi tiet cua hoa don chua thanh toan';
  END IF;
END$$

-- BR06: ho so da hoan tat khong duoc sua (chi bo sung ghi chu)
CREATE TRIGGER trg_HoSoBenhAn_bu BEFORE UPDATE ON HoSoBenhAn FOR EACH ROW
BEGIN
  IF OLD.TrangThai = 'HOAN_TAT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR06: ho so da hoan tat chi duoc bo sung ghi chu';
  END IF;
END$$

CREATE TRIGGER trg_DonThuoc_bi BEFORE INSERT ON DonThuoc FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM HoSoBenhAn WHERE MaHSBA = NEW.MaHSBA) = 'HOAN_TAT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR06: khong ke don cho ho so da hoan tat';
  END IF;
END$$

CREATE TRIGGER trg_DonThuoc_bd BEFORE DELETE ON DonThuoc FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM HoSoBenhAn WHERE MaHSBA = OLD.MaHSBA) = 'HOAN_TAT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR06: khong sua don thuoc cua ho so da hoan tat';
  END IF;
END$$

CREATE TRIGGER trg_ChiTietDonThuoc_bi BEFORE INSERT ON ChiTietDonThuoc FOR EACH ROW
BEGIN
  IF (SELECT hs.TrangThai FROM DonThuoc d JOIN HoSoBenhAn hs ON hs.MaHSBA = d.MaHSBA
      WHERE d.MaDon = NEW.MaDon) = 'HOAN_TAT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR06: khong sua don thuoc cua ho so da hoan tat';
  END IF;
END$$

CREATE TRIGGER trg_ChiTietDonThuoc_bu BEFORE UPDATE ON ChiTietDonThuoc FOR EACH ROW
BEGIN
  IF (SELECT hs.TrangThai FROM DonThuoc d JOIN HoSoBenhAn hs ON hs.MaHSBA = d.MaHSBA
      WHERE d.MaDon = OLD.MaDon) = 'HOAN_TAT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR06: khong sua don thuoc cua ho so da hoan tat';
  END IF;
END$$

-- UC8.11: chi bac si dieu tri bo sung ghi chu, sau khi ho so hoan tat
CREATE TRIGGER trg_GhiChuHoSo_bi BEFORE INSERT ON GhiChuHoSo FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM HoSoBenhAn hs JOIN LuotKham lk ON lk.MaLK = hs.MaLK
                 WHERE hs.MaHSBA = NEW.MaHSBA AND hs.TrangThai = 'HOAN_TAT' AND lk.MaBS = NEW.MaBS) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chi bac si dieu tri duoc bo sung ghi chu cho ho so da hoan tat';
  END IF;
END$$

-- Ket qua CLS: chi nhap khi phieu dang thuc hien; khong sua sau khi luot kham hoan tat (UC14.7)
CREATE TRIGGER trg_KetQuaCLS_bi BEFORE INSERT ON KetQuaCLS FOR EACH ROW
BEGIN
  IF (SELECT TrangThai FROM PhieuChiDinh WHERE MaPCD = NEW.MaPCD) <> 'DANG_THUC_HIEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Chi nhap ket qua cho phieu dang thuc hien';
  END IF;
END$$

CREATE TRIGGER trg_KetQuaCLS_bu BEFORE UPDATE ON KetQuaCLS FOR EACH ROW
BEGIN
  IF (SELECT lk.TrangThai FROM PhieuChiDinh p JOIN LuotKham lk ON lk.MaLK = p.MaLK
      WHERE p.MaPCD = OLD.MaPCD) = 'HOAN_THANH' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Luot kham da hoan tat, khong duoc cap nhat ket qua';
  END IF;
END$$

CREATE TRIGGER trg_KetQuaChiSo_bu BEFORE UPDATE ON KetQuaChiSo FOR EACH ROW
BEGIN
  IF (SELECT lk.TrangThai FROM KetQuaCLS k JOIN PhieuChiDinh p ON p.MaPCD = k.MaPCD
      JOIN LuotKham lk ON lk.MaLK = p.MaLK WHERE k.MaKQ = OLD.MaKQ) = 'HOAN_THANH' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Luot kham da hoan tat, khong duoc cap nhat ket qua';
  END IF;
END$$

-- BR24: danh gia luot kham da thanh toan, trong 7 ngay; benh nhan va bac si lay theo luot kham
CREATE TRIGGER trg_DanhGia_bi BEFORE INSERT ON DanhGia FOR EACH ROW
BEGIN
  SET @bn = NULL, @bs = NULL, @tt = NULL;
  SELECT lk.MaBN, lk.MaBS, hd.NgayThanhToan INTO @bn, @bs, @tt
  FROM LuotKham lk LEFT JOIN HoaDon hd ON hd.MaLK = lk.MaLK AND hd.TrangThai = 'DA_THANH_TOAN'
  WHERE lk.MaLK = NEW.MaLK AND lk.TrangThai = 'HOAN_THANH';
  IF @tt IS NULL OR NEW.ThoiGian > @tt + INTERVAL 7 DAY THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR24: chi danh gia luot kham da thanh toan, trong vong 7 ngay';
  END IF;
  SET NEW.MaBN = @bn, NEW.MaBS = @bs;
END$$

-- BR21: moi benh nhan toi da 2 dang ky cho con hieu luc
CREATE TRIGGER trg_DangKyCho_bi BEFORE INSERT ON DangKyCho FOR EACH ROW
BEGIN
  IF (SELECT COUNT(*) FROM DangKyCho WHERE MaBN = NEW.MaBN
        AND TrangThai IN ('DANG_CHO','DANG_DUOC_MOI')) >= 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BR21: toi da 2 dang ky cho con hieu luc';
  END IF;
END$$


DELIMITER ;
