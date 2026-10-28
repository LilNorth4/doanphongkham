-- UC1.7, BR34: tai khoan benh nhan quan ly toi da 5 ho so nguoi than de dat lich, theo doi luot kham, xem ho so.
-- Ho so da co tai phong kham chi lien ket khi nhap dung OTP gui toi so dien thoai cua ho so (5a)
-- hoac le tan xac nhan truc tiep khi ho so khong co so dien thoai (5b). Huy lien ket thi xoa dong, lich su kham giu nguyen.
CREATE TABLE NguoiThan (
  MaTK        INT NOT NULL,                      -- tai khoan quan ly
  MaBN        INT NOT NULL,                      -- ho so nguoi than
  QuanHe      VARCHAR(30) NOT NULL,              -- VD: Con, Bo, Me, Vo, Chong
  TrangThai   ENUM('CHO_OTP','CHO_LE_TAN','DA_LIEN_KET') NOT NULL,
  MaOTP       CHAR(6) NULL,                      -- OTP gui toi SDT cua ho so (giai doan CHO_OTP)
  HetHanOTP   DATETIME NULL,
  SoLanSai    TINYINT NOT NULL DEFAULT 0,
  NgayTao     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  NgayLienKet DATETIME NULL,
  MaTKXacNhan INT NULL,                          -- le tan xac nhan (5b)
  PRIMARY KEY (MaTK, MaBN),
  FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK),
  FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
  FOREIGN KEY (MaTKXacNhan) REFERENCES TaiKhoan(MaTK),
  INDEX idx_nt_bn (MaBN),
  CHECK (TrangThai <> 'DA_LIEN_KET' OR NgayLienKet IS NOT NULL),
  CHECK (TrangThai <> 'CHO_OTP' OR (MaOTP IS NOT NULL AND HetHanOTP IS NOT NULL))
) ENGINE=InnoDB COMMENT = 'Ho so nguoi than do tai khoan benh nhan quan ly (UC1.7, BR34)';
