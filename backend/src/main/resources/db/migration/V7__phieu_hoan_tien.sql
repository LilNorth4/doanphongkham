-- UC10.4 hoan tien (BR31), UC10.5 huy hoa don va lap hoa don thay the
-- Vong doi phieu: Cho hoan -> Da hoan; phieu tren nguong (1.000.000 d) qua Cho duyet truoc; ket thuc khac: Tu choi
CREATE TABLE PhieuHoanTien (
  MaPHT        INT AUTO_INCREMENT PRIMARY KEY,
  MaSoPhieu    VARCHAR(20) NOT NULL UNIQUE,         -- HTyyMMdd####
  MaBL         INT NULL,                            -- chung tu goc: bien lai tam thu
  MaHD         INT NULL,                            --               hoac hoa don
  MaPCD        INT NULL,                            -- phieu chi dinh bi huy sau khi da thu
  LyDo         ENUM('HUY_PHIEU_CLS','BHYT_XAC_MINH','HOA_DON_THAY_THE','CHUYEN_KHOAN_THUA','KHAC') NOT NULL,
  GhiChu       VARCHAR(255),
  SoTien       DECIMAL(12,0) NOT NULL,
  TrangThai    ENUM('CHO_DUYET','CHO_HOAN','DA_HOAN','TU_CHOI') NOT NULL DEFAULT 'CHO_HOAN',
  MaNguoiLap   INT NULL,                            -- NULL = he thong tu tao (VD bac si huy phieu da thu)
  ThoiDiemLap  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MaNguoiDuyet INT NULL,
  ThoiDiemDuyet DATETIME NULL,
  LyDoTuChoi   VARCHAR(255),
  HinhThuc     ENUM('TIEN_MAT','CHUYEN_KHOAN') NULL,
  NganHang     VARCHAR(100),
  SoTaiKhoan   VARCHAR(30),
  TenTaiKhoan  VARCHAR(100),
  MaThuNgan    INT NULL,                            -- nguoi chi tien
  ThoiDiemHoan DATETIME NULL,
  FOREIGN KEY (MaBL)         REFERENCES BienLaiTamThu(MaBL),
  FOREIGN KEY (MaHD)         REFERENCES HoaDon(MaHD),
  FOREIGN KEY (MaPCD)        REFERENCES PhieuChiDinh(MaPCD),
  FOREIGN KEY (MaNguoiLap)   REFERENCES TaiKhoan(MaTK),
  FOREIGN KEY (MaNguoiDuyet) REFERENCES TaiKhoan(MaTK),
  FOREIGN KEY (MaThuNgan)    REFERENCES NhanVien(MaNV),
  INDEX idx_pht_tt (TrangThai, ThoiDiemLap),
  INDEX idx_pht_hoan (TrangThai, ThoiDiemHoan),
  CHECK ((MaBL IS NULL) <> (MaHD IS NULL)),
  CHECK (SoTien > 0),
  CHECK (TrangThai <> 'DA_HOAN' OR (HinhThuc IS NOT NULL AND MaThuNgan IS NOT NULL AND ThoiDiemHoan IS NOT NULL)),
  CHECK (TrangThai <> 'TU_CHOI' OR LyDoTuChoi IS NOT NULL),
  CHECK (HinhThuc <> 'CHUYEN_KHOAN' OR (SoTaiKhoan IS NOT NULL AND NganHang IS NOT NULL))
) ENGINE=InnoDB;

ALTER TABLE PhieuHoanTien COMMENT = 'Phiếu hoàn tiền gắn biên lai hoặc hóa đơn gốc (UC10.4, BR31)';

-- Lap / chi phieu hoan tien da cap cho le tan o V5; huy hoa don (HOA_DON.HUY) cua quan tri vien co tu V1
