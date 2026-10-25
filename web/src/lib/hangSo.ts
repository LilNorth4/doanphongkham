import type { FormRule } from 'antd'
import dayjs from 'dayjs'
import type {
  CaLam, DangKyCho, HinhThucHoaDon, KenhDat, LichHen, LoaiDichVu, LoaiDiem, LoaiPhong, PhieuChiDinh, TrangThaiDangKyCa, TrangThaiKhungGio, TrangThaiLichHen,
  TrangThaiPhieuCls, TrangThaiTaiKhoan, VaiTro, VaiTroNhanVien, CamXuc, CotTieuChi, LoaiGopY, MucDoNghiemTrong, TrangThaiGopY,
} from '@/lib/api'

export const TEN_PHONG_KHAM = 'Phòng khám Đa khoa Việt Bắc'

export const TEN_VAI_TRO: Record<VaiTro, string> = {
  BENH_NHAN: 'Bệnh nhân',
  LE_TAN: 'Lễ tân',
  BAC_SI: 'Bác sĩ',
  BS_XET_NGHIEM: 'Bác sĩ xét nghiệm',
  BS_CDHA: 'Bác sĩ chẩn đoán hình ảnh',
  BS_NOI_SOI: 'Bác sĩ nội soi',
  QUAN_TRI: 'Quản trị viên',
}

export const MAU_VAI_TRO: Record<VaiTro, string> = {
  BENH_NHAN: 'green',
  LE_TAN: 'cyan',
  BAC_SI: 'blue',
  BS_XET_NGHIEM: 'purple',
  BS_CDHA: 'geekblue',
  BS_NOI_SOI: 'magenta',
  QUAN_TRI: 'gold',
}

export const VAI_TRO_NHAN_VIEN: VaiTroNhanVien[] = ['LE_TAN', 'BAC_SI', 'BS_XET_NGHIEM', 'BS_CDHA', 'BS_NOI_SOI', 'QUAN_TRI']

// BR11: bác sĩ cận lâm sàng phụ trách đúng loại phòng (khớp PHONG_CUA_VAI_TRO trong QuanLyTaiKhoanService)
export const PHONG_CUA_VAI_TRO: Partial<Record<VaiTroNhanVien, string[]>> = {
  BS_XET_NGHIEM: ['XET_NGHIEM'],
  BS_CDHA: ['X_QUANG', 'SIEU_AM'],
  BS_NOI_SOI: ['NOI_SOI'],
}

export const TRANG_THAI: Record<TrangThaiTaiKhoan, { ten: string; mau: string }> = {
  HOAT_DONG: { ten: 'Hoạt động', mau: 'success' },
  CHUA_KICH_HOAT: { ten: 'Chưa kích hoạt', mau: 'default' },
  BI_KHOA: { ten: 'Bị khóa', mau: 'error' },
}

// Quy tắc kiểm tra phía giao diện, trùng với kiểm tra ở backend (ChuanHoa) để báo lỗi sớm
export const quyTac = {
  batBuoc: (ten: string): FormRule => ({ required: true, whitespace: true, message: `Vui lòng nhập ${ten}` }),
  /** Thời lượng khung giờ: 5-60 phút, theo bước 5 phút (khớp kiểm tra ở backend). */
  thoiLuongKhung: {
    validator: (_, v?: number) => v == null || (v >= 5 && v <= 60 && v % 5 === 0) ? Promise.resolve()
      : Promise.reject(new Error('Thời lượng từ 5 đến 60 phút, theo bước 5 phút')),
  } as FormRule,
  email: { type: 'email', message: 'Email không hợp lệ' } as FormRule,
  sdt: {
    validator: (_: unknown, v?: string) =>
      !v || /^0\d{9}$/.test(chuanHoaSdt(v))
        ? Promise.resolve()
        : Promise.reject(new Error('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0')),
  } as FormRule,
  cccd: { pattern: /^\d{12}$/, message: 'Số CCCD gồm 12 chữ số' } as FormRule,
  dinhDanh: {
    validator: (_: unknown, v?: string) => {
      const s = (v ?? '').trim().replace(/[\s.-]/g, '')
      return !s || s.includes('@') || /^(0|\+84)\d{9}$/.test(s)
        ? Promise.resolve()
        : Promise.reject(new Error('Vui lòng nhập email hoặc số điện thoại hợp lệ'))
    },
  } as FormRule,
  // BR15: tối thiểu 8 ký tự, có cả chữ và số
  matKhau: {
    validator: (_: unknown, v?: string) =>
      !v || (v.length >= 8 && /\p{L}/u.test(v) && /\d/.test(v))
        ? Promise.resolve()
        : Promise.reject(new Error('Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số')),
  } as FormRule,
  nhapLai: (truong: string): FormRule => ({ getFieldValue }) => ({
    validator: (_, v) =>
      !v || v === getFieldValue(truong)
        ? Promise.resolve()
        : Promise.reject(new Error('Mật khẩu nhập lại không khớp')),
  }),
}

export function chuanHoaSdt(s: string) {
  return s.replace(/[\s.-]/g, '')
}

// ---------- Lịch hẹn ----------
// Trang quản lý lịch hẹn phát sự kiện này để badge trên menu cập nhật ngay
export const SU_KIEN_SO_CHO = 'phongkham:so-lich-cho'

export const TRANG_THAI_LICH_HEN: Record<TrangThaiLichHen, { ten: string; mau: string }> = {
  CHO_XAC_NHAN: { ten: 'Chờ xác nhận', mau: 'gold' },
  DA_XAC_NHAN: { ten: 'Đã xác nhận', mau: 'blue' },
  DA_CHECK_IN: { ten: 'Đã check-in', mau: 'cyan' },
  DANG_KHAM: { ten: 'Đang khám', mau: 'geekblue' },
  CHO_CLS: { ten: 'Chờ cận lâm sàng', mau: 'purple' },
  DA_CO_KET_QUA: { ten: 'Đã có kết quả', mau: 'magenta' },
  HOAN_THANH: { ten: 'Hoàn thành', mau: 'green' },
  DA_HUY: { ten: 'Đã hủy', mau: 'default' },
  VANG_MAT: { ten: 'Vắng mặt', mau: 'red' },
}

// Lịch còn hiệu lực, tính vào giới hạn 3 lịch hẹn (BR03)
export const LICH_CON_HIEU_LUC: TrangThaiLichHen[] = [
  'CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DA_CHECK_IN', 'DANG_KHAM', 'CHO_CLS', 'DA_CO_KET_QUA',
]

export const TEN_KENH: Record<KenhDat, string> = {
  UNG_DUNG: 'Ứng dụng',
  WEB: 'Website',
  DIEN_THOAI: 'Điện thoại',
  TIN_NHAN: 'Tin nhắn',
  TAI_QUAY: 'Tại quầy',
}

export const TEN_BUOI: Record<DangKyCho['Buoi'], string> = { SANG: 'Buổi sáng', CHIEU: 'Buổi chiều', CA_NGAY: 'Cả ngày' }

/** Thời điểm bắt đầu khám của lịch hẹn. */
export function gioKham(lh: Pick<LichHen, 'NgayKham' | 'GioBatDau'>) {
  return dayjs(`${lh.NgayKham}T${lh.GioBatDau}`)
}

/** Thời gian được hủy lịch vừa đặt mà không tính BR04, khớp DatLichService.PHUT_HUY_SAU_KHI_DAT. */
export const PHUT_HUY_SAU_KHI_DAT = 15

/**
 * BR04: hủy/đổi trước giờ khám ít nhất 4 giờ; đổi tối đa 2 lần.
 * Riêng hủy: trong 15 phút sau khi đặt vẫn hủy được nếu chưa tới giờ khám (sửa khi chọn nhầm).
 */
export function coTheHuyDoi(lh: LichHen) {
  const conHieuLuc = lh.TrangThai === 'CHO_XAC_NHAN' || lh.TrangThai === 'DA_XAC_NHAN'
  const du4Gio = gioKham(lh).diff(dayjs(), 'minute') >= 240
  const vuaDat = gioKham(lh).isAfter(dayjs()) && dayjs().diff(dayjs(lh.NgayTao), 'minute', true) <= PHUT_HUY_SAU_KHI_DAT
  return { huy: conHieuLuc && (du4Gio || vuaDat), doi: conHieuLuc && du4Gio && lh.SoLanDoi < 2, du4Gio, vuaDat, conHieuLuc }
}

export function tuoi(ngaySinh: string | null) {
  return ngaySinh ? dayjs().diff(dayjs(ngaySinh), 'year') : null
}

export function tien(soTien: string | number) {
  return `${Number(soTien).toLocaleString('vi-VN')} đ`
}

export function thuNgay(ngay: string | dayjs.Dayjs) {
  const d = dayjs(ngay)
  const thu = d.day() === 0 ? 'Chủ nhật' : `Thứ ${d.day() + 1}`
  return `${thu}, ${d.format('DD/MM/YYYY')}`
}

// ---------- Lịch làm việc (gói 4) ----------
// Khớp LichLamViecService.GIO_CA
export const CA_LAM: Record<CaLam, { ten: string; batDau: string; ketThuc: string }> = {
  SANG: { ten: 'Ca sáng', batDau: '07:00', ketThuc: '11:30' },
  CHIEU: { ten: 'Ca chiều', batDau: '13:30', ketThuc: '17:00' },
}

export const DS_CA_LAM: CaLam[] = ['SANG', 'CHIEU']

/** Số khung giờ sinh ra cho một ca với thời lượng (phút), khớp LichLamViecService.taoMotCa. */
export function soKhungGio(ca: CaLam, thoiLuong: number) {
  const phut = (g: string) => Number(g.slice(0, 2)) * 60 + Number(g.slice(3))
  return thoiLuong > 0 ? Math.floor((phut(CA_LAM[ca].ketThuc) - phut(CA_LAM[ca].batDau)) / thoiLuong) : 0
}

/** Ca chưa bắt đầu / chưa kết thúc tính theo giờ máy người dùng. */
export function moc(ngay: string, gio: string) {
  return dayjs(`${ngay}T${gio}`)
}

export const TRANG_THAI_KHUNG_GIO: Record<TrangThaiKhungGio, { ten: string; mau: string }> = {
  TRONG: { ten: 'Trống', mau: 'green' },
  DA_DAT: { ten: 'Đã đặt', mau: 'blue' },
  DANG_GIU_CHO: { ten: 'Đang giữ chỗ', mau: 'gold' },
  DA_KHOA: { ten: 'Đã khóa', mau: 'default' },
}

export const TRANG_THAI_DANG_KY_CA: Record<TrangThaiDangKyCa, { ten: string; mau: string }> = {
  CHO_DUYET: { ten: 'Chờ duyệt', mau: 'gold' },
  DA_DUYET: { ten: 'Đã duyệt', mau: 'green' },
  TU_CHOI: { ten: 'Từ chối', mau: 'red' },
  DA_HUY: { ten: 'Đã hủy', mau: 'default' },
}

// Trang duyệt đăng ký ca phát sự kiện này để badge trên menu cập nhật ngay
export const SU_KIEN_SO_DANG_KY_CA = 'phongkham:so-dang-ky-ca'
// Trang thu tạm thu và trang hàng chờ CLS phát sự kiện để badge trên menu cập nhật ngay
export const SU_KIEN_SO_TAM_THU = 'phongkham:so-tam-thu'
export const SU_KIEN_SO_CLS = 'phongkham:so-cls'

export const TEN_HINH_THUC: Record<HinhThucHoaDon, string> = { TIEN_MAT: 'Tiền mặt', CHUYEN_KHOAN: 'Chuyển khoản', MOMO: 'Ví MoMo' }
export const SU_KIEN_SO_HOA_DON = 'phongkham:so-hoa-don'
export const TEN_LOAI_MUC: Record<'KHAM' | 'CLS' | 'THUOC', string> = { KHAM: 'Khám bệnh', CLS: 'Cận lâm sàng', THUOC: 'Thuốc' }

/** Ca đã hủy nhưng còn lịch sử lịch hẹn: giữ lại, mọi khung giờ bị khóa. */
export function caDaNghi(ca: { TongKhung: number; SoKhoa: number }) {
  return ca.TongKhung > 0 && ca.SoKhoa === ca.TongKhung
}

// ---------- Nhật ký (gói 2) ----------
export const TEN_HANH_DONG: Record<string, { ten: string; mau: string }> = {
  TAO_TAI_KHOAN: { ten: 'Tạo tài khoản', mau: 'green' },
  GAN_VAI_TRO: { ten: 'Gán vai trò', mau: 'blue' },
  CAP_NHAT_NHAN_VIEN: { ten: 'Cập nhật nhân viên', mau: 'cyan' },
  CAP_NHAT_HO_SO: { ten: 'Tự cập nhật hồ sơ', mau: 'cyan' },
  KHOA_TAI_KHOAN: { ten: 'Khóa tài khoản', mau: 'red' },
  MO_KHOA_TAI_KHOAN: { ten: 'Mở khóa', mau: 'lime' },
  KHOA_TAM_THOI: { ten: 'Khóa tạm (sai mật khẩu)', mau: 'orange' },
  CAP_LAI_MAT_KHAU: { ten: 'Cấp lại mật khẩu', mau: 'gold' },
  THU_HOI_PHIEN: { ten: 'Thu hồi phiên', mau: 'purple' },
  XOA_TAI_KHOAN: { ten: 'Xóa tài khoản', mau: 'magenta' },
  CAP_NHAT_QUYEN: { ten: 'Cập nhật phân quyền', mau: 'geekblue' },
  HUY_HOA_DON: { ten: 'Hủy hóa đơn', mau: 'volcano' },
  TAO_CA_LAM_VIEC: { ten: 'Tạo ca làm việc', mau: 'green' },
  DOI_PHONG_CA_LAM_VIEC: { ten: 'Đổi phòng ca làm việc', mau: 'cyan' },
  HUY_CA_LAM_VIEC: { ten: 'Hủy ca làm việc', mau: 'red' },
  DUYET_DANG_KY_CA: { ten: 'Duyệt đăng ký ca', mau: 'blue' },
  TU_CHOI_DANG_KY_CA: { ten: 'Từ chối đăng ký ca', mau: 'orange' },
  DAT_LICH_HO: { ten: 'Đặt lịch hộ', mau: 'green' },
  DUYET_LICH_HEN: { ten: 'Duyệt lịch hẹn', mau: 'blue' },
  HUY_LICH_HEN: { ten: 'Hủy/từ chối lịch hẹn', mau: 'red' },
  CHECK_IN: { ten: 'Check-in', mau: 'cyan' },
  DANH_DAU_VANG_MAT: { ten: 'Đánh dấu vắng mặt', mau: 'orange' },
  TAO_HO_SO_BENH_NHAN: { ten: 'Tạo hồ sơ bệnh nhân', mau: 'green' },
  BO_QUA_LUOT_KHAM: { ten: 'Bỏ qua lượt khám', mau: 'orange' },
  CHI_DINH_CLS: { ten: 'Chỉ định cận lâm sàng', mau: 'purple' },
  HUY_CHI_DINH_CLS: { ten: 'Hủy chỉ định CLS', mau: 'red' },
  HOAN_TAT_KHAM: { ten: 'Hoàn tất khám', mau: 'green' },
  THEM_DANH_MUC: { ten: 'Thêm danh mục', mau: 'green' },
  SUA_DANH_MUC: { ten: 'Sửa danh mục', mau: 'cyan' },
  NGUNG_DANH_MUC: { ten: 'Ngừng danh mục', mau: 'orange' },
  MO_DANH_MUC: { ten: 'Mở lại danh mục', mau: 'lime' },
  XOA_DANH_MUC: { ten: 'Xóa trên sơ đồ', mau: 'red' },
  GUI_DANH_GIA: { ten: 'Gửi đánh giá', mau: 'gold' },
  GUI_GOP_Y: { ten: 'Gửi góp ý', mau: 'geekblue' },
  BO_SUNG_GOP_Y: { ten: 'Bổ sung góp ý', mau: 'geekblue' },
  TIEP_NHAN_GOP_Y: { ten: 'Tiếp nhận góp ý', mau: 'blue' },
  PHAN_HOI_GOP_Y: { ten: 'Phản hồi góp ý', mau: 'green' },
  GHI_CHU_GOP_Y: { ten: 'Ghi chú nội bộ góp ý', mau: 'default' },
  DONG_GOP_Y: { ten: 'Đóng góp ý', mau: 'default' },
}

// ---------- Danh mục, mặt bằng (gói 3) ----------
export const TEN_LOAI_PHONG: Record<LoaiPhong, string> = {
  KHAM_BENH: 'Khám bệnh', XET_NGHIEM: 'Xét nghiệm', X_QUANG: 'X-quang', SIEU_AM: 'Siêu âm', NOI_SOI: 'Nội soi',
}

/** BR11: loại dịch vụ CLS chỉ làm ở loại phòng tương ứng (khớp DanhMucService.PHONG_CUA_DICH_VU). */
export const PHONG_CUA_DICH_VU: Record<Exclude<LoaiDichVu, 'KHAM'>, LoaiPhong[]> = {
  XET_NGHIEM: ['XET_NGHIEM'], CDHA: ['X_QUANG', 'SIEU_AM'], NOI_SOI: ['NOI_SOI'],
}

export const TEN_LOAI_DIEM: Record<LoaiDiem, { ten: string; mau: string }> = {
  PHONG: { ten: 'Cửa phòng', mau: '#1677ff' },
  HANH_LANG: { ten: 'Hành lang', mau: '#8c8c8c' },
  NGA_RE: { ten: 'Ngã rẽ', mau: '#bfbfbf' },
  CAU_THANG: { ten: 'Cầu thang bộ', mau: '#fa8c16' },
  THANG_MAY: { ten: 'Thang máy', mau: '#722ed1' },
  QUAY_TIEP_DON: { ten: 'Quầy tiếp đón', mau: '#13c2c2' },
  QUAY_THU_NGAN: { ten: 'Quầy thu ngân', mau: '#eb2f96' },
  SANH: { ten: 'Sảnh', mau: '#52c41a' },
}

// ---------- Khám bệnh (gói 8) ----------
export const TRANG_THAI_PHIEU_CLS: Record<TrangThaiPhieuCls, { ten: string; mau: string }> = {
  CHO_THANH_TOAN: { ten: 'Chờ thanh toán', mau: 'gold' },
  CHO_THUC_HIEN: { ten: 'Chờ thực hiện', mau: 'blue' },
  DANG_THUC_HIEN: { ten: 'Đang thực hiện', mau: 'geekblue' },
  CO_KET_QUA: { ten: 'Có kết quả', mau: 'green' },
  DA_HUY: { ten: 'Đã hủy', mau: 'default' },
}

export const TEN_LOAI_DV: Record<PhieuChiDinh['LoaiDV'], string> = {
  XET_NGHIEM: 'Xét nghiệm', CDHA: 'Chẩn đoán hình ảnh', NOI_SOI: 'Nội soi',
}

export const TEN_THAO_TAC_HO_SO: Record<string, string> = {
  XEM: 'Xem', TAO: 'Tạo', CAP_NHAT: 'Cập nhật', BO_SUNG_GHI_CHU: 'Bổ sung ghi chú', TAI_TEP: 'Tải tệp', IN: 'In',
}

/** Tải bảng dữ liệu về máy dạng CSV (Excel đọc được tiếng Việt nhờ BOM UTF-8). */
export function taiCsv<T>(tenTep: string, cot: { ten: string; lay: (r: T) => unknown }[], dong: T[]) {
  const o = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const noiDung = [cot.map((c) => o(c.ten)).join(','), ...dong.map((r) => cot.map((c) => o(c.lay(r))).join(','))]
  const url = URL.createObjectURL(new Blob(['\ufeff' + noiDung.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: tenTep })
  a.click()
  URL.revokeObjectURL(url)
}

/** Mệnh giá thường gặp để thu ngân bấm nhanh tiền khách đưa. */
export function goiYTienDua(phaiThu: number) {
  const ds = [phaiThu]
  for (const buoc of [10_000, 50_000, 100_000, 500_000]) {
    const lamTron = Math.ceil(phaiThu / buoc) * buoc
    if (lamTron > phaiThu && !ds.includes(lamTron)) ds.push(lamTron)
  }
  return ds.slice(0, 4)
}

export const TEN_LY_DO_HOAN: Record<string, string> = {
  HUY_PHIEU_CLS: 'Hủy phiếu CLS đã thu', BHYT_XAC_MINH: 'BHYT xác minh sau', HOA_DON_THAY_THE: 'Hóa đơn thay thế nhỏ hơn',
  CHUYEN_KHOAN_THUA: 'Chuyển khoản thừa', KHAC: 'Khác',
}
export const TRANG_THAI_HOAN: Record<string, { ten: string; mau: string }> = {
  CHO_DUYET: { ten: 'Chờ duyệt', mau: 'orange' }, CHO_HOAN: { ten: 'Chờ hoàn', mau: 'gold' },
  DA_HOAN: { ten: 'Đã hoàn', mau: 'green' }, TU_CHOI: { ten: 'Từ chối', mau: 'default' },
}
/** BR31: phiếu hoàn trên mức này phải được quản trị viên duyệt (khớp HoanTienService.NGUONG_DUYET). */
export const NGUONG_DUYET_HOAN = 1_000_000
export const SU_KIEN_SO_HOAN = 'phongkham:so-hoan-tien'

// ---------- Đánh giá, góp ý (gói 12) ----------
/** BR24: thứ tự và tên 6 tiêu chí dịch vụ (khớp DanhGiaService.TIEU_CHI). */
export const TIEU_CHI_DANH_GIA: { cot: CotTieuChi; ten: string }[] = [
  { cot: 'DiemThoiGianCho', ten: 'Thời gian chờ' }, { cot: 'DiemThuTucTiepDon', ten: 'Thủ tục tiếp đón' },
  { cot: 'DiemThaiDoNhanVien', ten: 'Thái độ nhân viên' }, { cot: 'DiemCoSoVatChat', ten: 'Cơ sở vật chất' },
  { cot: 'DiemDichVuCLS', ten: 'Dịch vụ cận lâm sàng' }, { cot: 'DiemChiPhi', ten: 'Chi phí' },
]
export const TEN_CHU_DE_DANH_GIA: Record<string, string> = {
  THOI_GIAN_CHO: 'Thời gian chờ', THAI_DO: 'Thái độ phục vụ', CHUYEN_MON: 'Chuyên môn', CO_SO_VAT_CHAT: 'Cơ sở vật chất',
  CHI_PHI: 'Chi phí', THU_TUC: 'Thủ tục',
}
export const CAM_XUC: Record<CamXuc, { ten: string; mau: string }> = {
  TICH_CUC: { ten: 'Tích cực', mau: 'green' }, TRUNG_TINH: { ten: 'Trung tính', mau: 'default' },
  TIEU_CUC: { ten: 'Tiêu cực', mau: 'red' },
}
export const MUC_DO_NGHIEM_TRONG: Record<MucDoNghiemTrong, { ten: string; mau: string }> = {
  THAP: { ten: 'Thấp', mau: 'default' }, TRUNG_BINH: { ten: 'Trung bình', mau: 'orange' }, CAO: { ten: 'Cao', mau: 'red' },
}
export const TEN_LOAI_GOP_Y: Record<LoaiGopY, string> = { GOP_Y: 'Góp ý', KHIEU_NAI: 'Khiếu nại' }
export const TRANG_THAI_GOP_Y: Record<TrangThaiGopY, { ten: string; mau: string }> = {
  MOI: { ten: 'Mới', mau: 'blue' }, DANG_XU_LY: { ten: 'Đang xử lý', mau: 'gold' },
  DA_PHAN_HOI: { ten: 'Đã phản hồi', mau: 'green' }, DA_DONG: { ten: 'Đã đóng', mau: 'default' },
}
export const CHU_DE_GOP_Y = ['Thời gian chờ', 'Thái độ phục vụ', 'Chuyên môn bác sĩ', 'Thủ tục, đặt lịch', 'Cơ sở vật chất',
  'Chi phí, thanh toán', 'Ứng dụng', 'Khác']
/** BR25: hạn phản hồi góp ý (giờ). */
export const HAN_PHAN_HOI_GOP_Y = 48
export const SU_KIEN_SO_GOP_Y = 'phongkham:so-gop-y'
export const SU_KIEN_SO_DANH_GIA = 'phongkham:so-danh-gia'
