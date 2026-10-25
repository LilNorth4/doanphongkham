-- =====================================================
-- V1: TAO BANG, VIEW, CHU THICH, DU LIEU DANH MUC (MySQL 8.0.16+)
-- Flyway chay tu dong khi backend khoi dong. Da chay roi thi KHONG sua file nay:
-- muon doi cau truc thi them file moi V4__..., V5__...
-- Thiet ke theo tai lieu "He thong quan ly phong kham" (Chuong 2: 14 goi chuc nang, BR01-BR27)
-- =====================================================

-- #####################################################
-- PHAN 1. TAO BANG
-- #####################################################

-- =====================================================
-- 1. TAI KHOAN, VAI TRO, PHAN QUYEN (goi 1, 2)
-- =====================================================
CREATE TABLE VaiTro (
  MaVaiTro  INT AUTO_INCREMENT PRIMARY KEY,
  MaCode    VARCHAR(30)  NOT NULL UNIQUE,     -- BENH_NHAN, LE_TAN, BAC_SI, BS_XET_NGHIEM, BS_CDHA, BS_NOI_SOI, QUAN_TRI
  TenVaiTro VARCHAR(100) NOT NULL,
  MoTa      VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE Quyen (
  MaQuyen   INT AUTO_INCREMENT PRIMARY KEY,
  MaCode    VARCHAR(50)  NOT NULL UNIQUE,     -- VD: LICH_HEN.DUYET
  TenQuyen  VARCHAR(150) NOT NULL,
  NhomChucNang VARCHAR(100) NOT NULL          -- ten goi chuc nang
) ENGINE=InnoDB;

CREATE TABLE VaiTroQuyen (                    -- UC2.7 bang quyen theo vai tro
  MaVaiTro INT NOT NULL,
  MaQuyen  INT NOT NULL,
  PRIMARY KEY (MaVaiTro, MaQuyen),
  FOREIGN KEY (MaVaiTro) REFERENCES VaiTro(MaVaiTro) ON DELETE CASCADE,
  FOREIGN KEY (MaQuyen)  REFERENCES Quyen(MaQuyen)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pham vi nhom chuc nang cua tung vai tro: vai tro chi duoc gan quyen thuoc cac nhom trong bang nay,
-- nhom khong co thi giao dien khong cho tich (UC2.7)
CREATE TABLE VaiTroNhomChucNang (
  MaVaiTro     INT          NOT NULL,
  NhomChucNang VARCHAR(100) NOT NULL,
  PRIMARY KEY (MaVaiTro, NhomChucNang),
  FOREIGN KEY (MaVaiTro) REFERENCES VaiTro(MaVaiTro) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE TaiKhoan (
  MaTK           INT AUTO_INCREMENT PRIMARY KEY,
  Email          VARCHAR(100) UNIQUE,         -- dang nhap bang email hoac SDT (UC1.3)
  SDT            VARCHAR(15)  UNIQUE,
  MatKhauHash    VARCHAR(255) NOT NULL,
  MaVaiTro       INT NOT NULL,
  TrangThai      ENUM('CHUA_KICH_HOAT','HOAT_DONG','BI_KHOA') NOT NULL DEFAULT 'CHUA_KICH_HOAT',
  LyDoKhoa       VARCHAR(255),
  SoLanSai       TINYINT  NOT NULL DEFAULT 0, -- BR15: sai 5 lan -> khoa 15 phut
  KhoaDen        DATETIME NULL,
  PhaiDoiMatKhau BOOLEAN  NOT NULL DEFAULT FALSE,  -- mat khau tam thoi (UC2.2, UC2.5)
  LanDangNhapCuoi DATETIME NULL,
  NgayTao        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaVaiTro) REFERENCES VaiTro(MaVaiTro),
  CHECK (Email IS NOT NULL OR SDT IS NOT NULL)
) ENGINE=InnoDB;

-- Phan quyen rieng tung tai khoan: nhan quyen cua vai tro TRU cac quyen trong bang nay
-- (chi bot trong pham vi vai tro, khong cap them quyen ngoai vai tro)
CREATE TABLE TaiKhoanBoQuyen (
  MaTK    INT NOT NULL,
  MaQuyen INT NOT NULL,
  PRIMARY KEY (MaTK, MaQuyen),
  FOREIGN KEY (MaTK)    REFERENCES TaiKhoan(MaTK) ON DELETE CASCADE,
  FOREIGN KEY (MaQuyen) REFERENCES Quyen(MaQuyen)  ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE MaOTP (                           -- UC1.2 xac thuc email, UC1.4 khoi phuc mat khau
  MaOTP    INT AUTO_INCREMENT PRIMARY KEY,
  MaTK     INT NOT NULL,
  MaSo     CHAR(6) NOT NULL,
  MucDich  ENUM('XAC_THUC_EMAIL','KHOI_PHUC_MAT_KHAU') NOT NULL,
  HetHan   DATETIME NOT NULL,                  -- 5 phut
  SoLanSai TINYINT NOT NULL DEFAULT 0,         -- nhap sai 5 lan -> ma bi vo hieu
  DaDung   BOOLEAN NOT NULL DEFAULT FALSE,
  NgayTao  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK) ON DELETE CASCADE,
  INDEX idx_otp_tk (MaTK, MucDich, DaDung)
) ENGINE=InnoDB;

CREATE TABLE PhienDangNhap (                   -- de huy phien khi doi mat khau / khoa tai khoan
  MaPhien      BIGINT AUTO_INCREMENT PRIMARY KEY,
  MaTK         INT NOT NULL,
  RefreshTokenHash CHAR(64) NOT NULL UNIQUE,
  ThietBi      VARCHAR(255),
  NgayTao      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  HetHan       DATETIME NOT NULL,
  DaThuHoi     BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE NhatKyThaoTac (                   -- UC2.6 gan vai tro, UC10.5 huy hoa don...
  MaNK       BIGINT AUTO_INCREMENT PRIMARY KEY,
  MaTK       INT NULL,
  HanhDong   VARCHAR(100) NOT NULL,
  DoiTuong   VARCHAR(50),
  MaDoiTuong VARCHAR(50),
  ChiTiet    TEXT,
  ThoiGian   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK),
  INDEX idx_nk_tg (ThoiGian)
) ENGINE=InnoDB;

-- =====================================================
-- 2. DANH MUC (goi 3)
-- =====================================================
CREATE TABLE ThongTinPhongKham (               -- UC3.6, chi 1 dong
  Id          TINYINT PRIMARY KEY DEFAULT 1,
  TenPhongKham VARCHAR(150) NOT NULL,
  GioiThieu   TEXT,
  DiaChi      VARCHAR(255) NOT NULL,
  GioLamViec  VARCHAR(255) NOT NULL,
  Hotline     VARCHAR(15)  NOT NULL,
  Email       VARCHAR(100),
  HinhAnh     VARCHAR(255),
  MaNganHang  VARCHAR(20),                     -- thong tin nhan VietQR (BR26)
  SoTaiKhoan  VARCHAR(30),
  TenTaiKhoan VARCHAR(100),
  CHECK (Id = 1)
) ENGINE=InnoDB;

CREATE TABLE ChuyenKhoa (
  MaCK         INT AUTO_INCREMENT PRIMARY KEY,
  TenCK        VARCHAR(100) NOT NULL UNIQUE,
  MoTa         VARCHAR(500),
  AnhDaiDien   VARCHAR(255),
  PhiKhamCoBan DECIMAL(12,0) NOT NULL DEFAULT 0,
  TrangThai    ENUM('HOAT_DONG','NGUNG_HOAT_DONG') NOT NULL DEFAULT 'HOAT_DONG',  -- BR07
  CHECK (PhiKhamCoBan >= 0)
) ENGINE=InnoDB;

-- ---------- So do mat bang (UC3.9, BR22) ----------
CREATE TABLE Tang (
  MaTang     INT AUTO_INCREMENT PRIMARY KEY,
  SoTang     TINYINT NOT NULL UNIQUE,
  TenTang    VARCHAR(50) NOT NULL,
  AnhMatBang VARCHAR(255),
  TiLe       DECIMAL(8,4) NOT NULL DEFAULT 0.05   -- so met tren 1 pixel cua anh
) ENGINE=InnoDB;

CREATE TABLE Phong (
  MaPhong   INT AUTO_INCREMENT PRIMARY KEY,
  MaSoPhong VARCHAR(10)  NOT NULL UNIQUE,        -- VD: P101
  TenPhong  VARCHAR(100) NOT NULL,
  MaTang    INT NOT NULL,
  LoaiPhong ENUM('KHAM_BENH','XET_NGHIEM','X_QUANG','SIEU_AM','NOI_SOI') NOT NULL,
  MaCK      INT NULL,                            -- phong kham benh thuoc chuyen khoa
  TrangThai ENUM('HOAT_DONG','NGUNG_HOAT_DONG') NOT NULL DEFAULT 'HOAT_DONG',
  FOREIGN KEY (MaTang) REFERENCES Tang(MaTang),
  FOREIGN KEY (MaCK)   REFERENCES ChuyenKhoa(MaCK),
  CHECK (LoaiPhong <> 'KHAM_BENH' OR MaCK IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE DiemNut (                          -- dinh cua do thi duong di
  MaDiem   INT AUTO_INCREMENT PRIMARY KEY,
  MaTang   INT NOT NULL,
  TenDiem  VARCHAR(100) NOT NULL,
  LoaiDiem ENUM('PHONG','HANH_LANG','NGA_RE','CAU_THANG','THANG_MAY','QUAY_TIEP_DON','QUAY_THU_NGAN','SANH') NOT NULL,
  ToaDoX   INT NOT NULL,                        -- toa do pixel tren anh mat bang
  ToaDoY   INT NOT NULL,
  MaPhong  INT NULL UNIQUE,                     -- vi tri cua phong tren so do
  FOREIGN KEY (MaTang)  REFERENCES Tang(MaTang),
  FOREIGN KEY (MaPhong) REFERENCES Phong(MaPhong),
  CHECK ((LoaiDiem = 'PHONG') = (MaPhong IS NOT NULL))
) ENGINE=InnoDB;

CREATE TABLE DoanDuong (                        -- canh cua do thi (vo huong)
  MaDoan     INT AUTO_INCREMENT PRIMARY KEY,
  MaDiemDau  INT NOT NULL,
  MaDiemCuoi INT NOT NULL,
  LoaiDoan   ENUM('DI_BO','CAU_THANG','THANG_MAY') NOT NULL DEFAULT 'DI_BO',
  DoDai      DECIMAL(7,2) NOT NULL DEFAULT 0,   -- met (DI_BO); 1 m/giay
  SoTang     TINYINT NOT NULL DEFAULT 0,        -- so tang di qua: cau thang 30s/tang, thang may 60s
  FOREIGN KEY (MaDiemDau)  REFERENCES DiemNut(MaDiem),
  FOREIGN KEY (MaDiemCuoi) REFERENCES DiemNut(MaDiem),
  UNIQUE (MaDiemDau, MaDiemCuoi),
  CHECK (MaDiemDau <> MaDiemCuoi),
  CHECK (DoDai >= 0)
) ENGINE=InnoDB;

-- ---------- Dich vu (UC3.3) ----------
CREATE TABLE DichVu (
  MaDV        INT AUTO_INCREMENT PRIMARY KEY,
  TenDV       VARCHAR(150) NOT NULL,
  LoaiDV      ENUM('KHAM','XET_NGHIEM','CDHA','NOI_SOI') NOT NULL,
  MaCK        INT NULL,                         -- dich vu kham thuoc chuyen khoa
  MaPhong     INT NULL,                         -- phong thuc hien (dich vu CLS)
  GiaDichVu   DECIMAL(12,0) NOT NULL,
  GiaBHYT     DECIMAL(12,0) NULL,               -- NULL = khong thuoc danh muc BHYT (BR09)
  MauKetQua   TEXT,
  YeuCauNhinAn BOOLEAN NOT NULL DEFAULT FALSE,  -- BR18 muc 1
  ThoiGianThucHien  SMALLINT NULL,              -- phut, BR16/BR18
  ThoiGianTraKetQua SMALLINT NULL,              -- phut, BR18 muc 2
  TrangThai   ENUM('HOAT_DONG','NGUNG_HOAT_DONG') NOT NULL DEFAULT 'HOAT_DONG',
  FOREIGN KEY (MaCK)    REFERENCES ChuyenKhoa(MaCK),
  FOREIGN KEY (MaPhong) REFERENCES Phong(MaPhong),
  CHECK (GiaDichVu >= 0),
  CHECK (GiaBHYT IS NULL OR GiaBHYT BETWEEN 0 AND GiaDichVu),
  CHECK (LoaiDV <> 'KHAM' OR MaCK IS NOT NULL),
  CHECK (LoaiDV = 'KHAM' OR MaPhong IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE RangBuocDichVu (                   -- BR18: MaDVTruoc phai thuc hien truoc MaDV
  MaDV      INT NOT NULL,
  MaDVTruoc INT NOT NULL,
  PRIMARY KEY (MaDV, MaDVTruoc),
  FOREIGN KEY (MaDV)      REFERENCES DichVu(MaDV) ON DELETE CASCADE,
  FOREIGN KEY (MaDVTruoc) REFERENCES DichVu(MaDV) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE MauChiSo (                         -- UC3.7 mau chi so xet nghiem
  MaChiSo     INT AUTO_INCREMENT PRIMARY KEY,
  MaDV        INT NOT NULL,
  TenChiSo    VARCHAR(100) NOT NULL,
  DonVi       VARCHAR(30),
  GioiHanDuoi DECIMAL(10,3) NULL,
  GioiHanTren DECIMAL(10,3) NULL,
  BatBuoc     BOOLEAN NOT NULL DEFAULT TRUE,
  ThuTu       SMALLINT NOT NULL DEFAULT 0,
  TrangThai   ENUM('HOAT_DONG','NGUNG_HOAT_DONG') NOT NULL DEFAULT 'HOAT_DONG',
  FOREIGN KEY (MaDV) REFERENCES DichVu(MaDV),
  UNIQUE (MaDV, TenChiSo),
  CHECK (GioiHanDuoi IS NULL OR GioiHanTren IS NULL OR GioiHanDuoi <= GioiHanTren)
) ENGINE=InnoDB;

CREATE TABLE Thuoc (                            -- UC3.4
  MaThuoc   INT AUTO_INCREMENT PRIMARY KEY,
  TenThuoc  VARCHAR(150) NOT NULL,
  HoatChat  VARCHAR(150),
  HamLuong  VARCHAR(50),
  DonViTinh VARCHAR(20) NOT NULL,
  DonGia    DECIMAL(12,0) NOT NULL,
  GiaBHYT   DECIMAL(12,0) NULL,                 -- NULL = thuoc ngoai danh muc BHYT
  TrangThai ENUM('HOAT_DONG','NGUNG_HOAT_DONG') NOT NULL DEFAULT 'HOAT_DONG',
  CHECK (DonGia >= 0),
  CHECK (GiaBHYT IS NULL OR GiaBHYT BETWEEN 0 AND DonGia)
) ENGINE=InnoDB;

CREATE TABLE BenhICD (                          -- UC3.8 danh muc ICD-10
  MaICD     VARCHAR(10) PRIMARY KEY,
  TenBenh   VARCHAR(255) NOT NULL,
  TrangThai ENUM('HOAT_DONG','NGUNG_HOAT_DONG') NOT NULL DEFAULT 'HOAT_DONG'
) ENGINE=InnoDB;

CREATE TABLE CauHoiThuongGap (                  -- UC12.6 du lieu tri thuc chatbot
  MaCH       INT AUTO_INCREMENT PRIMARY KEY,
  ChuDe      VARCHAR(100),
  CauHoi     VARCHAR(500) NOT NULL,
  TraLoi     TEXT NOT NULL,
  TrangThai  ENUM('HOAT_DONG','NGUNG_HOAT_DONG') NOT NULL DEFAULT 'HOAT_DONG',
  NgayCapNhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 3. CON NGUOI
-- =====================================================
CREATE TABLE NhanVien (
  MaNV       INT AUTO_INCREMENT PRIMARY KEY,
  MaTK       INT NOT NULL UNIQUE,
  HoTen      VARCHAR(100) NOT NULL,
  NgaySinh   DATE,
  GioiTinh   ENUM('NAM','NU'),
  SDT        VARCHAR(15),
  Email      VARCHAR(100),
  DiaChi     VARCHAR(255),
  AnhDaiDien VARCHAR(255),
  LoaiNhanVien ENUM('LE_TAN','BAC_SI','BS_XET_NGHIEM','BS_CDHA','BS_NOI_SOI','QUAN_TRI') NOT NULL,
  -- Thong tin bac si lam sang (UC3.2)
  MaCK       INT NULL,
  HocHamHocVi VARCHAR(50),
  SoNamKinhNghiem TINYINT,
  GioiThieu  TEXT,
  DiemDanhGiaTB DECIMAL(3,2) NULL,              -- cap nhat khi co danh gia (UC9.5)
  SoLuotDanhGia INT NOT NULL DEFAULT 0,
  -- Bac si can lam sang duoc phan cong phong (UC2.2, BR11)
  MaPhongPhuTrach INT NULL,
  TrangThai  ENUM('HOAT_DONG','NGUNG_HOAT_DONG') NOT NULL DEFAULT 'HOAT_DONG',
  FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK),
  FOREIGN KEY (MaCK) REFERENCES ChuyenKhoa(MaCK),
  FOREIGN KEY (MaPhongPhuTrach) REFERENCES Phong(MaPhong),
  CHECK (LoaiNhanVien <> 'BAC_SI' OR MaCK IS NOT NULL),
  CHECK (LoaiNhanVien NOT IN ('BS_XET_NGHIEM','BS_CDHA','BS_NOI_SOI') OR MaPhongPhuTrach IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE BenhNhan (
  MaBN       INT AUTO_INCREMENT PRIMARY KEY,
  MaTK       INT NULL UNIQUE,                   -- NULL: ho so do le tan tao theo SDT (BR23)
  HoTen      VARCHAR(100) NOT NULL,
  NgaySinh   DATE,
  GioiTinh   ENUM('NAM','NU'),
  SDT        VARCHAR(15),
  CCCD       VARCHAR(12) UNIQUE,
  Email      VARCHAR(100),
  DiaChi     VARCHAR(255),
  AnhDaiDien VARCHAR(255),
  NguoiLienHe    VARCHAR(100),
  SDTNguoiLienHe VARCHAR(15),
  DiUng      TEXT,                               -- di ung da ghi nhan, dung cho tom tat tien su
  NgayTao    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK),
  INDEX idx_bn_sdt (SDT),
  INDEX idx_bn_hoten (HoTen)
) ENGINE=InnoDB;

CREATE TABLE TheBHYT (                           -- UC7.10, UC7.11
  MaThe      VARCHAR(15) PRIMARY KEY,           -- ma the 15 ky tu
  MaSoBHXH   CHAR(10) UNIQUE,                   -- ma so BHXH 10 chu so
  MaBN       INT NOT NULL,
  HoTenTrenThe   VARCHAR(100) NOT NULL,         -- doi chieu BR08
  NgaySinhTrenThe DATE NOT NULL,
  NoiDKKCB   VARCHAR(150),
  NgayBatDau DATE NOT NULL,
  NgayHetHan DATE NOT NULL,
  MucHuong   TINYINT NOT NULL,
  NgayCapNhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
  CHECK (NgayHetHan >= NgayBatDau),
  CHECK (MucHuong IN (80, 95, 100))
) ENGINE=InnoDB;

-- =====================================================
-- 4. LICH LAM VIEC (goi 4)
-- =====================================================
CREATE TABLE DangKyCa (                          -- UC4.2, UC4.4
  MaDK       INT AUTO_INCREMENT PRIMARY KEY,
  MaBS       INT NOT NULL,
  NgayLam    DATE NOT NULL,
  CaLam      ENUM('SANG','CHIEU') NOT NULL,
  GhiChu     VARCHAR(255),
  TrangThai  ENUM('CHO_DUYET','DA_DUYET','TU_CHOI','DA_HUY') NOT NULL DEFAULT 'CHO_DUYET',
  LyDoTuChoi VARCHAR(255),
  MaNguoiDuyet INT NULL,
  NgayDuyet  DATETIME NULL,
  NgayTao    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaBS)         REFERENCES NhanVien(MaNV),
  FOREIGN KEY (MaNguoiDuyet) REFERENCES NhanVien(MaNV),
  INDEX idx_dkca_bs (MaBS, NgayLam, CaLam),
  INDEX idx_dkca_duyet (TrangThai, NgayLam)
) ENGINE=InnoDB;

CREATE TABLE CaLamViec (                         -- UC4.1: SANG 7h-11h30, CHIEU 13h30-17h
  MaCa       INT AUTO_INCREMENT PRIMARY KEY,
  MaBS       INT NOT NULL,
  NgayLam    DATE NOT NULL,
  CaLam      ENUM('SANG','CHIEU') NOT NULL,
  MaPhong    INT NOT NULL,
  ThoiLuongKhungGio TINYINT NOT NULL DEFAULT 15,  -- phut
  MaDK       INT NULL UNIQUE,                   -- ca duoc tao tu dang ky
  NgayTao    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaBS)    REFERENCES NhanVien(MaNV),
  FOREIGN KEY (MaPhong) REFERENCES Phong(MaPhong),
  FOREIGN KEY (MaDK)    REFERENCES DangKyCa(MaDK),
  UNIQUE (MaBS, NgayLam, CaLam),                -- bac si khong trung ca
  UNIQUE (MaPhong, NgayLam, CaLam),             -- phong khong phan cho 2 bac si cung ca
  CHECK (ThoiLuongKhungGio BETWEEN 5 AND 60)
) ENGINE=InnoDB;

CREATE TABLE KhungGio (                          -- UC4.3 sinh khung gio
  MaKG       INT AUTO_INCREMENT PRIMARY KEY,
  MaCa       INT NOT NULL,
  NgayKham   DATE NOT NULL,
  GioBatDau  TIME NOT NULL,
  GioKetThuc TIME NOT NULL,
  TrangThai  ENUM('TRONG','DA_DAT','DANG_GIU_CHO','DA_KHOA') NOT NULL DEFAULT 'TRONG',
  LyDoKhoa   VARCHAR(255),
  MaNguoiKhoa INT NULL,
  FOREIGN KEY (MaCa) REFERENCES CaLamViec(MaCa) ON DELETE CASCADE,
  FOREIGN KEY (MaNguoiKhoa) REFERENCES TaiKhoan(MaTK),
  UNIQUE (MaCa, GioBatDau),
  INDEX idx_kg_trong (NgayKham, TrangThai),
  CHECK (GioKetThuc > GioBatDau)
) ENGINE=InnoDB;

-- =====================================================
-- 5. LUOT KHAM = LICH HEN (goi 6, 7, 8)
-- Vong doi: CHO_XAC_NHAN -> DA_XAC_NHAN -> DA_CHECK_IN -> DANG_KHAM -> CHO_CLS
--           -> DA_CO_KET_QUA -> HOAN_THANH ; ket thuc khac: DA_HUY, VANG_MAT
-- =====================================================
CREATE TABLE LuotKham (
  MaLK        INT AUTO_INCREMENT PRIMARY KEY,
  MaLichHen   VARCHAR(20) NOT NULL UNIQUE,      -- ma doc cho benh nhan, VD: LH2610090001
  MaBN        INT NOT NULL,
  MaBS        INT NOT NULL,
  MaKG        INT NOT NULL,
  NgayKham    DATE NOT NULL,                    -- = KhungGio.NgayKham, de loc nhanh
  KenhDat     ENUM('UNG_DUNG','WEB','DIEN_THOAI','TIN_NHAN','TAI_QUAY') NOT NULL,  -- BR23
  LyDoKham    VARCHAR(500),
  TrieuChungSoBo VARCHAR(500),
  TrangThai   ENUM('CHO_XAC_NHAN','DA_XAC_NHAN','DA_CHECK_IN','DANG_KHAM','CHO_CLS',
                   'DA_CO_KET_QUA','HOAN_THANH','DA_HUY','VANG_MAT') NOT NULL DEFAULT 'CHO_XAC_NHAN',
  SoLanDoi    TINYINT NOT NULL DEFAULT 0,        -- BR04: toi da 2 lan
  MaNguoiTao  INT NULL,                          -- tai khoan tao (benh nhan hoac le tan)
  MaNguoiDuyet INT NULL,
  ThoiDiemDuyet DATETIME NULL,
  LyDoHuy     VARCHAR(255),
  MaNguoiHuy  INT NULL,
  ThoiDiemHuy DATETIME NULL,
  DaNhacLich  BOOLEAN NOT NULL DEFAULT FALSE,    -- UC13.2
  -- Tiep don, BHYT (UC7.5, UC7.10)
  ThoiDiemCheckIn DATETIME NULL,
  MaLeTanCheckIn  INT NULL,
  SoThuTu     SMALLINT NULL,                     -- so in tren phieu kham
  ThuTuHangCho DECIMAL(16,3) NULL,               -- khoa sap xep hang cho: bo qua -> cuoi, quay lai sau CLS -> dau
  MaThe       VARCHAR(15) NULL,
  TrangThaiBHYT ENUM('KHONG_CO','HOP_LE','KHONG_HOP_LE','CHO_XAC_MINH') NOT NULL DEFAULT 'KHONG_CO',
  MucHuong    TINYINT NULL,                      -- muc huong tai thoi diem kham
  -- Thoi gian cho (UC13.4, UC13.5)
  ThoiGianChoDuKien SMALLINT NULL,               -- phut
  GioDuKienVaoKham  DATETIME NULL,
  DaThongBaoSapDenLuot BOOLEAN NOT NULL DEFAULT FALSE,
  SoLanBoQua  TINYINT NOT NULL DEFAULT 0,        -- UC6.6 2a: bi chuyen xuong cuoi hang cho
  ThoiDiemBatDauKham  DATETIME NULL,             -- BR16 thoi luong thuc te
  ThoiDiemKetThucKham DATETIME NULL,
  DaGuiLoiMoiDanhGia  BOOLEAN NOT NULL DEFAULT FALSE,  -- UC13.12
  NgayTao     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- BR01: lich da huy khong con giu khung gio
  KGHieuLuc   INT AS (IF(TrangThai = 'DA_HUY', NULL, MaKG)) STORED,
  FOREIGN KEY (MaBN)  REFERENCES BenhNhan(MaBN),
  FOREIGN KEY (MaBS)  REFERENCES NhanVien(MaNV),
  FOREIGN KEY (MaKG)  REFERENCES KhungGio(MaKG),
  FOREIGN KEY (MaNguoiTao)   REFERENCES TaiKhoan(MaTK),
  FOREIGN KEY (MaNguoiDuyet) REFERENCES TaiKhoan(MaTK),
  FOREIGN KEY (MaNguoiHuy)   REFERENCES TaiKhoan(MaTK),
  FOREIGN KEY (MaLeTanCheckIn) REFERENCES NhanVien(MaNV),
  FOREIGN KEY (MaThe)  REFERENCES TheBHYT(MaThe),
  UNIQUE (KGHieuLuc),
  UNIQUE (MaBS, NgayKham, SoThuTu),
  INDEX idx_lk_bn (MaBN, TrangThai),
  INDEX idx_lk_ngay (NgayKham, TrangThai),
  INDEX idx_lk_hangcho (MaBS, NgayKham, TrangThai, ThuTuHangCho),
  INDEX idx_lk_tacvu (TrangThai, DaNhacLich),                -- tac vu dinh ky: nhac lich, tu dong vang mat
  CHECK (SoLanDoi BETWEEN 0 AND 2),
  CHECK (TrangThaiBHYT <> 'HOP_LE' OR MucHuong IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE HoSoBenhAn (                        -- UC8.3; BR06: hoan tat thi khong sua
  MaHSBA     INT AUTO_INCREMENT PRIMARY KEY,
  MaLK       INT NOT NULL UNIQUE,
  Mach       SMALLINT,                           -- lan/phut
  HuyetAp    VARCHAR(10),                        -- VD 120/80
  NhietDo    DECIMAL(3,1),
  CanNang    DECIMAL(5,1),
  ChieuCao   DECIMAL(4,1),
  TrieuChung TEXT,
  KhamLamSang TEXT,
  MaICD      VARCHAR(10) NULL,
  ChanDoan   TEXT,
  LoiDan     TEXT,
  NgayTaiKham DATE NULL,
  TrangThai  ENUM('NHAP','HOAN_TAT') NOT NULL DEFAULT 'NHAP',   -- NHAP = luu tam (UC8.9)
  NgayTao    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  NgayHoanTat DATETIME NULL,
  FOREIGN KEY (MaLK)  REFERENCES LuotKham(MaLK),
  FOREIGN KEY (MaICD) REFERENCES BenhICD(MaICD),
  CHECK (TrangThai <> 'HOAN_TAT' OR (ChanDoan IS NOT NULL AND NgayHoanTat IS NOT NULL))
) ENGINE=InnoDB;

CREATE TABLE GhiChuHoSo (                        -- UC8.11 bo sung ghi chu sau khi hoan tat
  MaGC     INT AUTO_INCREMENT PRIMARY KEY,
  MaHSBA   INT NOT NULL,
  MaBS     INT NOT NULL,
  NoiDung  TEXT NOT NULL,
  ThoiGian DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaHSBA) REFERENCES HoSoBenhAn(MaHSBA),
  FOREIGN KEY (MaBS)   REFERENCES NhanVien(MaNV)
) ENGINE=InnoDB;

CREATE TABLE NhatKyTruyCapHoSo (                 -- UC2.8
  MaNK     BIGINT AUTO_INCREMENT PRIMARY KEY,
  MaTK     INT NOT NULL,
  MaHSBA   INT NOT NULL,
  ThaoTac  ENUM('XEM','TAO','CAP_NHAT','BO_SUNG_GHI_CHU','TAI_TEP','IN') NOT NULL,
  ThoiGian DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaTK)   REFERENCES TaiKhoan(MaTK),
  FOREIGN KEY (MaHSBA) REFERENCES HoSoBenhAn(MaHSBA),
  INDEX idx_nktc_tg (ThoiGian)
) ENGINE=InnoDB;

CREATE TABLE TomTatTienSu (                      -- UC13.7, UC8.15, BR19
  MaTT       INT AUTO_INCREMENT PRIMARY KEY,
  MaLK       INT NOT NULL UNIQUE,
  TrangThai  ENUM('DA_TAO','KHAM_LAN_DAU','CHUA_CO_TOM_TAT') NOT NULL,
  NoiDung    JSON NULL,                          -- cac muc co cau truc, moi muc kem ngay luot kham nguon
  ThoiDiemTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PhanHoiBS  ENUM('HUU_ICH','CHUA_CHINH_XAC') NULL,
  ThoiDiemPhanHoi DATETIME NULL,
  FOREIGN KEY (MaLK) REFERENCES LuotKham(MaLK)
) ENGINE=InnoDB;

CREATE TABLE DonThuoc (                          -- UC8.7
  MaDon  INT AUTO_INCREMENT PRIMARY KEY,
  MaHSBA INT NOT NULL UNIQUE,
  NgayKe DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaHSBA) REFERENCES HoSoBenhAn(MaHSBA)
) ENGINE=InnoDB;

CREATE TABLE ChiTietDonThuoc (
  MaDon      INT NOT NULL,
  MaThuoc    INT NOT NULL,
  SoLuong    INT NOT NULL,
  LieuDung   VARCHAR(100),                        -- VD: 1 vien/lan
  CachDung   VARCHAR(255),
  SoNgayDung SMALLINT,
  DonGia     DECIMAL(12,0) NOT NULL,              -- gia tai thoi diem ke
  GiaBHYT    DECIMAL(12,0) NULL,
  PRIMARY KEY (MaDon, MaThuoc),                   -- khong trung thuoc trong don
  FOREIGN KEY (MaDon)   REFERENCES DonThuoc(MaDon) ON DELETE CASCADE,
  FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc),
  CHECK (SoLuong > 0)
) ENGINE=InnoDB;

-- =====================================================
-- 6. THANH TOAN (goi 10) - bien lai tam thu tao truoc vi phieu chi dinh tham chieu
-- =====================================================
CREATE TABLE BienLaiTamThu (                     -- UC10.7
  MaBL        INT AUTO_INCREMENT PRIMARY KEY,
  MaSoBienLai VARCHAR(20) NOT NULL UNIQUE,       -- noi dung chuyen khoan VietQR (BR26)
  MaLK        INT NOT NULL,
  MaThuNgan   INT NOT NULL,
  TongTien    DECIMAL(12,0) NOT NULL,
  HinhThuc    ENUM('TIEN_MAT','CHUYEN_KHOAN') NOT NULL,
  TienKhachDua DECIMAL(12,0) NULL,
  TienThua    DECIMAL(12,0) AS (IF(HinhThuc = 'TIEN_MAT', TienKhachDua - TongTien, NULL)) STORED,
  ThoiDiemThu DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  TrangThai   ENUM('DA_THU','DA_HUY') NOT NULL DEFAULT 'DA_THU',
  FOREIGN KEY (MaLK)      REFERENCES LuotKham(MaLK),
  FOREIGN KEY (MaThuNgan) REFERENCES NhanVien(MaNV),
  CHECK (TongTien >= 0),
  CHECK (HinhThuc <> 'TIEN_MAT' OR TienKhachDua >= TongTien)
) ENGINE=InnoDB;

-- =====================================================
-- 7. CAN LAM SANG (goi 8, 14)
-- =====================================================
CREATE TABLE PhieuChiDinh (                      -- moi dich vu 1 phieu (UC8.5)
  MaPCD        INT AUTO_INCREMENT PRIMARY KEY,
  MaLK         INT NOT NULL,
  MaDV         INT NOT NULL,
  MaPhong      INT NOT NULL,
  MaBSChiDinh  INT NOT NULL,
  ChanDoanSoBo VARCHAR(500),
  YeuCau       VARCHAR(500),
  -- Chi phi tai thoi diem chi dinh (BR09)
  GiaDichVu    DECIMAL(12,0) NOT NULL,
  GiaBHYT      DECIMAL(12,0) NULL,
  BHYTChiTra   DECIMAL(12,0) NOT NULL DEFAULT 0,
  BenhNhanTra  DECIMAL(12,0) AS (GiaDichVu - BHYTChiTra) STORED,
  TrangThai    ENUM('CHO_THANH_TOAN','CHO_THUC_HIEN','DANG_THUC_HIEN','CO_KET_QUA','DA_HUY')
               NOT NULL DEFAULT 'CHO_THANH_TOAN',
  LyDoHuy      VARCHAR(255),
  MaBL         INT NULL,                          -- bien lai tam thu (NULL neu BHYT tra toan bo)
  ThoiDiemChiDinh  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ThoiDiemVaoHangCho DATETIME NULL,               -- sau thanh toan; hang cho CLS sap theo cot nay (UC14.1)
  ThuTuGoiY    TINYINT NULL,                      -- lo trinh goi y (UC13.6, BR18)
  ThoiGianChoDuKien SMALLINT NULL,                -- phut, hang cho phong CLS (UC13.4)
  DaThongBaoSapDenLuot BOOLEAN NOT NULL DEFAULT FALSE,  -- UC13.5 1a
  SoLanBoQua   TINYINT NOT NULL DEFAULT 0,
  MaBSThucHien INT NULL,
  ThoiDiemBatDau   DATETIME NULL,
  ThoiDiemCoKetQua DATETIME NULL,
  GhiChu       VARCHAR(255),                      -- VD: hoan noi soi vi chua nhin an
  FOREIGN KEY (MaLK)         REFERENCES LuotKham(MaLK),
  FOREIGN KEY (MaDV)         REFERENCES DichVu(MaDV),
  FOREIGN KEY (MaPhong)      REFERENCES Phong(MaPhong),
  FOREIGN KEY (MaBSChiDinh)  REFERENCES NhanVien(MaNV),
  FOREIGN KEY (MaBL)         REFERENCES BienLaiTamThu(MaBL),
  FOREIGN KEY (MaBSThucHien) REFERENCES NhanVien(MaNV),
  INDEX idx_pcd_hangcho (MaPhong, TrangThai, ThoiDiemVaoHangCho),
  CHECK (GiaDichVu >= 0),
  CHECK (BHYTChiTra BETWEEN 0 AND GiaDichVu),
  -- BR10: chi vao hang cho khi da tam thu hoac BHYT chi tra toan bo
  CHECK (TrangThai IN ('CHO_THANH_TOAN','DA_HUY') OR MaBL IS NOT NULL OR BHYTChiTra = GiaDichVu),
  CHECK (TrangThai <> 'DA_HUY' OR LyDoHuy IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE KetQuaCLS (                         -- UC14.4, UC14.5, UC14.9
  MaKQ         INT AUTO_INCREMENT PRIMARY KEY,
  MaPCD        INT NOT NULL UNIQUE,
  MaBSThucHien INT NOT NULL,
  MoTa         TEXT,                             -- mo ta (CDHA, noi soi)
  KetLuan      TEXT,
  NhanXet      TEXT,                             -- nhan xet xet nghiem
  -- Noi soi
  DaNhinAn     BOOLEAN NULL,
  DaKyDongY    BOOLEAN NULL,
  CoSinhThiet  BOOLEAN NULL,
  SoMauSinhThiet TINYINT NULL,
  ViTriSinhThiet VARCHAR(255),
  PhienBan     SMALLINT NOT NULL DEFAULT 1,      -- UC14.7 tang khi cap nhat
  ThoiGianTra  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  NgayCapNhat  DATETIME NULL,
  FOREIGN KEY (MaPCD)        REFERENCES PhieuChiDinh(MaPCD),
  FOREIGN KEY (MaBSThucHien) REFERENCES NhanVien(MaNV),
  CHECK (CoSinhThiet IS NOT TRUE OR SoMauSinhThiet > 0)
) ENGINE=InnoDB;

CREATE TABLE KetQuaChiSo (                       -- gia tri tung chi so xet nghiem
  MaKQ    INT NOT NULL,
  MaChiSo INT NOT NULL,
  GiaTri  DECIMAL(10,3) NOT NULL,
  DanhGia ENUM('BINH_THUONG','CAO','THAP') NOT NULL,   -- so voi khoang tham chieu
  PRIMARY KEY (MaKQ, MaChiSo),
  FOREIGN KEY (MaKQ)    REFERENCES KetQuaCLS(MaKQ) ON DELETE CASCADE,
  FOREIGN KEY (MaChiSo) REFERENCES MauChiSo(MaChiSo)
) ENGINE=InnoDB;

CREATE TABLE LichSuKetQua (                      -- UC14.7 giu phien ban cu
  MaLS       INT AUTO_INCREMENT PRIMARY KEY,
  MaKQ       INT NOT NULL,
  PhienBan   SMALLINT NOT NULL,
  NoiDungCu  JSON NOT NULL,
  LyDoDieuChinh VARCHAR(255) NOT NULL,
  MaNguoiSua INT NOT NULL,
  ThoiGian   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaKQ)       REFERENCES KetQuaCLS(MaKQ),
  FOREIGN KEY (MaNguoiSua) REFERENCES NhanVien(MaNV),
  UNIQUE (MaKQ, PhienBan)
) ENGINE=InnoDB;

-- =====================================================
-- 8. HOA DON (goi 10)
-- =====================================================
CREATE TABLE HoaDon (                            -- UC10.1-10.5, BR09, BR26, BR27
  MaHD         INT AUTO_INCREMENT PRIMARY KEY,
  MaSoHoaDon   VARCHAR(20) NOT NULL UNIQUE,
  MaLK         INT NOT NULL,
  NgayLap      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  TongTien     DECIMAL(12,0) NOT NULL DEFAULT 0,  -- tong gia dich vu
  BHYTChiTra   DECIMAL(12,0) NOT NULL DEFAULT 0,
  BenhNhanTra  DECIMAL(12,0) AS (TongTien - BHYTChiTra) STORED,
  DaTamThu     DECIMAL(12,0) NOT NULL DEFAULT 0,  -- tien CLS da tam thu
  ConPhaiThu   DECIMAL(12,0) AS (TongTien - BHYTChiTra - DaTamThu) STORED,
  ChoHoanBHYT  BOOLEAN NOT NULL DEFAULT FALSE,    -- BR27: the cho xac minh, tinh theo gia dich vu
  SoTienHoanBHYT DECIMAL(12,0) NULL,              -- BR27: phan BHYT hoan lai sau khi the duoc xac minh
  NgayHoanBHYT DATETIME NULL,
  TrangThai    ENUM('CHUA_THANH_TOAN','DA_THANH_TOAN','DA_HUY') NOT NULL DEFAULT 'CHUA_THANH_TOAN',
  MaThuNgan    INT NULL,
  HinhThuc     ENUM('TIEN_MAT','CHUYEN_KHOAN') NULL,
  TienKhachDua DECIMAL(12,0) NULL,
  NgayThanhToan DATETIME NULL,
  LyDoHuy      VARCHAR(255),
  MaNguoiHuy   INT NULL,
  MaHDGoc      INT NULL,                          -- hoa don thay the cho hoa don bi huy
  -- 1 luot kham chi co 1 hoa don con hieu luc; hoa don huy duoc giu de doi soat
  LKHieuLuc    INT AS (IF(TrangThai = 'DA_HUY', NULL, MaLK)) STORED,
  FOREIGN KEY (MaLK)       REFERENCES LuotKham(MaLK),
  FOREIGN KEY (MaThuNgan)  REFERENCES NhanVien(MaNV),
  FOREIGN KEY (MaNguoiHuy) REFERENCES NhanVien(MaNV),
  FOREIGN KEY (MaHDGoc)    REFERENCES HoaDon(MaHD),
  UNIQUE (LKHieuLuc),
  INDEX idx_hd_tt (TrangThai, NgayThanhToan),
  CHECK (TongTien >= 0),
  CHECK (BHYTChiTra BETWEEN 0 AND TongTien),
  CHECK (TrangThai <> 'DA_THANH_TOAN' OR (HinhThuc IS NOT NULL AND NgayThanhToan IS NOT NULL AND MaThuNgan IS NOT NULL)),
  CHECK (TrangThai <> 'DA_HUY' OR LyDoHuy IS NOT NULL),
  CHECK (SoTienHoanBHYT IS NULL OR (ChoHoanBHYT AND SoTienHoanBHYT BETWEEN 0 AND TongTien AND NgayHoanBHYT IS NOT NULL))
) ENGINE=InnoDB;

CREATE TABLE ChiTietHoaDon (
  MaCTHD     INT AUTO_INCREMENT PRIMARY KEY,
  MaHD       INT NOT NULL,
  LoaiMuc    ENUM('KHAM','CLS','THUOC') NOT NULL,
  NoiDung    VARCHAR(255) NOT NULL,
  SoLuong    INT NOT NULL DEFAULT 1,
  GiaDichVu  DECIMAL(12,0) NOT NULL,
  GiaBHYT    DECIMAL(12,0) NULL,
  ThanhTien  DECIMAL(12,0) AS (SoLuong * GiaDichVu) STORED,
  BHYTChiTra DECIMAL(12,0) NOT NULL DEFAULT 0,
  BenhNhanTra DECIMAL(12,0) AS (SoLuong * GiaDichVu - BHYTChiTra) STORED,
  DaTamThu   BOOLEAN NOT NULL DEFAULT FALSE,
  MaPCD      INT NULL,
  MaThuoc    INT NULL,
  FOREIGN KEY (MaHD)    REFERENCES HoaDon(MaHD) ON DELETE CASCADE,
  FOREIGN KEY (MaPCD)   REFERENCES PhieuChiDinh(MaPCD),
  FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc),
  CHECK (SoLuong > 0),
  CHECK (GiaDichVu >= 0),
  CHECK (BHYTChiTra BETWEEN 0 AND SoLuong * GiaDichVu),
  CHECK ((LoaiMuc = 'CLS') = (MaPCD IS NOT NULL)),
  CHECK ((LoaiMuc = 'THUOC') = (MaThuoc IS NOT NULL))
) ENGINE=InnoDB;

-- =====================================================
-- 9. DANH SACH CHO (UC6.8-6.10, UC13.9, BR21)
-- =====================================================
CREATE TABLE DangKyCho (
  MaDKC      INT AUTO_INCREMENT PRIMARY KEY,
  MaBN       INT NOT NULL,
  MaCK       INT NOT NULL,
  MaBS       INT NULL,                           -- NULL = bac si bat ky trong chuyen khoa
  NgayMongMuon DATE NOT NULL,
  Buoi       ENUM('SANG','CHIEU','CA_NGAY') NOT NULL,
  LyDoKham   VARCHAR(500),
  ThoiDiemDangKy  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ThoiDiemXepHang DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- bi chuyen xuong cuoi -> cap nhat
  TrangThai  ENUM('DANG_CHO','DANG_DUOC_MOI','DA_NHAN_CHO','HET_HAN','DA_HUY') NOT NULL DEFAULT 'DANG_CHO',
  MaKGDuocMoi INT NULL,
  HanGiuCho  DATETIME NULL,                      -- 15 phut
  MaLK       INT NULL UNIQUE,                    -- luot kham tao ra khi nhan cho
  FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
  FOREIGN KEY (MaCK) REFERENCES ChuyenKhoa(MaCK),
  FOREIGN KEY (MaBS) REFERENCES NhanVien(MaNV),
  FOREIGN KEY (MaKGDuocMoi) REFERENCES KhungGio(MaKG),
  FOREIGN KEY (MaLK) REFERENCES LuotKham(MaLK),
  INDEX idx_dkc_xep (TrangThai, NgayMongMuon, ThoiDiemXepHang),
  CHECK (TrangThai <> 'DANG_DUOC_MOI' OR (MaKGDuocMoi IS NOT NULL AND HanGiuCho IS NOT NULL))
) ENGINE=InnoDB;

-- =====================================================
-- 10. THONG BAO (UC13.1)
-- =====================================================
CREATE TABLE ThongBao (
  MaTB       BIGINT AUTO_INCREMENT PRIMARY KEY,
  MaTKNhan   INT NULL,                           -- nguoi nhan co tai khoan (benh nhan / nhan vien)
  MaBN       INT NULL,                           -- benh nhan chua co tai khoan (BR23)
  LoaiSuKien ENUM('LICH_HEN','NHAC_LICH','SAP_DEN_LUOT','LO_TRINH_CLS','CHI_DINH_CLS','KET_QUA_CLS',
                  'HOAN_TAT_KHAM','HOA_DON','DANH_SACH_CHO','LICH_LAM_VIEC','MOI_DANH_GIA',
                  'GOP_Y','CANH_BAO','TAI_KHOAN','KHAC') NOT NULL,
  TieuDe     VARCHAR(200) NOT NULL,
  NoiDung    TEXT NOT NULL,
  LoaiDoiTuong VARCHAR(30),                      -- dieu huong khi bam (UC1.8): LUOT_KHAM, HOA_DON...
  MaDoiTuong INT NULL,
  DaDoc      BOOLEAN NOT NULL DEFAULT FALSE,
  ThoiGianTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaTKNhan) REFERENCES TaiKhoan(MaTK),
  FOREIGN KEY (MaBN)     REFERENCES BenhNhan(MaBN),
  INDEX idx_tb_tk (MaTKNhan, DaDoc),
  INDEX idx_tb_moi (MaTKNhan, MaTB),
  INDEX idx_tb_bn (MaBN),
  CHECK (MaTKNhan IS NOT NULL OR MaBN IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE GuiThongBao (                       -- gui qua Firebase / SMTP / nen tang nhan tin, thu lai toi da 3 lan
  MaGui     BIGINT AUTO_INCREMENT PRIMARY KEY,
  MaTB      BIGINT NOT NULL,
  Kenh      ENUM('PUSH','EMAIL','TIN_NHAN') NOT NULL,
  TrangThai ENUM('CHO_GUI','DA_GUI','THAT_BAI') NOT NULL DEFAULT 'CHO_GUI',
  SoLanThu  TINYINT NOT NULL DEFAULT 0,
  LoiCuoi   VARCHAR(500),
  ThoiDiemGui DATETIME NULL,
  FOREIGN KEY (MaTB) REFERENCES ThongBao(MaTB) ON DELETE CASCADE,
  CHECK (SoLanThu BETWEEN 0 AND 3)
) ENGINE=InnoDB;

-- =====================================================
-- 11. DANH GIA, GOP Y (goi 9, 11; BR24, BR25)
-- =====================================================
CREATE TABLE DanhGia (                           -- UC9.5 + UC9.9 tren cung bieu mau
  MaDG        INT AUTO_INCREMENT PRIMARY KEY,
  MaLK        INT NOT NULL UNIQUE,               -- moi luot kham danh gia 1 lan
  MaBN        INT NOT NULL,
  MaBS        INT NOT NULL,
  DiemBacSi   TINYINT NULL,
  NhanXetBacSi TEXT,
  -- 6 tieu chi dich vu (BR24), NULL = bo qua tieu chi
  DiemThoiGianCho   TINYINT NULL,
  DiemThuTucTiepDon TINYINT NULL,
  DiemThaiDoNhanVien TINYINT NULL,
  DiemCoSoVatChat   TINYINT NULL,
  DiemDichVuCLS     TINYINT NULL,
  DiemChiPhi        TINYINT NULL,
  NhanXetDichVu TEXT,
  ThoiGian    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Phan tich AI (UC13.8)
  TrangThaiPhanTich ENUM('CHUA_PHAN_TICH','DA_PHAN_TICH') NOT NULL DEFAULT 'CHUA_PHAN_TICH',
  CamXuc      ENUM('TICH_CUC','TRUNG_TINH','TIEU_CUC') NULL,
  ChuDe       JSON NULL,                          -- VD ["THOI_GIAN_CHO","THAI_DO"]
  MucDoNghiemTrong ENUM('THAP','TRUNG_BINH','CAO') NULL,
  FOREIGN KEY (MaLK) REFERENCES LuotKham(MaLK),
  FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
  FOREIGN KEY (MaBS) REFERENCES NhanVien(MaNV),
  CHECK (DiemBacSi BETWEEN 1 AND 5),
  CHECK (DiemThoiGianCho BETWEEN 1 AND 5),
  CHECK (DiemThuTucTiepDon BETWEEN 1 AND 5),
  CHECK (DiemThaiDoNhanVien BETWEEN 1 AND 5),
  CHECK (DiemCoSoVatChat BETWEEN 1 AND 5),
  CHECK (DiemDichVuCLS BETWEEN 1 AND 5),
  CHECK (DiemChiPhi BETWEEN 1 AND 5),
  CHECK (COALESCE(DiemBacSi, DiemThoiGianCho, DiemThuTucTiepDon, DiemThaiDoNhanVien,
                  DiemCoSoVatChat, DiemDichVuCLS, DiemChiPhi) IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE PhieuGopY (                         -- UC9.10, UC9.11, UC11.8
  MaPhieu    INT AUTO_INCREMENT PRIMARY KEY,
  MaSoPhieu  VARCHAR(20) NOT NULL UNIQUE,
  MaBN       INT NOT NULL,
  Loai       ENUM('GOP_Y','KHIEU_NAI') NOT NULL,
  ChuDe      VARCHAR(100) NOT NULL,
  MaLK       INT NULL,
  NoiDung    TEXT NOT NULL,
  TrangThai  ENUM('MOI','DANG_XU_LY','DA_PHAN_HOI','DA_DONG') NOT NULL DEFAULT 'MOI',
  ThoiDiemGui DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  HanPhanHoi DATETIME NOT NULL,                   -- BR25: 48 gio
  ThoiDiemPhanHoi DATETIME NULL,
  ThoiDiemDong DATETIME NULL,
  TrangThaiPhanTich ENUM('CHUA_PHAN_TICH','DA_PHAN_TICH') NOT NULL DEFAULT 'CHUA_PHAN_TICH',
  CamXuc     ENUM('TICH_CUC','TRUNG_TINH','TIEU_CUC') NULL,
  MucDoNghiemTrong ENUM('THAP','TRUNG_BINH','CAO') NULL,
  FOREIGN KEY (MaBN) REFERENCES BenhNhan(MaBN),
  FOREIGN KEY (MaLK) REFERENCES LuotKham(MaLK),
  INDEX idx_gy_tt (TrangThai, HanPhanHoi)
) ENGINE=InnoDB;

CREATE TABLE TraoDoiGopY (
  MaTD     INT AUTO_INCREMENT PRIMARY KEY,
  MaPhieu  INT NOT NULL,
  MaTK     INT NOT NULL,
  Loai     ENUM('PHAN_HOI','BO_SUNG','GHI_CHU_NOI_BO') NOT NULL,  -- ghi chu noi bo khong hien cho benh nhan
  NoiDung  TEXT NOT NULL,
  ThoiGian DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaPhieu) REFERENCES PhieuGopY(MaPhieu) ON DELETE CASCADE,
  FOREIGN KEY (MaTK)    REFERENCES TaiKhoan(MaTK)
) ENGINE=InnoDB;

-- ---------- Tep dinh kem dung chung (UC8.6, UC14.4/14.5/14.9, UC9.9, UC9.10) ----------
CREATE TABLE TepDinhKem (
  MaTep      INT AUTO_INCREMENT PRIMARY KEY,
  DuongDan   VARCHAR(500) NOT NULL,
  TenTep     VARCHAR(255) NOT NULL,
  LoaiTep    ENUM('JPG','PNG','PDF') NOT NULL,
  KichThuoc  INT NOT NULL,                        -- byte
  MoTa       VARCHAR(255),                        -- VD vi tri quan sat khi noi soi
  MaHSBA     INT NULL,
  MaKQ       INT NULL,
  MaDG       INT NULL,
  MaPhieu    INT NULL,
  MaNguoiTaiLen INT NOT NULL,
  ThoiGian   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaHSBA)  REFERENCES HoSoBenhAn(MaHSBA),
  FOREIGN KEY (MaKQ)    REFERENCES KetQuaCLS(MaKQ),
  FOREIGN KEY (MaDG)    REFERENCES DanhGia(MaDG),
  FOREIGN KEY (MaPhieu) REFERENCES PhieuGopY(MaPhieu),
  FOREIGN KEY (MaNguoiTaiLen) REFERENCES TaiKhoan(MaTK),
  CHECK ((MaHSBA IS NOT NULL) + (MaKQ IS NOT NULL) + (MaDG IS NOT NULL) + (MaPhieu IS NOT NULL) = 1),
  CHECK (KichThuoc BETWEEN 1 AND 20971520)        -- toi da 20 MB
) ENGINE=InnoDB;

-- =====================================================
-- 12. TRO LY AI, NHAN TIN (goi 12, UC13.11)
-- =====================================================
CREATE TABLE HoiThoai (
  MaHT       INT AUTO_INCREMENT PRIMARY KEY,
  LoaiHoiThoai ENUM('CHATBOT','TU_VAN_SAU_KHAM','NHAN_TIN') NOT NULL,
  MaTK       INT NULL,                            -- NULL: khach chua dang nhap
  MaLK       INT NULL,                            -- hoi thoai tu van sau kham gan voi luot kham
  KenhNhanTin ENUM('MESSENGER','ZALO') NULL,
  MaNguoiDungNenTang VARCHAR(100) NULL,           -- PSID / Zalo user id
  TenHienThi VARCHAR(100),
  ThoiDiemBatDau DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CapNhatCuoi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK),
  FOREIGN KEY (MaLK) REFERENCES LuotKham(MaLK),
  UNIQUE (KenhNhanTin, MaNguoiDungNenTang),
  CHECK (LoaiHoiThoai <> 'TU_VAN_SAU_KHAM' OR MaLK IS NOT NULL),
  CHECK (LoaiHoiThoai <> 'NHAN_TIN' OR KenhNhanTin IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE TinNhan (
  MaTN     BIGINT AUTO_INCREMENT PRIMARY KEY,
  MaHT     INT NOT NULL,
  NguoiGui ENUM('NGUOI_DUNG','TRO_LY','LE_TAN','HE_THONG') NOT NULL,
  NoiDung  TEXT NOT NULL,
  ThoiGian DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaHT) REFERENCES HoiThoai(MaHT) ON DELETE CASCADE,
  INDEX idx_tn_ht (MaHT, ThoiGian)
) ENGINE=InnoDB;

CREATE TABLE YeuCauDatLich (                     -- UC13.11 -> UC7.14 hop thu dat lich
  MaYC       INT AUTO_INCREMENT PRIMARY KEY,
  MaHT       INT NOT NULL,
  HoTen      VARCHAR(100),
  SDT        VARCHAR(15),
  MaCK       INT NULL,
  TrieuChung VARCHAR(500),
  NgayMongMuon DATE NULL,
  TrangThai  ENUM('CHO_XU_LY','DA_XU_LY') NOT NULL DEFAULT 'CHO_XU_LY',
  MaLK       INT NULL UNIQUE,
  MaLeTanXuLy INT NULL,
  ThoiDiemTao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ThoiDiemXuLy DATETIME NULL,
  FOREIGN KEY (MaHT) REFERENCES HoiThoai(MaHT),
  FOREIGN KEY (MaCK) REFERENCES ChuyenKhoa(MaCK),
  FOREIGN KEY (MaLK) REFERENCES LuotKham(MaLK),
  FOREIGN KEY (MaLeTanXuLy) REFERENCES NhanVien(MaNV)
) ENGINE=InnoDB;

-- =====================================================
-- VIEW
-- =====================================================
-- Lich trong (UC5.6, BR02: trong 30 ngay toi va truoc gio kham it nhat 2 gio)
CREATE VIEW v_LichTrong AS
SELECT kg.MaKG, kg.NgayKham, kg.GioBatDau, kg.GioKetThuc, ca.CaLam,
       bs.MaNV AS MaBS, bs.HoTen AS BacSi, ck.MaCK, ck.TenCK, p.MaSoPhong, p.TenPhong
FROM KhungGio kg
JOIN CaLamViec  ca ON ca.MaCa   = kg.MaCa
JOIN NhanVien   bs ON bs.MaNV   = ca.MaBS
JOIN ChuyenKhoa ck ON ck.MaCK   = bs.MaCK
JOIN Phong      p  ON p.MaPhong = ca.MaPhong
WHERE kg.TrangThai = 'TRONG' AND bs.TrangThai = 'HOAT_DONG'
  AND TIMESTAMP(kg.NgayKham, kg.GioBatDau) >= NOW() + INTERVAL 2 HOUR
  AND kg.NgayKham <= CURDATE() + INTERVAL 30 DAY;

-- Hang cho kham hom nay cua tung bac si (UC8.1, UC7.12)
CREATE VIEW v_HangDoiKham AS
SELECT lk.MaLK, lk.MaLichHen, lk.MaBS, bs.HoTen AS BacSi, p.MaSoPhong, lk.SoThuTu, lk.ThuTuHangCho,
       lk.TrangThai, lk.ThoiDiemCheckIn, lk.ThoiGianChoDuKien, lk.GioDuKienVaoKham,
       bn.MaBN, bn.HoTen, bn.NgaySinh, bn.GioiTinh, lk.TrangThaiBHYT
FROM LuotKham lk
JOIN BenhNhan  bn ON bn.MaBN = lk.MaBN
JOIN NhanVien  bs ON bs.MaNV = lk.MaBS
JOIN KhungGio  kg ON kg.MaKG = lk.MaKG
JOIN CaLamViec ca ON ca.MaCa = kg.MaCa
JOIN Phong     p  ON p.MaPhong = ca.MaPhong
WHERE lk.NgayKham = CURDATE()
  AND lk.TrangThai IN ('DA_CHECK_IN','DANG_KHAM','CHO_CLS','DA_CO_KET_QUA');

-- Hang cho cac phong can lam sang (UC14.1, BR11)
CREATE VIEW v_HangDoiCLS AS
SELECT pcd.MaPCD, pcd.MaPhong, p.MaSoPhong, p.TenPhong, dv.TenDV, pcd.TrangThai,
       pcd.ThoiDiemVaoHangCho, pcd.ThuTuGoiY, bn.HoTen, bn.NgaySinh, bn.GioiTinh,
       bs.HoTen AS BacSiChiDinh, pcd.ChanDoanSoBo, pcd.YeuCau
FROM PhieuChiDinh pcd
JOIN LuotKham lk ON lk.MaLK = pcd.MaLK
JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
JOIN DichVu   dv ON dv.MaDV = pcd.MaDV
JOIN Phong    p  ON p.MaPhong = pcd.MaPhong
JOIN NhanVien bs ON bs.MaNV = pcd.MaBSChiDinh
WHERE pcd.TrangThai IN ('CHO_THUC_HIEN','DANG_THUC_HIEN');

-- Doanh thu theo ngay (UC11.3): hoa don da thanh toan
CREATE VIEW v_DoanhThuNgay AS
SELECT DATE(NgayThanhToan) AS Ngay, COUNT(*) AS SoHoaDon,
       SUM(TongTien) AS TongTien, SUM(BHYTChiTra) AS BHYTChiTra,
       SUM(BenhNhanTra) AS BenhNhanTra, SUM(DaTamThu) AS DaTamThu, SUM(ConPhaiThu) AS ThuCuoiLuot
FROM HoaDon
WHERE TrangThai = 'DA_THANH_TOAN'
GROUP BY DATE(NgayThanhToan);

-- Ti le huy va vang mat theo ngay, kenh dat (UC11.4)
CREATE VIEW v_TiLeHuyVangMat AS
SELECT NgayKham, KenhDat, COUNT(*) AS TongLich,
       SUM(TrangThai = 'DA_HUY')   AS SoHuy,
       SUM(TrangThai = 'VANG_MAT') AS SoVangMat
FROM LuotKham
GROUP BY NgayKham, KenhDat;

-- Hieu suat bac si theo thang (UC11.5)
CREATE VIEW v_HieuSuatBacSi AS
SELECT DATE_FORMAT(lk.NgayKham, '%Y-%m') AS Thang, bs.MaNV AS MaBS, bs.HoTen AS BacSi, ck.TenCK,
       COUNT(*)                          AS TongLich,
       SUM(lk.TrangThai = 'HOAN_THANH')  AS SoLuotHoanThanh,
       SUM(lk.TrangThai = 'VANG_MAT')    AS SoVangMat,
       SUM(lk.TrangThai = 'DA_HUY')      AS SoHuy,
       ROUND(AVG(CASE WHEN lk.TrangThai = 'HOAN_THANH'
                      THEN TIMESTAMPDIFF(MINUTE, lk.ThoiDiemBatDauKham, lk.ThoiDiemKetThucKham) END), 1) AS PhutKhamTB,
       ROUND(AVG(dg.DiemBacSi), 2)       AS DiemDanhGiaTB,
       COUNT(dg.MaDG)                    AS SoDanhGia,
       COALESCE(SUM(hd.TongTien), 0)     AS DoanhThu
FROM LuotKham lk
JOIN NhanVien   bs ON bs.MaNV = lk.MaBS
JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
LEFT JOIN DanhGia dg ON dg.MaLK = lk.MaLK
LEFT JOIN HoaDon  hd ON hd.MaLK = lk.MaLK AND hd.TrangThai = 'DA_THANH_TOAN'
GROUP BY Thang, bs.MaNV, bs.HoTen, ck.TenCK;

-- Thong ke luot kham theo ngay, chuyen khoa, bac si, kenh dat (UC11.2)
CREATE VIEW v_ThongKeLuotKham AS
SELECT lk.NgayKham, ck.MaCK, ck.TenCK, lk.MaBS, bs.HoTen AS BacSi, lk.KenhDat,
       COUNT(*) AS TongLich,
       SUM(lk.TrangThai = 'HOAN_THANH') AS HoanThanh,
       SUM(lk.TrangThai IN ('DA_CHECK_IN','DANG_KHAM','CHO_CLS','DA_CO_KET_QUA')) AS DangXuLy,
       SUM(lk.TrangThai = 'DA_HUY')     AS DaHuy,
       SUM(lk.TrangThai = 'VANG_MAT')   AS VangMat,
       SUM(lk.TrangThaiBHYT = 'HOP_LE') AS CoBHYT
FROM LuotKham lk
JOIN NhanVien bs   ON bs.MaNV = lk.MaBS
JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
GROUP BY lk.NgayKham, ck.MaCK, ck.TenCK, lk.MaBS, bs.HoTen, lk.KenhDat;

-- Diem danh gia trung binh theo tieu chi va ti le cam xuc theo thang (UC11.7)
CREATE VIEW v_DanhGiaTheoThang AS
SELECT DATE_FORMAT(ThoiGian, '%Y-%m') AS Thang, COUNT(*) AS SoDanhGia,
       ROUND(AVG(DiemBacSi), 2)          AS BacSi,
       ROUND(AVG(DiemThoiGianCho), 2)    AS ThoiGianCho,
       ROUND(AVG(DiemThuTucTiepDon), 2)  AS ThuTucTiepDon,
       ROUND(AVG(DiemThaiDoNhanVien), 2) AS ThaiDoNhanVien,
       ROUND(AVG(DiemCoSoVatChat), 2)    AS CoSoVatChat,
       ROUND(AVG(DiemDichVuCLS), 2)      AS DichVuCLS,
       ROUND(AVG(DiemChiPhi), 2)         AS ChiPhi,
       SUM(CamXuc = 'TICH_CUC')   AS TichCuc,
       SUM(CamXuc = 'TRUNG_TINH') AS TrungTinh,
       SUM(CamXuc = 'TIEU_CUC')   AS TieuCuc
FROM DanhGia
GROUP BY Thang;

-- Phieu gop y qua han phan hoi 48 gio (BR25, UC11.8)
CREATE VIEW v_GopYQuaHan AS
SELECT g.MaPhieu, g.MaSoPhieu, g.Loai, g.ChuDe, g.TrangThai, g.ThoiDiemGui, g.HanPhanHoi,
       TIMESTAMPDIFF(HOUR, g.HanPhanHoi, NOW()) AS SoGioQuaHan, bn.HoTen, g.MucDoNghiemTrong
FROM PhieuGopY g JOIN BenhNhan bn ON bn.MaBN = g.MaBN
WHERE g.TrangThai IN ('MOI','DANG_XU_LY') AND g.HanPhanHoi < NOW();

-- Danh sach cho thanh toan tai quay (UC10.1, UC10.7)
CREATE VIEW v_ChoThanhToan AS
SELECT 'TAM_THU_CLS' AS LoaiThu, lk.MaLK, lk.MaLichHen, bn.HoTen, bn.SDT,
       SUM(p.BenhNhanTra) AS SoTienPhaiThu, MIN(p.ThoiDiemChiDinh) AS ThoiDiem
FROM PhieuChiDinh p JOIN LuotKham lk ON lk.MaLK = p.MaLK JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
WHERE p.TrangThai = 'CHO_THANH_TOAN'
GROUP BY lk.MaLK, lk.MaLichHen, bn.HoTen, bn.SDT
UNION ALL
SELECT 'HOA_DON', lk.MaLK, lk.MaLichHen, bn.HoTen, bn.SDT, GREATEST(hd.ConPhaiThu, 0), hd.NgayLap
FROM HoaDon hd JOIN LuotKham lk ON lk.MaLK = hd.MaLK JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
WHERE hd.TrangThai = 'CHUA_THANH_TOAN';

-- Chi so xet nghiem qua cac lan kham, chi lay luot da hoan tat (UC9.8, BR12)
CREATE VIEW v_ChiSoXetNghiem AS
SELECT lk.MaBN, lk.MaLK, lk.NgayKham, ms.MaChiSo, ms.TenChiSo, kq.GiaTri, ms.DonVi,
       ms.GioiHanDuoi, ms.GioiHanTren, kq.DanhGia
FROM KetQuaChiSo kq
JOIN MauChiSo     ms ON ms.MaChiSo = kq.MaChiSo
JOIN KetQuaCLS    k  ON k.MaKQ = kq.MaKQ
JOIN PhieuChiDinh p  ON p.MaPCD = k.MaPCD
JOIN LuotKham     lk ON lk.MaLK = p.MaLK
WHERE lk.TrangThai = 'HOAN_THANH';

-- =====================================================
-- CHU THICH BANG (hien trong Workbench / so do ER)
-- =====================================================
ALTER TABLE VaiTro            COMMENT = 'Vai trò người dùng (UC2.6, UC2.7)';
ALTER TABLE Quyen             COMMENT = 'Danh mục quyền theo chức năng';
ALTER TABLE VaiTroQuyen       COMMENT = 'Bảng quyền của từng vai trò (UC2.7)';
ALTER TABLE VaiTroNhomChucNang COMMENT = 'Nhóm chức năng mỗi vai trò được phép có quyền (UC2.7)';
ALTER TABLE TaiKhoanBoQuyen   COMMENT = 'Quyền bị bớt riêng cho từng tài khoản trong phạm vi vai trò (UC2.7)';
ALTER TABLE TaiKhoan          COMMENT = 'Tài khoản đăng nhập bằng email/SĐT; khóa 15 phút khi sai 5 lần (BR15)';
ALTER TABLE MaOTP             COMMENT = 'Mã OTP xác thực email, khôi phục mật khẩu; hết hạn sau 5 phút';
ALTER TABLE PhienDangNhap     COMMENT = 'Phiên đăng nhập (refresh token) để thu hồi khi đổi mật khẩu/khóa tài khoản';
ALTER TABLE NhatKyThaoTac     COMMENT = 'Nhật ký thao tác quản trị: gán vai trò, hủy hóa đơn...';
ALTER TABLE ThongTinPhongKham COMMENT = 'Thông tin phòng khám, tài khoản nhận VietQR (UC3.6) - 1 dòng';
ALTER TABLE ChuyenKhoa        COMMENT = 'Danh mục chuyên khoa (UC3.1)';
ALTER TABLE Tang              COMMENT = 'Tầng và ảnh mặt bằng (UC3.9)';
ALTER TABLE Phong             COMMENT = 'Phòng khám bệnh, xét nghiệm, X-quang, siêu âm, nội soi (UC3.5)';
ALTER TABLE DiemNut           COMMENT = 'Điểm nút đồ thị đường đi trên sơ đồ mặt bằng (BR22)';
ALTER TABLE DoanDuong         COMMENT = 'Đoạn đường nối 2 điểm nút; trọng số theo BR22 (Dijkstra)';
ALTER TABLE DichVu            COMMENT = 'Dịch vụ khám và cận lâm sàng, giá dịch vụ, giá BHYT (UC3.3, BR09, BR18)';
ALTER TABLE RangBuocDichVu    COMMENT = 'Dịch vụ phải thực hiện trước dịch vụ khác (BR18)';
ALTER TABLE MauChiSo          COMMENT = 'Mẫu chỉ số xét nghiệm và khoảng tham chiếu (UC3.7)';
ALTER TABLE Thuoc             COMMENT = 'Danh mục thuốc, giá BHYT (UC3.4)';
ALTER TABLE BenhICD           COMMENT = 'Danh mục mã bệnh ICD-10 (UC3.8)';
ALTER TABLE CauHoiThuongGap   COMMENT = 'Dữ liệu tri thức chatbot (UC12.6)';
ALTER TABLE NhanVien          COMMENT = 'Lễ tân, bác sĩ, bác sĩ cận lâm sàng, quản trị viên';
ALTER TABLE BenhNhan          COMMENT = 'Hồ sơ hành chính bệnh nhân; có thể chưa có tài khoản (BR23)';
ALTER TABLE TheBHYT           COMMENT = 'Thẻ BHYT, đối chiếu họ tên/ngày sinh theo BR08';
ALTER TABLE DangKyCa          COMMENT = 'Bác sĩ đăng ký ca làm việc chờ duyệt (UC4.2, UC4.4)';
ALTER TABLE CaLamViec         COMMENT = 'Ca làm việc của bác sĩ tại phòng (UC4.1)';
ALTER TABLE KhungGio          COMMENT = 'Khung giờ khám sinh từ ca làm việc (UC4.3, BR01)';
ALTER TABLE LuotKham          COMMENT = 'Lịch hẹn/lượt khám: từ đặt lịch đến hoàn thành, hủy, vắng mặt';
ALTER TABLE HoSoBenhAn        COMMENT = 'Hồ sơ bệnh án của lượt khám: sinh hiệu, chẩn đoán ICD-10 (UC8.3, BR06)';
ALTER TABLE GhiChuHoSo        COMMENT = 'Ghi chú bổ sung sau khi hồ sơ hoàn tất (UC8.11)';
ALTER TABLE NhatKyTruyCapHoSo COMMENT = 'Nhật ký truy cập hồ sơ bệnh án (UC2.8)';
ALTER TABLE TomTatTienSu      COMMENT = 'Tóm tắt tiền sử do AI tạo khi check-in (UC13.7, BR19)';
ALTER TABLE DonThuoc          COMMENT = 'Đơn thuốc của hồ sơ bệnh án (UC8.7)';
ALTER TABLE ChiTietDonThuoc   COMMENT = 'Thuốc trong đơn: số lượng, liều dùng, giá tại thời điểm kê';
ALTER TABLE BienLaiTamThu     COMMENT = 'Biên lai tạm thu chi phí cận lâm sàng (UC10.7)';
ALTER TABLE PhieuChiDinh      COMMENT = 'Phiếu chỉ định cận lâm sàng, mỗi dịch vụ 1 phiếu (UC8.5, BR09, BR10, BR18)';
ALTER TABLE KetQuaCLS         COMMENT = 'Kết quả xét nghiệm, chẩn đoán hình ảnh, nội soi (UC14.4, 14.5, 14.9)';
ALTER TABLE KetQuaChiSo       COMMENT = 'Giá trị từng chỉ số xét nghiệm, đánh dấu cao/thấp';
ALTER TABLE LichSuKetQua      COMMENT = 'Phiên bản cũ khi cập nhật kết quả (UC14.7)';
ALTER TABLE HoaDon            COMMENT = 'Hóa đơn cuối lượt khám, trừ BHYT và tạm thu (BR09, BR26, BR27)';
ALTER TABLE ChiTietHoaDon     COMMENT = 'Các khoản khám, CLS, thuốc của hóa đơn';
ALTER TABLE DangKyCho         COMMENT = 'Danh sách chờ khi hết khung giờ (UC6.8, BR21)';
ALTER TABLE ThongBao          COMMENT = 'Thông báo trong hệ thống (UC1.8, UC13.1)';
ALTER TABLE GuiThongBao       COMMENT = 'Trạng thái gửi push/email/tin nhắn, thử lại tối đa 3 lần';
ALTER TABLE DanhGia           COMMENT = 'Đánh giá bác sĩ và 6 tiêu chí dịch vụ, kết quả phân tích AI (UC9.9, BR24)';
ALTER TABLE PhieuGopY         COMMENT = 'Góp ý, khiếu nại; phản hồi trong 48 giờ (UC9.10, BR25)';
ALTER TABLE TraoDoiGopY       COMMENT = 'Phản hồi, bổ sung, ghi chú nội bộ của phiếu góp ý';
ALTER TABLE TepDinhKem        COMMENT = 'Tệp JPG/PNG/PDF gắn với hồ sơ, kết quả CLS, đánh giá, góp ý';
ALTER TABLE HoiThoai          COMMENT = 'Phiên hội thoại chatbot, tư vấn sau khám, nhắn tin Messenger/Zalo';
ALTER TABLE TinNhan           COMMENT = 'Tin nhắn trong hội thoại';
ALTER TABLE YeuCauDatLich     COMMENT = 'Yêu cầu đặt lịch qua tin nhắn chờ lễ tân xử lý (UC13.11, UC7.14)';

-- =====================================================
-- DU LIEU DANH MUC
-- =====================================================
INSERT INTO VaiTro (MaVaiTro, MaCode, TenVaiTro, MoTa) VALUES
  (1, 'BENH_NHAN',     'Bệnh nhân',                 'Đặt lịch, xem hồ sơ sức khỏe, đánh giá, AI tư vấn'),
  (2, 'LE_TAN',        'Lễ tân',                    'Duyệt lịch, tiếp đón, kiểm tra BHYT, thu tiền'),
  (3, 'BAC_SI',        'Bác sĩ',                    'Khám bệnh, chỉ định cận lâm sàng, kê đơn'),
  (4, 'BS_XET_NGHIEM', 'Bác sĩ xét nghiệm',         'Thực hiện và trả kết quả xét nghiệm'),
  (5, 'BS_CDHA',       'Bác sĩ chẩn đoán hình ảnh', 'X-quang, siêu âm'),
  (6, 'BS_NOI_SOI',    'Bác sĩ nội soi',            'Thực hiện nội soi'),
  (7, 'QUAN_TRI',      'Quản trị viên',             'Quản lý danh mục, tài khoản, lịch làm việc, thống kê');

INSERT INTO Quyen (MaQuyen, MaCode, TenQuyen, NhomChucNang) VALUES
  (1,  'TAI_KHOAN.QUAN_LY',   'Quản lý tài khoản người dùng',  'Quản lý người dùng và phân quyền'),
  (2,  'VAI_TRO.QUAN_LY',     'Quản lý vai trò và quyền',      'Quản lý người dùng và phân quyền'),
  (3,  'NHAT_KY.XEM',         'Xem nhật ký truy cập hồ sơ',    'Quản lý người dùng và phân quyền'),
  (4,  'DANH_MUC.QUAN_LY',    'Quản lý danh mục',              'Quản lý danh mục'),
  (5,  'MAT_BANG.QUAN_LY',    'Quản lý sơ đồ mặt bằng',        'Quản lý danh mục'),
  (6,  'LICH_LV.QUAN_LY',     'Tạo, duyệt ca làm việc',        'Quản lý lịch làm việc'),
  (7,  'LICH_LV.DANG_KY',     'Đăng ký ca làm việc',           'Quản lý lịch làm việc'),
  (8,  'KHUNG_GIO.KHOA',      'Khóa, mở khung giờ',            'Quản lý lịch làm việc'),
  (9,  'LICH_LV.XEM',         'Xem lịch làm việc',             'Quản lý lịch làm việc'),
  (10, 'LICH_HEN.DAT',        'Đặt, hủy, đổi lịch của mình',   'Đặt lịch khám'),
  (11, 'LICH_HEN.DUYET',      'Duyệt, từ chối, hủy lịch hẹn',  'Tiếp đón và quản lý lịch hẹn'),
  (12, 'TIEP_DON.CHECK_IN',   'Check-in, kiểm tra BHYT',       'Tiếp đón và quản lý lịch hẹn'),
  (13, 'BENH_NHAN.QUAN_LY',   'Quản lý hồ sơ bệnh nhân',       'Tiếp đón và quản lý lịch hẹn'),
  (14, 'KHAM.THUC_HIEN',      'Khám, ghi hồ sơ bệnh án',       'Khám bệnh'),
  (15, 'KHAM.CHI_DINH',       'Chỉ định cận lâm sàng',         'Khám bệnh'),
  (16, 'KHAM.KE_DON',         'Kê đơn thuốc',                  'Khám bệnh'),
  (17, 'HO_SO.XEM_CUA_MINH',  'Xem hồ sơ sức khỏe cá nhân',    'Hồ sơ sức khỏe cá nhân'),
  (18, 'DANH_GIA.GUI',        'Đánh giá, gửi góp ý',           'Hồ sơ sức khỏe cá nhân'),
  (19, 'THANH_TOAN.THU',      'Thu tiền, thanh toán hóa đơn',  'Thanh toán'),
  (20, 'HOA_DON.HUY',         'Hủy hóa đơn',                   'Thanh toán'),
  (21, 'THONG_KE.XEM',        'Xem thống kê, xuất báo cáo',    'Thống kê báo cáo'),
  (22, 'GOP_Y.XU_LY',         'Xử lý góp ý, khiếu nại',        'Thống kê báo cáo'),
  (23, 'CHATBOT.TRI_THUC',    'Quản lý dữ liệu tri thức',      'Trợ lý AI'),
  (24, 'AI.TU_VAN',           'Tư vấn sức khỏe sau khám',      'Trợ lý AI'),
  (25, 'CLS.THUC_HIEN',       'Tiếp nhận, trả kết quả CLS',    'Cận lâm sàng');

INSERT INTO VaiTroQuyen (MaVaiTro, MaQuyen) VALUES
  (1,10),(1,17),(1,18),(1,24),
  (2,9),(2,11),(2,12),(2,13),(2,19),
  (3,7),(3,8),(3,9),(3,14),(3,15),(3,16),
  (4,25),(5,25),(6,25),
  (7,1),(7,2),(7,3),(7,4),(7,5),(7,6),(7,8),(7,9),(7,20),(7,21),(7,22),(7,23);

INSERT INTO VaiTroNhomChucNang (MaVaiTro, NhomChucNang) VALUES
  (1, 'Đặt lịch khám'), (1, 'Hồ sơ sức khỏe cá nhân'), (1, 'Trợ lý AI'),
  (2, 'Quản lý lịch làm việc'), (2, 'Tiếp đón và quản lý lịch hẹn'), (2, 'Thanh toán'),
  (3, 'Quản lý lịch làm việc'), (3, 'Khám bệnh'),
  (4, 'Cận lâm sàng'), (4, 'Quản lý lịch làm việc'), (4, 'Khám bệnh'),
  (5, 'Cận lâm sàng'), (5, 'Quản lý lịch làm việc'), (5, 'Khám bệnh'),
  (6, 'Cận lâm sàng'), (6, 'Quản lý lịch làm việc'), (6, 'Khám bệnh'),
  (7, 'Quản lý người dùng và phân quyền'), (7, 'Quản lý danh mục'), (7, 'Quản lý lịch làm việc'),
  (7, 'Thanh toán'), (7, 'Thống kê báo cáo'), (7, 'Trợ lý AI');

INSERT INTO ThongTinPhongKham (Id, TenPhongKham, GioiThieu, DiaChi, GioLamViec, Hotline, Email, MaNganHang, SoTaiKhoan, TenTaiKhoan) VALUES
  (1, 'Phòng khám Đa khoa Việt Bắc',
   'Phòng khám đa khoa với các chuyên khoa Nội, Nhi, Tai Mũi Họng, Da liễu, Tiêu hóa; có xét nghiệm, X-quang, siêu âm và nội soi.',
   '123 Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng', 'Thứ 2 - Thứ 7: 7h00-11h30, 13h30-17h00',
   '19001234', 'lienhe@vietbac.vn', '970436', '0041000123456', 'PHONG KHAM DA KHOA VIET BAC');

INSERT INTO ChuyenKhoa (MaCK, TenCK, MoTa, PhiKhamCoBan) VALUES
  (1, 'Nội tổng quát', 'Khám và điều trị bệnh nội khoa: tim mạch, hô hấp, nội tiết', 150000),
  (2, 'Nhi',           'Khám trẻ em dưới 16 tuổi',                                    150000),
  (3, 'Tai Mũi Họng',  'Bệnh lý tai, mũi, họng',                                       150000),
  (4, 'Da liễu',       'Bệnh lý da, tóc, móng',                                        150000),
  (5, 'Tiêu hóa',      'Bệnh lý dạ dày, đại tràng, gan mật',                          180000);

INSERT INTO Tang (MaTang, SoTang, TenTang) VALUES
  (1, 1, 'Tầng 1'), (2, 2, 'Tầng 2');

INSERT INTO Phong (MaPhong, MaSoPhong, TenPhong, MaTang, LoaiPhong, MaCK) VALUES
  (1,  'P101', 'Phòng khám Nội 1',      1, 'KHAM_BENH',  1),
  (2,  'P102', 'Phòng khám Nhi',        1, 'KHAM_BENH',  2),
  (3,  'P103', 'Phòng xét nghiệm',      1, 'XET_NGHIEM', NULL),
  (4,  'P104', 'Phòng X-quang',         1, 'X_QUANG',    NULL),
  (5,  'P201', 'Phòng khám Tai Mũi Họng', 2, 'KHAM_BENH', 3),
  (6,  'P202', 'Phòng khám Da liễu',    2, 'KHAM_BENH',  4),
  (7,  'P203', 'Phòng siêu âm',         2, 'SIEU_AM',    NULL),
  (8,  'P204', 'Phòng nội soi',         2, 'NOI_SOI',    NULL),
  (9,  'P205', 'Phòng khám Tiêu hóa',   2, 'KHAM_BENH',  5),
  (10, 'P105', 'Phòng khám Nội 2',      1, 'KHAM_BENH',  1);

-- Do thi duong di: tang 1 hanh lang doc truc Y, tang 2 tuong tu; noi bang cau thang va thang may
INSERT INTO DiemNut (MaDiem, MaTang, TenDiem, LoaiDiem, ToaDoX, ToaDoY, MaPhong) VALUES
  (1,  1, 'Sảnh chính',           'SANH',          100, 500, NULL),
  (2,  1, 'Quầy tiếp đón',        'QUAY_TIEP_DON', 160, 480, NULL),
  (3,  1, 'Quầy thu ngân',        'QUAY_THU_NGAN', 160, 420, NULL),
  (4,  1, 'Hành lang T1 - A',     'HANH_LANG',     300, 450, NULL),
  (5,  1, 'Hành lang T1 - B',     'HANH_LANG',     300, 250, NULL),
  (6,  1, 'Cầu thang bộ T1',      'CAU_THANG',     300, 100, NULL),
  (7,  1, 'Thang máy T1',         'THANG_MAY',     360, 100, NULL),
  (8,  1, 'Cửa P101',             'PHONG',         400, 450, 1),
  (9,  1, 'Cửa P102',             'PHONG',         200, 350, 2),
  (10, 1, 'Cửa P103',             'PHONG',         400, 250, 3),
  (11, 1, 'Cửa P104',             'PHONG',         200, 200, 4),
  (12, 1, 'Cửa P105',             'PHONG',         400, 350, 10),
  (13, 2, 'Cầu thang bộ T2',      'CAU_THANG',     300, 100, NULL),
  (14, 2, 'Thang máy T2',         'THANG_MAY',     360, 100, NULL),
  (15, 2, 'Hành lang T2 - A',     'HANH_LANG',     300, 250, NULL),
  (16, 2, 'Hành lang T2 - B',     'HANH_LANG',     300, 450, NULL),
  (17, 2, 'Cửa P201',             'PHONG',         400, 250, 5),
  (18, 2, 'Cửa P202',             'PHONG',         200, 250, 6),
  (19, 2, 'Cửa P203',             'PHONG',         400, 450, 7),
  (20, 2, 'Cửa P204',             'PHONG',         200, 450, 8),
  (21, 2, 'Cửa P205',             'PHONG',         400, 350, 9);

INSERT INTO DoanDuong (MaDiemDau, MaDiemCuoi, LoaiDoan, DoDai, SoTang) VALUES
  (1, 2, 'DI_BO', 6, 0), (2, 3, 'DI_BO', 6, 0), (2, 4, 'DI_BO', 15, 0), (3, 4, 'DI_BO', 14, 0),
  (4, 8, 'DI_BO', 5, 0), (4, 12, 'DI_BO', 8, 0), (4, 5, 'DI_BO', 10, 0), (4, 9, 'DI_BO', 9, 0),
  (5, 10, 'DI_BO', 5, 0), (5, 11, 'DI_BO', 7, 0), (5, 6, 'DI_BO', 8, 0), (6, 7, 'DI_BO', 3, 0),
  (6, 13, 'CAU_THANG', 0, 1), (7, 14, 'THANG_MAY', 0, 1),
  (13, 14, 'DI_BO', 3, 0), (13, 15, 'DI_BO', 8, 0), (15, 17, 'DI_BO', 5, 0), (15, 18, 'DI_BO', 5, 0),
  (15, 16, 'DI_BO', 10, 0), (15, 21, 'DI_BO', 7, 0), (16, 19, 'DI_BO', 5, 0), (16, 20, 'DI_BO', 5, 0);

-- Gia theo vi du Bang 2.3: kham 150.000/40.000; XN mau 120.000/90.000; X-quang 100.000/70.000
INSERT INTO DichVu (MaDV, TenDV, LoaiDV, MaCK, MaPhong, GiaDichVu, GiaBHYT, YeuCauNhinAn, ThoiGianThucHien, ThoiGianTraKetQua, MauKetQua) VALUES
  (1,  'Khám Nội tổng quát',              'KHAM',       1, NULL, 150000, 40000,  FALSE, 15, NULL, NULL),
  (2,  'Khám Nhi',                        'KHAM',       2, NULL, 150000, 40000,  FALSE, 15, NULL, NULL),
  (3,  'Khám Tai Mũi Họng',               'KHAM',       3, NULL, 150000, 40000,  FALSE, 15, NULL, NULL),
  (4,  'Khám Da liễu',                    'KHAM',       4, NULL, 150000, 40000,  FALSE, 15, NULL, NULL),
  (5,  'Khám Tiêu hóa',                   'KHAM',       5, NULL, 180000, 40000,  FALSE, 15, NULL, NULL),
  (6,  'Tổng phân tích tế bào máu',       'XET_NGHIEM', NULL, 3, 120000, 90000,  FALSE, 5,  60,   NULL),
  (7,  'Đường huyết lúc đói',             'XET_NGHIEM', NULL, 3, 40000,  20000,  TRUE,  5,  30,   NULL),
  (8,  'Tổng phân tích nước tiểu',        'XET_NGHIEM', NULL, 3, 60000,  40000,  FALSE, 5,  45,   NULL),
  (9,  'X-quang ngực thẳng',              'CDHA',       NULL, 4, 100000, 70000,  FALSE, 10, 30,   'Mô tả phim:\nKết luận:'),
  (10, 'Siêu âm ổ bụng tổng quát',        'CDHA',       NULL, 7, 200000, 150000, TRUE,  20, 15,   'Gan:\nMật:\nTụy:\nLách:\nThận:\nKết luận:'),
  (11, 'Nội soi dạ dày tá tràng',         'NOI_SOI',    NULL, 8, 800000, 500000, TRUE,  30, 30,   'Thực quản:\nDạ dày:\nTá tràng:\nKết luận:'),
  (12, 'Xét nghiệm HbA1c',                'XET_NGHIEM', NULL, 3, 150000, NULL,   FALSE, 5,  120,  NULL);

-- Nhin an: lam xet nghiem duong huyet truoc khi noi soi (BR18 muc 1)
INSERT INTO RangBuocDichVu (MaDV, MaDVTruoc) VALUES (11, 7), (11, 10);

INSERT INTO MauChiSo (MaDV, TenChiSo, DonVi, GioiHanDuoi, GioiHanTren, ThuTu) VALUES
  (6, 'WBC (Bạch cầu)',     'G/L',    4.0,   10.0,  1),
  (6, 'RBC (Hồng cầu)',     'T/L',    3.8,   5.5,   2),
  (6, 'HGB (Huyết sắc tố)', 'g/L',    120,   170,   3),
  (6, 'PLT (Tiểu cầu)',     'G/L',    150,   400,   4),
  (6, 'NEU% (Bạch cầu trung tính)', '%', 40, 75,    5),
  (7, 'Glucose lúc đói',    'mmol/L', 3.9,   6.4,   1),
  (8, 'pH',                 NULL,     5.0,   8.0,   1),
  (8, 'Tỷ trọng',           NULL,     1.005, 1.030, 2),
  (8, 'Glucose niệu',       'mmol/L', 0,     0.8,   3),
  (8, 'Protein niệu',       'g/L',    0,     0.15,  4),
  (12, 'HbA1c',             '%',      4.0,   6.4,   1);

INSERT INTO Thuoc (MaThuoc, TenThuoc, HoatChat, HamLuong, DonViTinh, DonGia, GiaBHYT) VALUES
  (1,  'Hapacol 500',     'Paracetamol',         '500mg', 'Viên', 1000,  800),
  (2,  'Amoxicillin 500', 'Amoxicillin',         '500mg', 'Viên', 2500,  2000),
  (3,  'Clarityne',       'Loratadin',           '10mg',  'Viên', 8500,  NULL),
  (4,  'Omeprazol 20',    'Omeprazol',           '20mg',  'Viên', 2000,  1500),
  (5,  'Vitamin C 500',   'Acid ascorbic',       '500mg', 'Viên', 800,   NULL),
  (6,  'Zinnat 500',      'Cefuroxim',           '500mg', 'Viên', 18000, 12000),
  (7,  'Ibuprofen 400',   'Ibuprofen',           '400mg', 'Viên', 1200,  1000),
  (8,  'Glucophage 850',  'Metformin',           '850mg', 'Viên', 3500,  2500),
  (9,  'Amlor 5',         'Amlodipin',           '5mg',   'Viên', 9000,  6000),
  (10, 'Hydrocortison',   'Hydrocortison acetat','1%',    'Tuýp', 25000, NULL),
  (11, 'Prospan',         'Cao lá thường xuân',  '100ml', 'Chai', 85000, NULL),
  (12, 'Gaviscon',        'Natri alginat',       '10ml',  'Gói',  6000,  NULL);

INSERT INTO BenhICD (MaICD, TenBenh) VALUES
  ('J00',   'Viêm mũi họng cấp (cảm thường)'),
  ('J02.9', 'Viêm họng cấp, không đặc hiệu'),
  ('J06.9', 'Nhiễm trùng đường hô hấp trên cấp, không đặc hiệu'),
  ('J20.9', 'Viêm phế quản cấp, không đặc hiệu'),
  ('J30.4', 'Viêm mũi dị ứng, không đặc hiệu'),
  ('K21.9', 'Bệnh trào ngược dạ dày - thực quản không viêm thực quản'),
  ('K29.7', 'Viêm dạ dày, không đặc hiệu'),
  ('I10',   'Tăng huyết áp vô căn (nguyên phát)'),
  ('E11.9', 'Đái tháo đường týp 2, không có biến chứng'),
  ('L20.9', 'Viêm da cơ địa, không đặc hiệu'),
  ('L50.9', 'Mày đay, không đặc hiệu'),
  ('H66.9', 'Viêm tai giữa, không đặc hiệu');

INSERT INTO CauHoiThuongGap (ChuDe, CauHoi, TraLoi) VALUES
  ('Giờ làm việc', 'Phòng khám làm việc giờ nào?', 'Phòng khám làm việc từ thứ 2 đến thứ 7, sáng 7h00-11h30, chiều 13h30-17h00.'),
  ('BHYT', 'Phòng khám có nhận bảo hiểm y tế không?', 'Có. Vui lòng mang thẻ BHYT hoặc cung cấp mã số BHXH khi tiếp đón để được kiểm tra mức hưởng.'),
  ('Đặt lịch', 'Tôi có thể hủy lịch hẹn không?', 'Bạn có thể hủy hoặc đổi lịch trên ứng dụng trước giờ khám ít nhất 4 giờ; mỗi lịch hẹn được đổi tối đa 2 lần.'),
  ('Cận lâm sàng', 'Siêu âm ổ bụng có cần nhịn ăn không?', 'Có. Bạn nên nhịn ăn ít nhất 6 giờ trước khi siêu âm ổ bụng.'),
  ('Thanh toán', 'Phòng khám nhận những hình thức thanh toán nào?', 'Phòng khám nhận tiền mặt và chuyển khoản qua mã VietQR tại quầy thu ngân.');


