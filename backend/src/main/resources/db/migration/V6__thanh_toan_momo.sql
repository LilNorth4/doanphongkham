-- UC10.1-10.3: thanh toan hoa don cuoi luot kham, them hinh thuc vi MoMo (cong thanh toan truc tuyen)

ALTER TABLE HoaDon MODIFY HinhThuc ENUM('TIEN_MAT','CHUYEN_KHOAN','MOMO') NULL;

-- Benh nhan tu thanh toan qua MoMo thi khong co thu ngan
ALTER TABLE HoaDon DROP CHECK HoaDon_chk_3;
ALTER TABLE HoaDon ADD CONSTRAINT chk_hd_da_thanh_toan CHECK (TrangThai <> 'DA_THANH_TOAN'
  OR (HinhThuc IS NOT NULL AND NgayThanhToan IS NOT NULL AND (MaThuNgan IS NOT NULL OR HinhThuc = 'MOMO')));

-- Moi lan gui sang MoMo la mot giao dich (ma don duy nhat); hoa don chi chuyen Da thanh toan khi giao dich thanh cong
CREATE TABLE GiaoDichMoMo (
  MaGD          INT AUTO_INCREMENT PRIMARY KEY,
  MaDonMoMo     VARCHAR(50)  NOT NULL UNIQUE,      -- orderId / requestId gui MoMo
  MaHD          INT          NOT NULL,
  SoTien        DECIMAL(12,0) NOT NULL,
  TrangThai     ENUM('CHO_THANH_TOAN','THANH_CONG','THAT_BAI') NOT NULL DEFAULT 'CHO_THANH_TOAN',
  DuongDanThanhToan VARCHAR(500),                  -- payUrl: trang thanh toan cua MoMo
  MaGiaoDichMoMo BIGINT NULL,                      -- transId MoMo tra ve khi thanh cong
  MaKetQua      INT NULL,                          -- resultCode cua MoMo (0 = thanh cong)
  ThongDiep     VARCHAR(255),
  MaNguoiTao    INT NULL,                          -- thu ngan hoac benh nhan bam thanh toan
  ThoiDiemTao   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ThoiDiemCapNhat DATETIME NULL,
  FOREIGN KEY (MaHD)       REFERENCES HoaDon(MaHD),
  FOREIGN KEY (MaNguoiTao) REFERENCES TaiKhoan(MaTK),
  INDEX idx_gd_hd (MaHD, TrangThai),
  CHECK (SoTien >= 1000)
) ENGINE=InnoDB;

ALTER TABLE GiaoDichMoMo COMMENT = 'Giao dịch thanh toán hóa đơn qua ví MoMo (UC10.2)';
