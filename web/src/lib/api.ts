// Gọi API backend Spring Boot (thư mục backend/). Token phiên lưu trong localStorage, gửi qua header Authorization.

export type VaiTro = 'BENH_NHAN' | 'LE_TAN' | 'BAC_SI' | 'BS_XET_NGHIEM' | 'BS_CDHA' | 'BS_NOI_SOI' | 'QUAN_TRI'
export type VaiTroNhanVien = Exclude<VaiTro, 'BENH_NHAN'>
export type TrangThaiTaiKhoan = 'CHUA_KICH_HOAT' | 'HOAT_DONG' | 'BI_KHOA'

export interface NguoiDung {
  MaTK: number
  Email: string | null
  SDT: string | null
  PhaiDoiMatKhau: boolean
  VaiTro: VaiTro
  TenVaiTro: string
  MaNV: number | null
  MaBN: number | null
  HoTen: string
  AnhDaiDien: string | null
  Quyen: string[]
}

export interface TaiKhoan {
  MaTK: number
  Email: string | null
  SDT: string | null
  VaiTro: VaiTro
  TenVaiTro: string
  TrangThai: TrangThaiTaiKhoan
  LyDoKhoa: string | null
  KhoaDen: string | null
  LanDangNhapCuoi: string | null
  NgayTao: string
  MaNV: number | null
  MaBN: number | null
  HoTen: string | null
}

export interface DangKyBenhNhan {
  ho_ten: string
  ngay_sinh: string // YYYY-MM-DD
  gioi_tinh: 'NAM' | 'NU'
  sdt: string
  email: string
  mat_khau: string
  cccd?: string
  dia_chi?: string
}

export interface NhanVienMoi {
  ho_ten: string
  email: string
  sdt: string
  loai_nhan_vien: VaiTroNhanVien
  ngay_sinh?: string
  gioi_tinh?: 'NAM' | 'NU'
  ma_ck?: number
  hoc_ham_hoc_vi?: string
  so_nam_kinh_nghiem?: number
  ma_phong_phu_trach?: number
}

// ---------- Hồ sơ cá nhân ----------
/** Chung cho bệnh nhân và nhân viên; trường không thuộc vai trò thì không có trong JSON. */
export interface HoSo {
  MaBN?: number
  MaNV?: number
  HoTen: string
  NgaySinh: string | null
  GioiTinh: 'NAM' | 'NU' | null
  DiaChi: string | null
  AnhDaiDien: string | null
  Email: string | null
  SDT: string | null
  TenVaiTro: string
  NgayTao: string
  LanDangNhapCuoi: string | null
  // Bệnh nhân
  CCCD?: string | null
  NguoiLienHe?: string | null
  SDTNguoiLienHe?: string | null
  DiUng?: string | null
  // Nhân viên
  LoaiNhanVien?: VaiTroNhanVien
  HocHamHocVi?: string | null
  SoNamKinhNghiem?: number | null
  GioiThieu?: string | null
  DiemDanhGiaTB?: string | null
  SoLuotDanhGia?: number
  TenCK?: string | null
  MaSoPhong?: string | null
  TenPhong?: string | null
}

export interface CapNhatHoSo {
  ho_ten: string
  ngay_sinh?: string | null
  gioi_tinh?: 'NAM' | 'NU' | null
  dia_chi?: string | null
  cccd?: string | null
  nguoi_lien_he?: string | null
  sdt_nguoi_lien_he?: string | null
  gioi_thieu?: string | null
}

export interface ChuyenKhoa { MaCK: number; TenCK: string; MoTa: string | null; AnhDaiDien?: string | null; PhiKhamCoBan: string }

// ---------- Đặt lịch ----------
export type TrangThaiLichHen = 'CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'DA_CHECK_IN' | 'DANG_KHAM' | 'CHO_CLS'
  | 'DA_CO_KET_QUA' | 'HOAN_THANH' | 'DA_HUY' | 'VANG_MAT'
export type KenhDat = 'UNG_DUNG' | 'WEB' | 'DIEN_THOAI' | 'TIN_NHAN' | 'TAI_QUAY'

export interface BacSi {
  MaBS: number
  HoTen: string
  AnhDaiDien: string | null
  GioiTinh: 'NAM' | 'NU' | null
  HocHamHocVi: string | null
  SoNamKinhNghiem: number | null
  GioiThieu: string | null
  DiemDanhGiaTB: string | null
  SoLuotDanhGia: number
  MaCK: number
  TenCK: string
}

/** SoKhung: khung chưa bắt đầu của ngày; SoKhungTrong = 0 là ngày đã kín lịch. */
export interface NgayTrong { Ngay: string; SoKhung: number; SoKhungTrong: number }

export interface KhungGio {
  MaKG: number
  NgayKham: string // YYYY-MM-DD
  GioBatDau: string // HH:mm
  GioKetThuc: string
  CaLam: 'SANG' | 'CHIEU'
  MaBS: number
  BacSi: string
  MaSoPhong: string
  TenPhong: string
}

export interface LichHen {
  MaLK: number
  /** Lễ tân: số phiếu CLS chờ tạm thu, hóa đơn cuối lượt chưa thanh toán (để hiện nút thu nhanh) */
  SoPhieuChoThu?: number
  MaHDChuaThu?: number | null
  MaLichHen: string
  NgayKham: string
  GioBatDau: string
  GioKetThuc: string
  TrangThai: TrangThaiLichHen
  KenhDat: KenhDat
  LyDoKham: string | null
  TrieuChungSoBo: string | null
  SoLanDoi: number
  SoThuTu: number | null
  ThoiDiemCheckIn: string | null
  LyDoHuy: string | null
  TrangThaiBHYT: 'KHONG_CO' | 'HOP_LE' | 'KHONG_HOP_LE' | 'CHO_XAC_MINH'
  MucHuong: number | null
  GioDuKienVaoKham: string | null
  NgayTao: string
  MaBN: number
  BenhNhan: string
  SDT: string | null
  NgaySinh: string | null
  GioiTinh: 'NAM' | 'NU' | null
  MaBS: number
  BacSi: string
  HocHamHocVi: string | null
  MaCK: number
  TenCK: string
  MaSoPhong: string
  TenPhong: string
}

export interface DangKyCho {
  MaDKC: number
  NgayMongMuon: string
  Buoi: 'SANG' | 'CHIEU' | 'CA_NGAY'
  LyDoKham: string | null
  TrangThai: 'DANG_CHO' | 'DANG_DUOC_MOI' | 'DA_NHAN_CHO' | 'HET_HAN' | 'DA_HUY'
  HanGiuCho: string | null
  ThoiDiemDangKy: string
  MaLK: number | null
  TenCK: string
  BacSi: string | null
  NgayKham: string | null
  GioBatDau: string | null
  BacSiDuocMoi: string | null
  ViTri: number
}

export interface BenhNhan {
  MaBN: number
  MaTK: number | null
  HoTen: string
  NgaySinh: string | null
  GioiTinh: 'NAM' | 'NU' | null
  SDT: string | null
  CCCD: string | null
  Email: string | null
  DiaChi: string | null
  NguoiLienHe: string | null
  SDTNguoiLienHe: string | null
  DiUng: string | null
}

export interface TheBHYT { MaThe: string; HoTenTrenThe: string; NgayHetHan: string; MucHuong: number }

export interface ThongBao {
  MaTB: number
  LoaiSuKien: string
  TieuDe: string
  NoiDung: string
  LoaiDoiTuong: string | null
  MaDoiTuong: number | null
  DaDoc: boolean | number
  ThoiGianTao: string
}
// ---------- Lịch làm việc (gói 4) ----------
export type CaLam = 'SANG' | 'CHIEU'
export type TrangThaiKhungGio = 'TRONG' | 'DA_DAT' | 'DANG_GIU_CHO' | 'DA_KHOA'
export type TrangThaiDangKyCa = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'DA_HUY'

export interface CaLamViec {
  MaCa: number
  MaBS: number
  BacSi: string
  MaCK: number
  TenCK: string
  NgayLam: string
  CaLam: CaLam
  MaPhong: number
  MaSoPhong: string
  TenPhong: string
  ThoiLuongKhungGio: number
  MaDK: number | null
  TongKhung: number
  SoTrong: number
  SoDaDat: number
  SoKhoa: number
}

export interface KhungGioCa {
  MaKG: number
  GioBatDau: string
  GioKetThuc: string
  TrangThai: TrangThaiKhungGio
  LyDoKhoa: string | null
  NguoiKhoa: string | null
  MaLK: number | null
  MaLichHen: string | null
  TrangThaiLichHen: TrangThaiLichHen | null
  BenhNhan: string | null
}

export type ChiTietCa = Omit<CaLamViec, 'MaCK' | 'TongKhung' | 'SoTrong' | 'SoDaDat' | 'SoKhoa'> & { KhungGio: KhungGioCa[] }

export interface PhongKham { MaPhong: number; MaSoPhong: string; TenPhong: string; BacSiDangDung: string | null }

export interface DangKyCa {
  MaDK: number
  MaBS: number
  BacSi: string
  MaCK: number
  TenCK: string
  NgayLam: string
  CaLam: CaLam
  GhiChu: string | null
  TrangThai: TrangThaiDangKyCa
  LyDoTuChoi: string | null
  NgayDuyet: string | null
  NguoiDuyet: string | null
  NgayTao: string
  MaCa: number | null
  MaSoPhong: string | null
  TenPhong: string | null
  /** Bác sĩ đã có ca trùng (do quản trị viên xếp trực tiếp) */
  DaCoCa: number
}

export interface KetQuaTaoCa {
  so_ca: number
  so_khung_gio: number
  bo_qua: { ngay: string; ca_lam: CaLam; ly_do: string }[]
}

// ---------- Phân quyền, nhật ký (gói 2) ----------
export interface VaiTroDong { MaVaiTro: number; MaCode: VaiTro; TenVaiTro: string; MoTa: string | null; SoTaiKhoan: number }
export interface QuyenDong { MaQuyen: number; MaCode: string; TenQuyen: string; NhomChucNang: string }
export interface BangPhanQuyen {
  vai_tro: VaiTroDong[]
  quyen: QuyenDong[]
  gan: Record<string, string[]>
  /** Vai trò -> các nhóm chức năng được phép có quyền (ngoài nhóm này là "không có quyền") */
  nhom_vai_tro: Record<string, string[]>
  /** MaTK -> quyền của vai trò bị bỏ riêng với tài khoản đó */
  bo_rieng: Record<number, string[]>
}

export interface NhatKyThaoTac {
  MaNK: number
  ThoiGian: string
  HanhDong: string
  DoiTuong: string | null
  MaDoiTuong: string | null
  ChiTiet: string | null
  MaTK: number | null
  NguoiThucHien: string | null
  VaiTroNguoiThucHien: VaiTro | null
  TenDoiTuong: string | null
}

export interface NhatKyTruyCap {
  MaNK: number
  ThoiGian: string
  ThaoTac: 'XEM' | 'TAO' | 'CAP_NHAT' | 'BO_SUNG_GHI_CHU' | 'TAI_TEP' | 'IN'
  MaTK: number
  NguoiTruyCap: string
  VaiTro: VaiTro
  MaHSBA: number
  MaLK: number
  MaLichHen: string
  NgayKham: string
  MaBN: number
  BenhNhan: string
  BacSiDieuTri: string
  LaBacSiDieuTri: number
  LaChinhBenhNhan: number | null
}

export interface ChiTietTaiKhoan {
  MaTK: number
  Email: string | null
  SDT: string | null
  TrangThai: TrangThaiTaiKhoan
  LyDoKhoa: string | null
  KhoaDen: string | null
  SoLanSai: number
  PhaiDoiMatKhau: number
  LanDangNhapCuoi: string | null
  NgayTao: string
  VaiTro: VaiTro
  TenVaiTro: string
  NhanVien: null | {
    MaNV: number; HoTen: string; NgaySinh: string | null; GioiTinh: 'NAM' | 'NU' | null; SDT: string | null
    Email: string | null; DiaChi: string | null; HocHamHocVi: string | null; SoNamKinhNghiem: number | null
    GioiThieu: string | null; TenCK: string | null; MaSoPhong: string | null; TenPhong: string | null
    DiemDanhGiaTB: number | null; SoLuotDanhGia: number; TrangThai: string
  }
  BenhNhan: null | (BenhNhan & { SoLuotKham: number })
  Phien: { MaPhien: number; ThietBi: string | null; NgayTao: string; HetHan: string }[]
  NhatKy: NhatKyThaoTac[]
}

// ---------- Khám bệnh (gói 8), hồ sơ sức khỏe (gói 9) ----------
export interface LuotChoKham {
  MaLK: number
  MaLichHen: string
  SoThuTu: number | null
  TrangThai: TrangThaiLichHen
  ThoiDiemCheckIn: string | null
  GioDuKienVaoKham: string | null
  SoLanBoQua: number
  LyDoKham: string | null
  TrangThaiBHYT: LichHen['TrangThaiBHYT']
  MucHuong: number | null
  MaBN: number
  HoTen: string
  NgaySinh: string | null
  GioiTinh: 'NAM' | 'NU' | null
}

export interface ThuocTrongDon {
  MaThuoc: number
  TenThuoc: string
  HoatChat: string | null
  HamLuong: string | null
  DonViTinh: string
  SoLuong: number
  LieuDung: string | null
  CachDung: string | null
  SoNgayDung: number | null
  DonGia: string
  GiaBHYT: string | null
}

export interface HoSoBenhAn {
  MaHSBA: number
  Mach: number | null
  HuyetAp: string | null
  NhietDo: string | null
  CanNang: string | null
  ChieuCao: string | null
  TrieuChung: string | null
  KhamLamSang: string | null
  MaICD: string | null
  TenBenh: string | null
  ChanDoan: string | null
  LoiDan: string | null
  NgayTaiKham: string | null
  TrangThai: 'NHAP' | 'HOAN_TAT'
  NgayHoanTat: string | null
  DonThuoc: ThuocTrongDon[]
  GhiChu: { MaGC: number; NoiDung: string; ThoiGian: string; BacSi: string }[]
}

export type TrangThaiPhieuCls = 'CHO_THANH_TOAN' | 'CHO_THUC_HIEN' | 'DANG_THUC_HIEN' | 'CO_KET_QUA' | 'DA_HUY'

export interface PhieuChiDinh {
  MaPCD: number
  MaDV: number
  TenDV: string
  LoaiDV: 'XET_NGHIEM' | 'CDHA' | 'NOI_SOI'
  MaSoPhong: string
  TenPhong: string
  YeuCau: string | null
  GiaDichVu: string
  BHYTChiTra: string
  BenhNhanTra: string
  TrangThai: TrangThaiPhieuCls
  LyDoHuy: string | null
  /** Lý do phòng CLS hoãn phiếu (bệnh nhân vắng, chưa nhịn ăn...) */
  GhiChu?: string | null
  ThoiDiemChiDinh: string
  ThoiDiemCoKetQua: string | null
  MaKQ: number | null
  MoTa: string | null
  KetLuan: string | null
  NhanXet: string | null
  DaNhinAn?: boolean | number | null
  CoSinhThiet?: boolean | number | null
  SoMauSinhThiet?: number | null
  ViTriSinhThiet?: string | null
  PhienBan?: number | null
  NgayCapNhat?: string | null
  BacSiThucHien: string | null
  ChiSo: { TenChiSo: string; DonVi: string | null; GioiHanDuoi: string | null; GioiHanTren: string | null; GiaTri: string
    DanhGia: 'BINH_THUONG' | 'CAO' | 'THAP' }[]
  Tep?: TepKetQua[]
}

export interface TepKetQua {
  MaTep: number; DuongDan: string; TenTep: string; LoaiTep: 'JPG' | 'PNG' | 'PDF'; KichThuoc: number
  MoTa: string | null; ThoiGian?: string
}

// ---------- Thu tạm thu (gói 10) ----------
export type HinhThucThu = 'TIEN_MAT' | 'CHUYEN_KHOAN'
export type HinhThucHoaDon = HinhThucThu | 'MOMO'

// ---------- Hóa đơn cuối lượt khám, MoMo (gói 10) ----------
export interface DongHoaDon {
  MaHD: number
  MaSoHoaDon: string
  MaLK: number
  MaLichHen: string
  NgayKham: string
  HoTen?: string
  NgaySinh?: string | null
  GioiTinh?: 'NAM' | 'NU' | null
  SDT?: string | null
  BacSi: string
  TenCK: string | null
  NgayLap: string
  TongTien: string
  BHYTChiTra: string
  DaTamThu: string
  ConPhaiThu: string
  TrangThai: 'CHUA_THANH_TOAN' | 'DA_THANH_TOAN' | 'DA_HUY'
  HinhThuc: HinhThucHoaDon | null
  NgayThanhToan: string | null
  ThuNgan?: string | null
}

export interface GiaoDichMoMo {
  MaDonMoMo: string; MaHD?: number; SoTien: string; TrangThai: 'CHO_THANH_TOAN' | 'THANH_CONG' | 'THAT_BAI'
  MaGiaoDichMoMo: number | null; ThongDiep: string | null; ThoiDiemTao?: string; ThoiDiemCapNhat?: string | null
  MaSoHoaDon?: string; TrangThaiHoaDon?: DongHoaDon['TrangThai']
}

export interface HoaDon extends DongHoaDon {
  MaBN: number
  LyDoHuy: string | null
  NguoiHuy: string | null
  MaSoHoaDonGoc: string | null
  HoaDonThayThe: string | null
  PhieuHoanTien: { MaPHT: number; MaSoPhieu: string; LyDo: LyDoHoan; SoTien: string; TrangThai: TrangThaiHoan
    ThoiDiemLap: string; ThoiDiemHoan: string | null; MaChungTu: string }[]
  TrangThaiBHYT: LichHen['TrangThaiBHYT']
  MucHuong: number | null
  TienKhachDua: string | null
  ChiTiet: {
    MaCTHD: number; LoaiMuc: 'KHAM' | 'CLS' | 'THUOC'; NoiDung: string; SoLuong: number; GiaDichVu: string
    GiaBHYT: string | null; ThanhTien: string; BHYTChiTra: string; BenhNhanTra: string; DaTamThu: boolean | number
  }[]
  GiaoDichMoMo: GiaoDichMoMo[]
  PhongKham: { TenPhongKham: string; DiaChi: string; Hotline: string }
  /** Đang dùng môi trường thử của MoMo (không trừ tiền thật) */
  MoMoThu: boolean
}

export interface LenhMoMo { ma_don: string; pay_url: string; so_tien: string | number }

// ---------- Hoàn tiền (UC10.4, BR31) ----------
// ---------- Đánh giá, góp ý (gói 12) ----------
export type CamXuc = 'TICH_CUC' | 'TRUNG_TINH' | 'TIEU_CUC'
export type MucDoNghiemTrong = 'THAP' | 'TRUNG_BINH' | 'CAO'
export type CotTieuChi = 'DiemThoiGianCho' | 'DiemThuTucTiepDon' | 'DiemThaiDoNhanVien' | 'DiemCoSoVatChat' | 'DiemDichVuCLS' | 'DiemChiPhi'
export interface TepDinhKem { MaTep: number; DuongDan: string; TenTep: string; LoaiTep?: string; KichThuoc?: number }
export interface LuotChoDanhGia {
  MaLK: number; MaLichHen: string; NgayKham: string; BacSi: string; HocHamHocVi: string | null; TenCK: string | null
  NgayThanhToan: string; HanDanhGia: string
}
export type DanhGia = Partial<Record<CotTieuChi, number | null>> & {
  MaDG: number; MaLK: number; MaBS: number; DiemBacSi: number | null; NhanXetBacSi: string | null; NhanXetDichVu: string | null
  ThoiGian: string; TrangThaiPhanTich: 'CHUA_PHAN_TICH' | 'DA_PHAN_TICH'; CamXuc: CamXuc | null; ChuDe: string[] | null
  MucDoNghiemTrong: MucDoNghiemTrong | null; Anh: TepDinhKem[]
  MaLichHen?: string; NgayKham?: string; BacSi?: string; TenCK?: string | null; BenhNhan?: string
}
export interface BieuMauDanhGia {
  MaLK: number; MaLichHen: string; NgayKham: string; TrangThai: string; BacSi: string; HocHamHocVi: string | null
  AnhDaiDien: string | null; TenCK: string | null; NgayThanhToan: string | null; HanDanhGia: string | null; SoCLS: number
  DanhGia: DanhGia | null; LyDoKhongDuoc: string | null; TieuChi: Record<CotTieuChi, string>
}
export interface BaoCaoDanhGia {
  TongQuan: Partial<Record<CotTieuChi, number | null>> & { SoDanhGia: number; DiemBacSi: number | null; TichCuc: number
    TrungTinh: number; TieuCuc: number; ChuaPhanTich: number }
  TheoThang: { Thang: string; SoDanhGia: number; DiemBacSi: number | null; DiemDichVu: number | null; TichCuc: number; TieuCuc: number }[]
  ChuDe: { ChuDe: string; TichCuc: number; TrungTinh: number; TieuCuc: number }[]
  BacSi: { MaNV: number; HoTen: string; TenCK: string | null; SoDanhGia: number; DiemBacSi: number | null; TieuCuc: number }[]
  TongHop: { CoTongHop: true; MoDau: string; DiemManh: string[]; CanCaiThien: string[] } | { CoTongHop: false; LyDo: string }
}
export type LoaiGopY = 'GOP_Y' | 'KHIEU_NAI'
export type TrangThaiGopY = 'MOI' | 'DANG_XU_LY' | 'DA_PHAN_HOI' | 'DA_DONG'
export interface DongGopY {
  MaPhieu: number; MaSoPhieu: string; Loai: LoaiGopY; ChuDe: string; TrangThai: TrangThaiGopY; ThoiDiemGui: string
  HanPhanHoi: string; ThoiDiemPhanHoi: string | null; ThoiDiemDong?: string | null; MaLichHen: string | null
  CamXuc?: CamXuc | null; MucDoNghiemTrong?: MucDoNghiemTrong | null; HoTen?: string; SDT?: string; TomTat?: string; QuaHan?: number
}
export interface TraoDoiGopY {
  MaTD: number; Loai: 'PHAN_HOI' | 'BO_SUNG' | 'GHI_CHU_NOI_BO'; NoiDung: string; ThoiGian: string; CuaBenhNhan: number; NguoiGui: string
}
export interface PhieuGopY extends DongGopY {
  NoiDung: string; MaLK: number | null; NgayKham: string | null; BacSi: string | null; TenCK: string | null
  TrangThaiLuot: string | null; HoTen: string; SDT: string; EmailBN: string | null; QuaHan: number
  TraoDoi: TraoDoiGopY[]; Tep: TepDinhKem[]
}

export type LyDoHoan = 'HUY_PHIEU_CLS' | 'BHYT_XAC_MINH' | 'HOA_DON_THAY_THE' | 'CHUYEN_KHOAN_THUA' | 'KHAC'
export type TrangThaiHoan = 'CHO_DUYET' | 'CHO_HOAN' | 'DA_HOAN' | 'TU_CHOI'

export interface DongPhieuHoan {
  MaPHT: number; MaSoPhieu: string; MaBL: number | null; MaHD: number | null; MaChungTu: string; LyDo: LyDoHoan
  GhiChu: string | null; SoTien: string; TrangThai: TrangThaiHoan; ThoiDiemLap: string; HinhThuc: HinhThucThu | null
  ThoiDiemHoan: string | null; LyDoTuChoi: string | null; HoTen: string; SDT: string | null; MaLichHen: string
  TenDV: string | null
}

export interface PhieuHoan extends DongPhieuHoan {
  NganHang: string | null; SoTaiKhoan: string | null; TenTaiKhoan: string | null; NguoiLap: string | null
  NguoiDuyet: string | null; ThoiDiemDuyet: string | null; ThuNgan: string | null
  ChungTu: { Loai: 'BIEN_LAI' | 'HOA_DON'; MaSo: string; DaThu: string; DaHoan: string; TrangThai: string
    HinhThuc: HinhThucHoaDon | null; NgayThu: string | null; MaLichHen: string; HoTen: string; SDT: string | null }
  PhongKham: { TenPhongKham: string; DiaChi: string; Hotline: string }
}

// ---------- Thống kê (UC13.1, 13.2) ----------
export type LoaiThongKe = 'LUOT_KHAM' | 'DOANH_THU' | 'HUY_VANG' | 'HIEU_SUAT' | 'THOI_GIAN_CHO'
export interface DoanhThu { TamThu: number; HoaDon: number; HoanTien: number; Thuan: number }
export interface TongQuan {
  Ngay: string
  LuotKham: { HomNay: number; HoanThanhHomNay: number; Thang: number; HuyThang: number; VangThang: number; LichThang: number }
  LichMoiTheoKenh: { KenhDat: KenhDat; HomNay: number; Thang: number }[]
  DoanhThuHomNay: DoanhThu
  DoanhThuThang: DoanhThu
  CanXuLy: { GopYQuaHan: number; MoMoChuaDoiSoat: number; HoanChoDuyet: number; HoanChoChi: number; HoaDonChuaThu: number }
  BayNgay: { Ngay: string; DaDen: number; HoanThanh: number; HuyVang: number }[]
}
/** Kết quả thống kê: các bảng có cột tùy loại (số liệu dạng number). */
export type DongThongKe = Record<string, string | number | null>
export interface KetQuaThongKe {
  Loai: LoaiThongKe; TuNgay: string; DenNgay: string; TongHop?: DongThongKe
  TheoNgay?: DongThongKe[]; TheoChuyenKhoa?: DongThongKe[]; TheoKenh?: DongThongKe[]; TheoHinhThuc?: DongThongKe[]
  TheoBacSi?: DongThongKe[]
}

export interface LuotChoTamThu {
  MaLK: number
  MaLichHen: string
  NgayKham: string
  TrangThaiBHYT: LichHen['TrangThaiBHYT']
  MucHuong: number | null
  MaBN: number
  HoTen: string
  NgaySinh: string | null
  GioiTinh: 'NAM' | 'NU' | null
  SDT: string | null
  BacSi: string
  SoPhieu: number
  TongGia: string
  BHYTChiTra: string
  SoTienPhaiThu: string
  ThoiDiemChiDinh: string
  Phieu: {
    MaPCD: number; TenDV: string; LoaiDV: PhieuChiDinh['LoaiDV']; MaSoPhong: string; TenPhong: string
    GiaDichVu: string; GiaBHYT: string | null; BHYTChiTra: string; BenhNhanTra: string; ThoiDiemChiDinh: string
    YeuCauNhinAn: boolean | number
  }[]
}

export interface BienLai {
  MaBL: number
  MaSoBienLai: string
  MaLK: number
  TongTien: string
  HinhThuc: HinhThucThu
  TienKhachDua: string | null
  TienThua: string | null
  ThoiDiemThu: string
  TrangThai: 'DA_THU' | 'DA_HUY'
  ThuNgan: string
  MaLichHen: string
  HoTen: string
  NgaySinh: string | null
  GioiTinh: 'NAM' | 'NU' | null
  SDT: string | null
  BacSi: string
  Phieu: { MaPCD: number; TenDV: string; MaSoPhong: string; TenPhong: string; GiaDichVu: string; BHYTChiTra: string
    BenhNhanTra: string; TrangThai: TrangThaiPhieuCls }[]
  PhongKham: { TenPhongKham: string; DiaChi: string; Hotline: string }
}

export interface DongBienLai {
  MaBL: number; MaSoBienLai: string; MaLK: number; MaLichHen: string; HoTen: string; TongTien: string
  HinhThuc: HinhThucThu; ThoiDiemThu: string; TrangThai: 'DA_THU' | 'DA_HUY'; ThuNgan: string; SoPhieu: number
}

// ---------- Cận lâm sàng (gói 14) ----------
export interface PhongCls { MaPhong: number; MaSoPhong: string; TenPhong: string; LoaiPhong: LoaiPhong }

export interface PhieuChoCls {
  MaPCD: number
  MaLK: number
  TrangThai: 'CHO_THUC_HIEN' | 'DANG_THUC_HIEN'
  ThoiDiemVaoHangCho: string | null
  ThoiDiemBatDau: string | null
  SoLanBoQua: number
  GhiChu: string | null
  YeuCau: string | null
  ChanDoanSoBo: string | null
  TenDV: string
  LoaiDV: PhieuChiDinh['LoaiDV']
  YeuCauNhinAn: boolean | number
  ThoiGianThucHien: number | null
  MaLichHen: string
  HoTen: string
  NgaySinh: string | null
  GioiTinh: 'NAM' | 'NU' | null
  BacSiChiDinh: string
  BacSiThucHien: string | null
  /** Dịch vụ cùng lượt phải làm trước (BR18) */
  CanLamTruoc: string | null
}

export interface PhieuDaXongCls {
  MaPCD: number; MaLK: number; ThoiDiemCoKetQua: string; TenDV: string; LoaiDV: PhieuChiDinh['LoaiDV']; MaLichHen: string
  TrangThaiLuot: TrangThaiLichHen; HoTen: string; NgaySinh: string | null; GioiTinh: 'NAM' | 'NU' | null
  KetLuan: string | null; NhanXet: string | null; PhienBan: number; BacSiThucHien: string | null
}

export interface HangChoCls { Phong: PhongCls; DangCho: PhieuChoCls[]; DaXong: PhieuDaXongCls[] }

export interface ChiTietPhieuCls {
  MaPCD: number
  MaLK: number
  MaDV: number
  TrangThai: TrangThaiPhieuCls
  YeuCau: string | null
  ChanDoanSoBo: string | null
  GhiChu: string | null
  SoLanBoQua: number
  TenDV: string
  LoaiDV: PhieuChiDinh['LoaiDV']
  MauKetQua: string | null
  YeuCauNhinAn: boolean | number
  MaSoPhong: string
  TenPhong: string
  MaLichHen: string
  TrangThaiLuot: TrangThaiLichHen
  BacSiChiDinh: string
  CanLamTruoc: string | null
  BenhNhan: Pick<BenhNhan, 'MaBN' | 'HoTen' | 'NgaySinh' | 'GioiTinh' | 'SDT' | 'DiUng'>
  MauChiSo: { MaChiSo: number; TenChiSo: string; DonVi: string | null; GioiHanDuoi: string | null
    GioiHanTren: string | null; BatBuoc: boolean | number }[]
  KetQua: null | {
    MaKQ: number; MoTa: string | null; KetLuan: string | null; NhanXet: string | null
    DaNhinAn: boolean | number | null; DaKyDongY: boolean | number | null; CoSinhThiet: boolean | number | null
    SoMauSinhThiet: number | null; ViTriSinhThiet: string | null; PhienBan: number; ThoiGianTra: string
    NgayCapNhat: string | null; BacSiThucHien: string
    ChiSo: (PhieuChiDinh['ChiSo'][number] & { MaChiSo: number })[]
    Tep: TepKetQua[]
    LichSu: { PhienBan: number; NoiDungCu: string; LyDoDieuChinh: string; ThoiGian: string; NguoiSua: string }[]
  }
}

export interface NhapKetQuaCls {
  mo_ta?: string | null
  ket_luan?: string | null
  nhan_xet?: string | null
  chi_so?: { ma_chi_so: number; gia_tri: number }[]
  da_nhin_an?: boolean | null
  da_ky_dong_y?: boolean | null
  co_sinh_thiet?: boolean | null
  so_mau_sinh_thiet?: number | null
  vi_tri_sinh_thiet?: string | null
  /** Bắt buộc khi điều chỉnh kết quả đã trả (UC14.7) */
  ly_do_dieu_chinh?: string
}

export interface TomTatTienSu {
  TrangThai: 'DA_TAO' | 'KHAM_LAN_DAU' | 'CHUA_CO_TOM_TAT'
  ThoiDiemTao: string
  PhanHoiBS: 'HUU_ICH' | 'CHUA_CHINH_XAC' | null
  NoiDung: null | {
    nhan: string
    benh_da_chan_doan: { ngay: string; icd: string | null; chan_doan: string | null }[]
    di_ung: string | null
    thuoc_don_gan_nhat: { ngay: string; thuoc: string[] }
    chi_so_bat_thuong: { ngay: string; chi_so: string; gia_tri: number; don_vi: string | null; danh_gia: string }[]
    loi_dan_lan_truoc: { ngay: string; loi_dan: string | null; ngay_tai_kham: string | null }
  }
}

export interface LuotKhamChiTiet {
  MaLK: number
  MaLichHen: string
  MaBN: number
  MaBS: number
  NgayKham: string
  GioBatDau: string
  TrangThai: TrangThaiLichHen
  LyDoKham: string | null
  TrieuChungSoBo: string | null
  SoThuTu: number | null
  TrangThaiBHYT: LichHen['TrangThaiBHYT']
  MucHuong: number | null
  MaThe: string | null
  BacSi: string
  TenCK: string | null
  MaSoPhong: string
  BenhNhan: Pick<BenhNhan, 'MaBN' | 'HoTen' | 'NgaySinh' | 'GioiTinh' | 'SDT' | 'DiaChi' | 'DiUng' | 'NguoiLienHe'
    | 'SDTNguoiLienHe'>
  HoSo: HoSoBenhAn | null
  ChiDinh: PhieuChiDinh[]
  TomTat: TomTatTienSu | null
  LichSu: { MaLK: number; NgayKham: string; BacSi: string; TenCK: string | null; MaICD: string | null; ChanDoan: string | null }[]
}

/** Một lần khám đã hoàn tất (bệnh nhân xem, hoặc bác sĩ xem lại lần khám trước). */
export interface LanKham {
  MaLK: number
  MaLichHen: string
  NgayKham: string
  LyDoKham: string | null
  BacSi: string
  HocHamHocVi: string | null
  TenCK: string | null
  BenhNhan: string
  NgaySinh: string | null
  GioiTinh: 'NAM' | 'NU' | null
  HoSo: HoSoBenhAn | null
  ChiDinh: PhieuChiDinh[]
}

export interface DongHoSoSucKhoe {
  MaLK: number
  MaLichHen: string
  NgayKham: string
  BacSi: string
  HocHamHocVi: string | null
  TenCK: string | null
  MaICD: string | null
  TenBenh: string | null
  ChanDoan: string | null
  NgayTaiKham: string | null
  SoKetQua: number
  CoDonThuoc: number
}

export interface LuuHoSoBenhAn {
  mach?: number | null
  huyet_ap?: string | null
  nhiet_do?: number | null
  can_nang?: number | null
  chieu_cao?: number | null
  trieu_chung?: string | null
  kham_lam_sang?: string | null
  ma_icd?: string | null
  chan_doan?: string | null
  loi_dan?: string | null
  ngay_tai_kham?: string | null
  /** Không gửi = giữ nguyên đơn (bác sĩ không có quyền kê đơn) */
  don_thuoc?: { ma_thuoc: number; so_luong: number; lieu_dung?: string | null; cach_dung?: string | null
    so_ngay_dung?: number | null }[]
}

export interface ThuocDanhMuc {
  MaThuoc: number; TenThuoc: string; HoatChat: string | null; HamLuong: string | null; DonViTinh: string
  DonGia: string; GiaBHYT: string | null
}
export interface DichVuCls {
  MaDV: number; TenDV: string; LoaiDV: PhieuChiDinh['LoaiDV']; GiaDichVu: string; GiaBHYT: string | null
  YeuCauNhinAn: boolean | number; ThoiGianTraKetQua: number | null; MaSoPhong: string; TenPhong: string
}

// ---------- Danh mục, mặt bằng (gói 3) ----------
export type TrangThaiDanhMuc = 'HOAT_DONG' | 'NGUNG_HOAT_DONG'
export type LoaiPhong = 'KHAM_BENH' | 'XET_NGHIEM' | 'X_QUANG' | 'SIEU_AM' | 'NOI_SOI'
export type LoaiDichVu = 'KHAM' | 'XET_NGHIEM' | 'CDHA' | 'NOI_SOI'

export interface ChuyenKhoaQuanLy extends ChuyenKhoa { TrangThai: TrangThaiDanhMuc; SoBacSi: number; SoPhong: number }

export interface PhongQuanLy {
  MaPhong: number; MaSoPhong: string; TenPhong: string; MaTang: number; TenTang: string; LoaiPhong: LoaiPhong
  MaCK: number | null; TenCK: string | null; TrangThai: TrangThaiDanhMuc; CoTrenSoDo: number
}

export interface DichVuQuanLy {
  MaDV: number; TenDV: string; LoaiDV: LoaiDichVu; MaCK: number | null; TenCK: string | null; MaPhong: number | null
  MaSoPhong: string | null; TenPhong: string | null; GiaDichVu: string; GiaBHYT: string | null; MauKetQua: string | null
  YeuCauNhinAn: boolean | number; ThoiGianThucHien: number | null; ThoiGianTraKetQua: number | null
  TrangThai: TrangThaiDanhMuc; SoChiSo: number; LamTruoc: number[]
}

export interface MauChiSo {
  MaChiSo: number; TenChiSo: string; DonVi: string | null; GioiHanDuoi: string | null; GioiHanTren: string | null
  BatBuoc: boolean | number; ThuTu: number; TrangThai: TrangThaiDanhMuc
}

export type ThuocQuanLy = ThuocDanhMuc & { TrangThai: TrangThaiDanhMuc }
export interface BenhIcd { MaICD: string; TenBenh: string; TrangThai: TrangThaiDanhMuc }

/** Thông tin liên hệ công khai của phòng khám (chân trang). */
export interface ThongTinLienHe {
  TenPhongKham: string; GioiThieu: string | null; DiaChi: string | null; GioLamViec: string | null; Hotline: string | null
  Email: string | null
}
export interface ThongTinPhongKham {
  TenPhongKham: string; GioiThieu: string | null; DiaChi: string; GioLamViec: string; Hotline: string
  Email: string | null; MaNganHang: string | null; SoTaiKhoan: string | null; TenTaiKhoan: string | null
}

export type LoaiDiem = 'PHONG' | 'HANH_LANG' | 'NGA_RE' | 'CAU_THANG' | 'THANG_MAY' | 'QUAY_TIEP_DON' | 'QUAY_THU_NGAN' | 'SANH'
export interface DiemNut {
  MaDiem: number; MaTang: number; TenDiem: string; LoaiDiem: LoaiDiem; ToaDoX: number; ToaDoY: number
  MaPhong: number | null; MaSoPhong: string | null; TenPhong: string | null
}
export interface TangMatBang {
  MaTang: number; SoTang: number; TenTang: string; AnhMatBang: string | null; TiLe: string; Diem: DiemNut[]
}
export interface DoanDuong {
  MaDoan: number; MaDiemDau: number; MaDiemCuoi: number; LoaiDoan: 'DI_BO' | 'CAU_THANG' | 'THANG_MAY'
  DoDai: string; SoTang: number
}
export interface SoDoMatBang { Tang: TangMatBang[]; Doan: DoanDuong[] }
export interface DuongDi { TongGiay: number; Diem: number[]; Doan: number[] }

export interface Phong { MaPhong: number; MaSoPhong: string; TenPhong: string; LoaiPhong: string }
export interface EmailThu { TieuDe: string; NoiDung: string; ThoiGianTao: string }

export class LoiApi extends Error {
  status: number
  constructor(thongBao: string, status: number) {
    super(thongBao)
    this.status = status
  }
}

const KHOA_TOKEN = 'phongkham.token'
export const SU_KIEN_HET_PHIEN = 'phongkham:het-phien'

export function layToken(): string | null {
  try {
    return localStorage.getItem(KHOA_TOKEN)
  } catch {
    return null
  }
}

export function luuToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KHOA_TOKEN, token)
    else localStorage.removeItem(KHOA_TOKEN)
  } catch {
    /* trình duyệt chặn lưu trữ: phiên chỉ còn trong bộ nhớ đến khi tải lại trang */
  }
}

async function goi<T>(duong: string, phuongThuc: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', duLieu?: unknown): Promise<T> {
  const token = layToken()
  let res: Response
  try {
    res = await fetch(`/api${duong}`, {
      method: phuongThuc,
      headers: {
        // FormData (tải file): để trình duyệt tự đặt Content-Type kèm boundary
        ...(duLieu !== undefined && !(duLieu instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: duLieu instanceof FormData ? duLieu : duLieu !== undefined ? JSON.stringify(duLieu) : undefined,
    })
  } catch {
    throw new LoiApi('Không kết nối được máy chủ, vui lòng thử lại', 0)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // Backend trả lỗi dạng {"detail": "thông báo"}
    // Không có detail: thường là máy chủ chưa chạy/đang khởi động lại (proxy trả 5xx), không phải do dữ liệu
    const thongBao = typeof body.detail === 'string' ? body.detail
      : res.status >= 500 ? 'Máy chủ đang tạm ngừng hoặc gặp lỗi, vui lòng thử lại sau ít phút'
        : res.status === 404 ? 'Máy chủ không có chức năng này, hãy kiểm tra backend đã cập nhật chưa'
          : 'Dữ liệu gửi lên không hợp lệ'
    if (res.status === 401 && token) {
      luuToken(null)
      window.dispatchEvent(new Event(SU_KIEN_HET_PHIEN))
    }
    throw new LoiApi(thongBao, res.status)
  }
  return res.json() as Promise<T>
}

type GiaTriQuery = string | number | boolean | string[] | null | undefined

function query(thamSo: Record<string, GiaTriQuery>) {
  const q = new URLSearchParams()
  Object.entries(thamSo).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x))
    else if (v !== undefined && v !== null && v !== '' && v !== false) q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const api = {
  /** csdl chỉ có khi backend bật chế độ thử */
  cauHinh: () => goi<{ che_do_thu: boolean; csdl?: string }>('/cau-hinh'),
  thongTinLienHe: () => goi<ThongTinLienHe>('/thong-tin-phong-kham'),

  dangKy: (b: DangKyBenhNhan) => goi<{ ma_tk: number }>('/auth/dang-ky', 'POST', b),
  xacThucEmail: (dinh_danh: string, ma_otp: string) =>
    goi('/auth/xac-thuc-email', 'POST', { dinh_danh, ma_otp }),
  guiLaiMa: (dinh_danh: string) => goi('/auth/gui-lai-ma', 'POST', { dinh_danh }),
  dangNhap: (dinh_danh: string, mat_khau: string) =>
    goi<NguoiDung & { Token: string }>('/auth/dang-nhap', 'POST', { dinh_danh, mat_khau }),
  toi: () => goi<NguoiDung>('/auth/toi'),
  dangXuat: () => goi('/auth/dang-xuat', 'POST'),
  doiMatKhau: (mat_khau_cu: string, mat_khau_moi: string) =>
    goi('/auth/doi-mat-khau', 'POST', { mat_khau_cu, mat_khau_moi }),
  quenMatKhau: (dinh_danh: string) => goi('/auth/quen-mat-khau', 'POST', { dinh_danh }),
  datLaiMatKhau: (dinh_danh: string, ma_otp: string, mat_khau_moi: string) =>
    goi('/auth/dat-lai-mat-khau', 'POST', { dinh_danh, ma_otp, mat_khau_moi }),
  hopThu: (dinh_danh: string) => goi<EmailThu[]>(`/dev/hop-thu${query({ dinh_danh })}`),

  // Hồ sơ cá nhân
  hoSo: () => goi<HoSo>('/ho-so'),
  capNhatHoSo: (duLieu: CapNhatHoSo) => goi<HoSo>('/ho-so', 'PUT', duLieu),
  doiAnhDaiDien: (anh: File) => {
    const f = new FormData()
    f.append('anh', anh)
    return goi<{ AnhDaiDien: string }>('/ho-so/anh-dai-dien', 'POST', f)
  },
  xoaAnhDaiDien: () => goi('/ho-so/anh-dai-dien', 'DELETE'),

  dsTaiKhoan: (loc: { vai_tro?: string; trang_thai?: string; tu_khoa?: string }) =>
    goi<TaiKhoan[]>(`/tai-khoan${query(loc)}`),
  taoNhanVien: (b: NhanVienMoi) =>
    goi<{ ma_nv: number; mat_khau_tam: string }>('/tai-khoan/nhan-vien', 'POST', b),
  khoaTaiKhoan: (maTk: number, ly_do: string) => goi(`/tai-khoan/${maTk}/khoa`, 'POST', { ly_do }),
  moKhoaTaiKhoan: (maTk: number) => goi(`/tai-khoan/${maTk}/mo-khoa`, 'POST'),
  xoaTaiKhoan: (maTk: number) => goi(`/tai-khoan/${maTk}`, 'DELETE'),
  capLaiMatKhau: (maTk: number) =>
    goi<{ mat_khau_tam: string }>(`/tai-khoan/${maTk}/cap-lai-mat-khau`, 'POST'),
  ganVaiTro: (maTk: number, b: { vai_tro: VaiTroNhanVien; ma_ck?: number; ma_phong_phu_trach?: number }) =>
    goi(`/tai-khoan/${maTk}/vai-tro`, 'POST', b),
  chiTietTaiKhoan: (maTk: number) => goi<ChiTietTaiKhoan>(`/tai-khoan/${maTk}`),
  suaNhanVien: (maTk: number, b: Partial<Record<'HoTen' | 'NgaySinh' | 'GioiTinh' | 'SDT' | 'Email' | 'DiaChi'
    | 'HocHamHocVi' | 'GioiThieu', string | null> & { SoNamKinhNghiem: number | null }>) =>
    goi(`/tai-khoan/${maTk}/nhan-vien`, 'PUT', b),
  thuHoiPhien: (maTk: number) => goi<{ so_phien: number }>(`/tai-khoan/${maTk}/thu-hoi-phien`, 'POST'),
  bangPhanQuyen: () => goi<BangPhanQuyen>('/phan-quyen'),
  luuPhanQuyen: (vaiTro: string, quyen: string[]) => goi(`/phan-quyen/${vaiTro}`, 'PUT', { quyen }),
  luuQuyenTaiKhoan: (maTk: number, quyen: string[]) => goi(`/phan-quyen/tai-khoan/${maTk}`, 'PUT', { quyen }),
  nhatKyThaoTac: (loc: { tu_ngay?: string; den_ngay?: string; hanh_dong?: string; tu_khoa?: string }) =>
    goi<NhatKyThaoTac[]>(`/nhat-ky/thao-tac${query(loc)}`),
  nhatKyTruyCap: (loc: { tu_ngay?: string; den_ngay?: string; thao_tac?: string; tu_khoa?: string; ngoai_dieu_tri?: boolean }) =>
    goi<NhatKyTruyCap[]>(`/nhat-ky/truy-cap-ho-so${query(loc)}`),
  dsChuyenKhoa: () => goi<ChuyenKhoa[]>('/danh-muc/chuyen-khoa'),
  dsPhong: () => goi<Phong[]>('/danh-muc/phong'),

  // Đặt lịch: tra cứu chung
  dsBacSi: (ma_ck?: number) => goi<BacSi[]>(`/dat-lich/bac-si${query({ ma_ck })}`),
  ngayTrong: (loc: { ma_ck?: number; ma_bs?: number }) => goi<NgayTrong[]>(`/dat-lich/ngay-trong${query(loc)}`),
  khungGio: (loc: { ngay: string; ma_ck?: number; ma_bs?: number; vang_lai?: boolean }) =>
    goi<KhungGio[]>(`/dat-lich/khung-gio${query(loc)}`),

  // Bệnh nhân
  datLich: (b: { ma_kg: number; ly_do?: string; trieu_chung?: string }) =>
    goi<{ ma_lk: number }>('/lich-hen', 'POST', b),
  lichHenCuaToi: () => goi<LichHen[]>('/lich-hen/cua-toi'),
  huyLich: (maLk: number, ly_do: string) => goi(`/lich-hen/${maLk}/huy`, 'POST', { ly_do }),
  doiLich: (maLk: number, ma_kg: number) => goi(`/lich-hen/${maLk}/doi`, 'POST', { ma_kg }),
  dsDangKyCho: () => goi<DangKyCho[]>('/danh-sach-cho'),
  dangKyCho: (b: { ma_ck: number; ngay: string; buoi: DangKyCho['Buoi']; ma_bs?: number; ly_do?: string }) =>
    goi<{ ma_dkc: number }>('/danh-sach-cho', 'POST', b),
  nhanCho: (maDkc: number) => goi<{ ma_lk: number }>(`/danh-sach-cho/${maDkc}/nhan`, 'POST'),
  huyCho: (maDkc: number) => goi(`/danh-sach-cho/${maDkc}/huy`, 'POST'),

  // Lễ tân
  dsLichHen: (loc: { ngay?: string; trang_thai?: TrangThaiLichHen[]; ma_bs?: number; tu_khoa?: string }) =>
    goi<LichHen[]>(`/le-tan/lich-hen${query(loc)}`),
  soChoXacNhan: () => goi<{ so_luong: number }>('/le-tan/cho-xac-nhan'),
  datLichHo: (b: { ma_bn: number; ma_kg: number; kenh: 'DIEN_THOAI' | 'TIN_NHAN' | 'TAI_QUAY'; ly_do?: string; trieu_chung?: string }) =>
    goi<{ ma_lk: number }>('/le-tan/lich-hen', 'POST', b),
  duyetLich: (maLk: number) => goi(`/le-tan/lich-hen/${maLk}/duyet`, 'POST'),
  huyLichThay: (maLk: number, ly_do: string) => goi(`/le-tan/lich-hen/${maLk}/huy`, 'POST', { ly_do }),
  checkIn: (maLk: number, ma_the?: string) =>
    goi<{ so_thu_tu: number; TrangThaiBHYT: LichHen['TrangThaiBHYT']; MucHuong: number | null; ly_do_bhyt: string | null }>(
      `/le-tan/lich-hen/${maLk}/check-in`, 'POST', { ma_the }),
  vangMat: (maLk: number) => goi(`/le-tan/lich-hen/${maLk}/vang-mat`, 'POST'),
  timBenhNhan: (loc: { sdt?: string; cccd?: string }) => goi<BenhNhan[]>(`/le-tan/benh-nhan${query(loc)}`),
  themBenhNhan: (b: { ho_ten: string; sdt: string; ngay_sinh?: string; gioi_tinh?: 'NAM' | 'NU'; cccd?: string;
    dia_chi?: string; nguoi_lien_he?: string; sdt_nguoi_lien_he?: string }) =>
    goi<{ ma_bn: number }>('/le-tan/benh-nhan', 'POST', b),
  theBhyt: (maBn: number) => goi<TheBHYT[]>(`/le-tan/benh-nhan/${maBn}/the-bhyt`),

  // Bác sĩ
  lichKham: (ngay?: string, ma_bs?: number) => goi<LichHen[]>(`/bac-si/lich-kham${query({ ngay, ma_bs })}`),
  hangChoKham: () => goi<LuotChoKham[]>('/kham/hang-cho'),
  goiKham: (maLk: number) => goi(`/kham/${maLk}/goi`, 'POST'),
  boQuaLuot: (maLk: number) => goi(`/kham/${maLk}/bo-qua`, 'POST'),
  chiTietKham: (maLk: number) => goi<LuotKhamChiTiet>(`/kham/${maLk}`),
  lanKhamTruoc: (maLk: number, maLkCu: number) => goi<LanKham>(`/kham/${maLk}/lan-truoc/${maLkCu}`),
  luuHoSoBenhAn: (maLk: number, b: LuuHoSoBenhAn) => goi(`/kham/${maLk}/ho-so`, 'PUT', b),
  chiDinhCls: (maLk: number, ma_dv: number[], yeu_cau?: string) =>
    goi<{ ma_pcd: number[] }>(`/kham/${maLk}/chi-dinh`, 'POST', { ma_dv, yeu_cau }),
  huyChiDinh: (maPcd: number, ly_do: string) => goi(`/kham/chi-dinh/${maPcd}/huy`, 'POST', { ly_do }),
  hoanTatKham: (maLk: number) => goi(`/kham/${maLk}/hoan-tat`, 'POST'),
  ghiChuHoSo: (maLk: number, noi_dung: string) => goi(`/kham/${maLk}/ghi-chu`, 'POST', { noi_dung }),
  phanHoiTomTat: (maLk: number, phan_hoi: 'HUU_ICH' | 'CHUA_CHINH_XAC') =>
    goi(`/kham/${maLk}/tom-tat/phan-hoi`, 'POST', { phan_hoi }),
  timIcd: (tu_khoa?: string) => goi<{ MaICD: string; TenBenh: string }[]>(`/kham/danh-muc/icd${query({ tu_khoa })}`),
  dsThuoc: () => goi<ThuocDanhMuc[]>('/kham/danh-muc/thuoc'),
  dsDichVuCls: () => goi<DichVuCls[]>('/kham/danh-muc/dich-vu-cls'),

  // Hồ sơ sức khỏe của bệnh nhân
  hoSoSucKhoe: () => goi<DongHoSoSucKhoe[]>('/ho-so-suc-khoe'),
  chiTietHoSoSucKhoe: (maLk: number) => goi<LanKham>(`/ho-so-suc-khoe/${maLk}`),

  // Thu tạm thu cận lâm sàng
  dsChoTamThu: (tu_khoa?: string) => goi<LuotChoTamThu[]>(`/thu-ngan/tam-thu${query({ tu_khoa })}`),
  soChoTamThu: () => goi<{ so_luong: number }>('/thu-ngan/tam-thu/so-cho'),
  tamThu: (b: { ma_lk: number; ma_pcd: number[]; hinh_thuc: HinhThucThu; tien_khach_dua?: number | null }) =>
    goi<BienLai>('/thu-ngan/tam-thu', 'POST', b),
  dsBienLai: (ngay?: string) => goi<DongBienLai[]>(`/thu-ngan/bien-lai${query({ ngay })}`),
  bienLai: (maBl: number) => goi<BienLai>(`/thu-ngan/bien-lai/${maBl}`),
  taiKhoanNhan: () => goi<Pick<ThongTinPhongKham, 'MaNganHang' | 'SoTaiKhoan' | 'TenTaiKhoan'>>('/thu-ngan/tai-khoan-nhan'),

  // Cận lâm sàng
  hangChoCls: () => goi<HangChoCls>('/cls/hang-cho'),
  soChoCls: () => goi<{ so_luong: number }>('/cls/hang-cho/so-cho'),
  chiTietPhieuCls: (maPcd: number) => goi<ChiTietPhieuCls>(`/cls/phieu/${maPcd}`),
  batDauCls: (maPcd: number) => goi(`/cls/phieu/${maPcd}/bat-dau`, 'POST'),
  hoanCls: (maPcd: number, ly_do: string) => goi(`/cls/phieu/${maPcd}/hoan`, 'POST', { ly_do }),
  traKetQuaCls: (maPcd: number, b: NhapKetQuaCls) => goi<{ ma_kq: number }>(`/cls/phieu/${maPcd}/ket-qua`, 'POST', b),
  capNhatKetQuaCls: (maPcd: number, b: NhapKetQuaCls) => goi(`/cls/phieu/${maPcd}/ket-qua`, 'PUT', b),
  themTepCls: (maPcd: number, tep: File, mo_ta?: string) => {
    const f = new FormData()
    f.append('tep', tep)
    if (mo_ta) f.append('mo_ta', mo_ta)
    return goi<TepKetQua>(`/cls/phieu/${maPcd}/tep`, 'POST', f)
  },
  xoaTepCls: (maTep: number) => goi(`/cls/tep/${maTep}`, 'DELETE'),

  // Hóa đơn, thanh toán MoMo
  dsHoaDon: (loc: { trang_thai?: 'CHUA_THANH_TOAN' | 'DA_THANH_TOAN' | 'DA_HUY'; ngay?: string; tu_khoa?: string }) =>
    goi<DongHoaDon[]>(`/thanh-toan/hoa-don${query(loc)}`),
  soChoThanhToan: () => goi<{ so_luong: number }>('/thanh-toan/hoa-don/so-cho'),
  hoaDon: (maHd: number) => goi<HoaDon>(`/thanh-toan/hoa-don/${maHd}`),
  thuHoaDon: (maHd: number, b: { hinh_thuc: HinhThucThu; tien_khach_dua?: number | null }) =>
    goi<HoaDon>(`/thanh-toan/hoa-don/${maHd}/thu`, 'POST', b),
  momoTaiQuay: (maHd: number) => goi<LenhMoMo>(`/thanh-toan/hoa-don/${maHd}/momo`, 'POST'),
  hoaDonCuaToi: () => goi<DongHoaDon[]>('/thanh-toan/cua-toi'),
  hoaDonCuaToiChiTiet: (maHd: number) => goi<HoaDon>(`/thanh-toan/cua-toi/${maHd}`),
  momoCuaToi: (maHd: number) => goi<LenhMoMo>(`/thanh-toan/cua-toi/${maHd}/momo`, 'POST'),
  trangThaiMoMo: (maDon: string) => goi<GiaoDichMoMo>(`/thanh-toan/momo/${encodeURIComponent(maDon)}`),
  ketQuaMoMo: (thamSo: Record<string, string>) => goi<GiaoDichMoMo>('/thanh-toan/momo/ket-qua', 'POST', thamSo),
  huyHoaDon: (maHd: number, ly_do: string) => goi<HoaDon>(`/thanh-toan/hoa-don/${maHd}/huy`, 'POST', { ly_do }),

  // Hoàn tiền
  dsPhieuHoan: (loc: { trang_thai?: string[]; tu_khoa?: string }) => goi<DongPhieuHoan[]>(`/hoan-tien${query(loc)}`),
  soPhieuHoanCho: () => goi<{ so_luong: number }>('/hoan-tien/so-cho'),
  phieuHoan: (ma: number) => goi<PhieuHoan>(`/hoan-tien/${ma}`),
  lapPhieuHoan: (b: { ma_bl?: number; ma_hd?: number; ly_do: LyDoHoan; ghi_chu?: string; so_tien: number }) =>
    goi<{ ma_pht: number }>('/hoan-tien', 'POST', b),
  duyetPhieuHoan: (ma: number, dong_y: boolean, ly_do?: string) => goi(`/hoan-tien/${ma}/duyet`, 'POST', { dong_y, ly_do }),
  chiPhieuHoan: (ma: number, b: { hinh_thuc: HinhThucThu; ngan_hang?: string; so_tai_khoan?: string; ten_tai_khoan?: string }) =>
    goi<PhieuHoan>(`/hoan-tien/${ma}/hoan`, 'POST', b),

  // Đánh giá sau khám, báo cáo đánh giá
  danhGiaCuaToi: () => goi<{ ChoDanhGia: LuotChoDanhGia[]; DaDanhGia: DanhGia[] }>('/danh-gia/cua-toi'),
  bieuMauDanhGia: (maLk: number) => goi<BieuMauDanhGia>(`/danh-gia/luot/${maLk}`),
  guiDanhGia: (maLk: number, b: { diem_bac_si: number; nhan_xet_bac_si?: string; nhan_xet_dich_vu?: string;
    diem: Partial<Record<CotTieuChi, number>> }, anh: File[]) => {
    const f = new FormData()
    f.append('diem_bac_si', String(b.diem_bac_si))
    if (b.nhan_xet_bac_si) f.append('nhan_xet_bac_si', b.nhan_xet_bac_si)
    if (b.nhan_xet_dich_vu) f.append('nhan_xet_dich_vu', b.nhan_xet_dich_vu)
    Object.entries(b.diem).forEach(([cot, d]) => { if (d) f.append(cot, String(d)) })
    anh.forEach((a) => f.append('anh', a))
    return goi<{ ma_dg: number }>(`/danh-gia/luot/${maLk}`, 'POST', f)
  },
  baoCaoDanhGia: (loc: { tu_ngay: string; den_ngay: string; ma_ck?: number; ma_bs?: number }) =>
    goi<BaoCaoDanhGia>(`/danh-gia/bao-cao${query(loc)}`),
  dsDanhGia: (loc: { tu_ngay: string; den_ngay: string; ma_ck?: number; ma_bs?: number; chu_de?: string; cam_xuc?: CamXuc }) =>
    goi<DanhGia[]>(`/danh-gia${query(loc)}`),
  phanTichDanhGia: () => goi<{ so_luong: number }>('/danh-gia/phan-tich', 'POST'),

  // Góp ý, khiếu nại
  guiGopY: (b: { loai: LoaiGopY; chu_de: string; ma_lk?: number; noi_dung: string }, tep: File[]) => {
    const f = new FormData()
    f.append('loai', b.loai)
    f.append('chu_de', b.chu_de)
    if (b.ma_lk) f.append('ma_lk', String(b.ma_lk))
    f.append('noi_dung', b.noi_dung)
    tep.forEach((t) => f.append('tep', t))
    return goi<{ ma_phieu: number; ma_so_phieu: string; han_phan_hoi: string }>('/gop-y', 'POST', f)
  },
  gopYCuaToi: () => goi<DongGopY[]>('/gop-y/cua-toi'),
  luotKhamGopY: () =>
    goi<{ MaLK: number; MaLichHen: string; NgayKham: string; BacSi: string; TenCK: string | null }[]>('/gop-y/cua-toi/luot-kham'),
  phieuGopYCuaToi: (ma: number) => goi<PhieuGopY>(`/gop-y/cua-toi/${ma}`),
  boSungGopY: (ma: number, noi_dung: string) => goi(`/gop-y/cua-toi/${ma}/bo-sung`, 'POST', { noi_dung }),
  haiLongGopY: (ma: number) => goi(`/gop-y/cua-toi/${ma}/hai-long`, 'POST'),
  dsGopY: (loc: { loai?: LoaiGopY; trang_thai?: TrangThaiGopY[]; chu_de?: string; muc_do?: MucDoNghiemTrong; qua_han?: boolean;
    tu_khoa?: string }) => goi<DongGopY[]>(`/gop-y${query(loc)}`),
  soGopYCho: () => goi<{ so_luong: number; qua_han: number }>('/gop-y/so-cho'),
  chuDeGopY: () => goi<string[]>('/gop-y/chu-de'),
  phieuGopY: (ma: number) => goi<PhieuGopY>(`/gop-y/${ma}`),
  tiepNhanGopY: (ma: number) => goi(`/gop-y/${ma}/tiep-nhan`, 'POST'),
  phanHoiGopY: (ma: number, noi_dung: string) => goi(`/gop-y/${ma}/phan-hoi`, 'POST', { noi_dung }),
  ghiChuGopY: (ma: number, noi_dung: string) => goi(`/gop-y/${ma}/ghi-chu`, 'POST', { noi_dung }),

  // Thống kê
  tongQuan: () => goi<TongQuan>('/thong-ke/tong-quan'),
  thongKe: (loai: LoaiThongKe, loc: { tu_ngay: string; den_ngay: string; ma_ck?: number; ma_bs?: number; kenh?: string }) =>
    goi<KetQuaThongKe>(`/thong-ke/${loai}${query(loc)}`),

  // Lịch làm việc
  dsCa: (loc: { tu_ngay: string; den_ngay: string; ma_bs?: number; ma_ck?: number }) =>
    goi<CaLamViec[]>(`/lich-lam-viec/ca${query(loc)}`),
  chiTietCa: (maCa: number) => goi<ChiTietCa>(`/lich-lam-viec/ca/${maCa}`),
  phongChoBacSi: (loc: { ma_bs: number; ngay?: string; ca_lam?: CaLam }) =>
    goi<PhongKham[]>(`/lich-lam-viec/phong${query(loc)}`),
  taoCa: (b: { ma_bs: number; ma_phong: number; ca_lam: CaLam[]; tu_ngay: string; den_ngay: string; thu: number[];
    thoi_luong: number }) => goi<KetQuaTaoCa>('/lich-lam-viec/ca', 'POST', b),
  doiPhongCa: (maCa: number, ma_phong: number) => goi(`/lich-lam-viec/ca/${maCa}/phong`, 'PUT', { ma_phong }),
  huyCa: (maCa: number, ly_do: string) =>
    goi<{ so_lich_huy: number; da_xoa: boolean }>(`/lich-lam-viec/ca/${maCa}/huy`, 'POST', { ly_do }),
  khoaKhungGio: (ma_kg: number[], ly_do: string) =>
    goi<{ so_luong: number }>('/lich-lam-viec/khung-gio/khoa', 'POST', { ma_kg, ly_do }),
  moKhungGio: (ma_kg: number[]) => goi<{ so_luong: number }>('/lich-lam-viec/khung-gio/mo', 'POST', { ma_kg }),
  dangKyCaCuaToi: () => goi<DangKyCa[]>('/lich-lam-viec/dang-ky/cua-toi'),
  dangKyCa: (b: { ngay: string; ca_lam: CaLam; ghi_chu?: string }) =>
    goi<{ ma_dk: number }>('/lich-lam-viec/dang-ky', 'POST', b),
  huyDangKyCa: (maDk: number) => goi(`/lich-lam-viec/dang-ky/${maDk}/huy`, 'POST'),
  dsDangKyCa: (loc: { trang_thai?: TrangThaiDangKyCa[]; ma_bs?: number }) =>
    goi<DangKyCa[]>(`/lich-lam-viec/dang-ky${query(loc)}`),
  soDangKyChoDuyet: () => goi<{ so_luong: number }>('/lich-lam-viec/dang-ky/cho-duyet'),
  duyetDangKyCa: (maDk: number, b: { ma_phong: number; thoi_luong: number }) =>
    goi<{ ma_ca: number }>(`/lich-lam-viec/dang-ky/${maDk}/duyet`, 'POST', b),
  tuChoiDangKyCa: (maDk: number, ly_do: string) => goi(`/lich-lam-viec/dang-ky/${maDk}/tu-choi`, 'POST', { ly_do }),

  // Quản trị danh mục (gói 3)
  qlChuyenKhoa: () => goi<ChuyenKhoaQuanLy[]>('/quan-ly/chuyen-khoa'),
  themChuyenKhoa: (b: { ten_ck: string; mo_ta?: string | null; phi_kham: number }) =>
    goi<{ ma_ck: number }>('/quan-ly/chuyen-khoa', 'POST', b),
  suaChuyenKhoa: (ma: number, b: { ten_ck: string; mo_ta?: string | null; phi_kham: number }) =>
    goi(`/quan-ly/chuyen-khoa/${ma}`, 'PUT', b),
  doiAnhChuyenKhoa: (ma: number, anh: File) => {
    const f = new FormData()
    f.append('anh', anh)
    return goi<{ AnhDaiDien: string }>(`/quan-ly/chuyen-khoa/${ma}/anh`, 'POST', f)
  },
  dsTang: () => goi<{ MaTang: number; SoTang: number; TenTang: string }[]>('/quan-ly/tang'),
  qlPhong: () => goi<PhongQuanLy[]>('/quan-ly/phong'),
  themPhong: (b: { ma_so_phong: string; ten_phong: string; ma_tang: number; loai_phong: LoaiPhong; ma_ck?: number | null }) =>
    goi<{ ma_phong: number }>('/quan-ly/phong', 'POST', b),
  suaPhong: (ma: number, b: { ma_so_phong: string; ten_phong: string; ma_tang: number; loai_phong: LoaiPhong; ma_ck?: number | null }) =>
    goi(`/quan-ly/phong/${ma}`, 'PUT', b),
  qlDichVu: () => goi<DichVuQuanLy[]>('/quan-ly/dich-vu'),
  themDichVu: (b: Record<string, unknown>) => goi<{ ma_dv: number }>('/quan-ly/dich-vu', 'POST', b),
  suaDichVu: (ma: number, b: Record<string, unknown>) => goi(`/quan-ly/dich-vu/${ma}`, 'PUT', b),
  luuRangBuoc: (ma: number, ma_dv_truoc: number[]) => goi(`/quan-ly/dich-vu/${ma}/rang-buoc`, 'PUT', { ma_dv_truoc }),
  dsMauChiSo: (maDv: number) => goi<MauChiSo[]>(`/quan-ly/dich-vu/${maDv}/chi-so`),
  themChiSo: (maDv: number, b: Record<string, unknown>) => goi(`/quan-ly/dich-vu/${maDv}/chi-so`, 'POST', b),
  suaChiSo: (ma: number, b: Record<string, unknown>) => goi(`/quan-ly/chi-so/${ma}`, 'PUT', b),
  qlThuoc: () => goi<ThuocQuanLy[]>('/quan-ly/thuoc'),
  themThuoc: (b: Record<string, unknown>) => goi<{ ma_thuoc: number }>('/quan-ly/thuoc', 'POST', b),
  suaThuoc: (ma: number, b: Record<string, unknown>) => goi(`/quan-ly/thuoc/${ma}`, 'PUT', b),
  qlIcd: (tu_khoa?: string) => goi<BenhIcd[]>(`/quan-ly/icd${query({ tu_khoa })}`),
  themIcd: (ma_icd: string, ten_benh: string) => goi('/quan-ly/icd', 'POST', { ma_icd, ten_benh }),
  suaIcd: (ma: string, ten_benh: string) => goi(`/quan-ly/icd/${encodeURIComponent(ma)}`, 'PUT', { ten_benh }),
  /** Ngừng / mở lại một mục danh mục. */
  doiTrangThaiDanhMuc: (loai: 'chuyen-khoa' | 'phong' | 'dich-vu' | 'chi-so' | 'thuoc' | 'icd', ma: number | string,
    hoat_dong: boolean) => goi(`/quan-ly/${loai}/${encodeURIComponent(ma)}/trang-thai`, 'POST', { hoat_dong }),
  thongTinPhongKham: () => goi<ThongTinPhongKham>('/quan-ly/thong-tin'),
  luuThongTinPhongKham: (b: Record<string, unknown>) => goi('/quan-ly/thong-tin', 'PUT', b),

  // Sơ đồ mặt bằng
  soDoMatBang: () => goi<SoDoMatBang>('/quan-ly/mat-bang'),
  themTang: (b: { so_tang: number; ten_tang: string; ti_le: number }) =>
    goi<{ ma_tang: number }>('/quan-ly/mat-bang/tang', 'POST', b),
  suaTang: (ma: number, b: { so_tang: number; ten_tang: string; ti_le: number }) => goi(`/quan-ly/mat-bang/tang/${ma}`, 'PUT', b),
  xoaTang: (ma: number) => goi(`/quan-ly/mat-bang/tang/${ma}`, 'DELETE'),
  doiAnhTang: (ma: number, anh: File) => {
    const f = new FormData()
    f.append('anh', anh)
    return goi<{ AnhMatBang: string }>(`/quan-ly/mat-bang/tang/${ma}/anh`, 'POST', f)
  },
  themDiem: (b: { ma_tang: number; ten_diem?: string; loai_diem: LoaiDiem; x: number; y: number; ma_phong?: number | null }) =>
    goi<{ ma_diem: number }>('/quan-ly/mat-bang/diem', 'POST', b),
  suaDiem: (ma: number, b: { ten_diem?: string; loai_diem: LoaiDiem; x: number; y: number; ma_phong?: number | null }) =>
    goi(`/quan-ly/mat-bang/diem/${ma}`, 'PUT', b),
  xoaDiem: (ma: number) => goi(`/quan-ly/mat-bang/diem/${ma}`, 'DELETE'),
  themDoan: (b: { ma_diem_dau: number; ma_diem_cuoi: number; loai_doan?: DoanDuong['LoaiDoan']; do_dai?: number }) =>
    goi<{ ma_doan: number }>('/quan-ly/mat-bang/doan', 'POST', b),
  suaDoDai: (ma: number, do_dai: number) => goi(`/quan-ly/mat-bang/doan/${ma}`, 'PUT', { do_dai }),
  xoaDoan: (ma: number) => goi(`/quan-ly/mat-bang/doan/${ma}`, 'DELETE'),
  chiDuong: (tu: number, den: number, tranh_cau_thang?: boolean) =>
    goi<DuongDi>(`/quan-ly/mat-bang/chi-duong${query({ tu, den, tranh_cau_thang })}`),

  // Thông báo
  thongBao: () => goi<{ chua_doc: number; ds: ThongBao[] }>('/thong-bao'),
  docHetThongBao: () => goi('/thong-bao/doc-het', 'POST'),
  daDocThongBao: (maTb: number) => goi(`/thong-bao/${maTb}/da-doc`, 'POST'),
}
