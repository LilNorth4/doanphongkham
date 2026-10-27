import { ClockCircleOutlined, EnvironmentOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type ChuyenKhoa, type ThongTinLienHe } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { TEN_PHONG_KHAM } from '@/lib/hangSo'

interface DuongDan { ten: string; den: string }

/** Hotline 19001234 → "1900 1234" cho dễ đọc; số khác giữ nguyên. */
const docSo = (s: string) => (/^1[89]00\d{4}$/.test(s) ? `${s.slice(0, 4)} ${s.slice(4)}` : s)

/**
 * Chân trang chung của mọi trang sau đăng nhập: giới thiệu và liên hệ phòng khám, chuyên khoa,
 * lối tắt theo quyền của người dùng; dải cuối ghi bản quyền và lưu ý thông tin y tế.
 */
export default function ChanTrang() {
  const { nguoiDung } = usePhien()
  const [tt, setTt] = useState<ThongTinLienHe | null>(null)
  const [dsCk, setDsCk] = useState<ChuyenKhoa[]>([])

  useEffect(() => {
    api.thongTinLienHe().then(setTt).catch(() => {})
    api.dsChuyenKhoa().then(setDsCk).catch(() => {})
  }, [])

  const co = (q: string) => !!nguoiDung?.Quyen.includes(q)
  const laBenhNhan = co('LICH_HEN.DAT')
  const truyCap: DuongDan[] = [
    laBenhNhan && { ten: 'Đặt lịch khám', den: '/dat-lich' },
    laBenhNhan && { ten: 'Lịch hẹn của tôi', den: '/lich-hen-cua-toi' },
    co('HO_SO.XEM_CUA_MINH') && { ten: 'Hồ sơ sức khỏe', den: '/ho-so-suc-khoe' },
    co('HO_SO.XEM_CUA_MINH') && { ten: 'Hóa đơn', den: '/hoa-don' },
    co('LICH_HEN.DUYET') && { ten: 'Quản lý lịch hẹn', den: '/le-tan/lich-hen' },
    co('THANH_TOAN.THU') && { ten: 'Thanh toán hóa đơn', den: '/le-tan/thanh-toan' },
    co('KHAM.THUC_HIEN') && { ten: 'Lịch khám', den: '/bac-si/lich-kham' },
    co('CLS.THUC_HIEN') && { ten: 'Hàng chờ cận lâm sàng', den: '/can-lam-sang' },
    co('LICH_LV.XEM') && { ten: 'Lịch làm việc', den: '/lich-lam-viec' },
    co('THONG_KE.XEM') && { ten: 'Thống kê', den: '/quan-ly/thong-ke' },
    co('TAI_KHOAN.QUAN_LY') && { ten: 'Quản lý tài khoản', den: '/quan-ly/tai-khoan' },
    co('DANH_MUC.QUAN_LY') && { ten: 'Danh mục', den: '/quan-ly/danh-muc' },
  ].filter(Boolean).slice(0, 5) as DuongDan[]
  const hoTro: DuongDan[] = [
    { ten: 'Thông tin cá nhân', den: '/ho-so' },
    { ten: 'Đổi mật khẩu', den: '/doi-mat-khau' },
    co('DANH_GIA.GUI') && { ten: 'Đánh giá sau khám', den: '/danh-gia' },
    co('DANH_GIA.GUI') && { ten: 'Góp ý – Khiếu nại', den: '/gop-y' },
    co('GOP_Y.XU_LY') && { ten: 'Xử lý góp ý', den: '/quan-ly/gop-y' },
  ].filter(Boolean) as DuongDan[]

  const hotline = tt?.Hotline ?? ''
  return (
    <footer className="chan-trang">
      <div className="chan-trang-tren">
        <div className="chan-trang-gioi-thieu">
          <Link to="/" className="chan-trang-thuong-hieu" aria-label="Về trang chủ">
            <span className="logo-o" style={{ width: 44, height: 44 }} aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span>
              <strong>{tt?.TenPhongKham ?? TEN_PHONG_KHAM}</strong>
              <small>Khám chữa bệnh tận tâm</small>
            </span>
          </Link>
          {tt?.GioiThieu && <p className="chan-trang-mo-ta">{tt.GioiThieu}</p>}
          <ul className="chan-trang-lien-he">
            {tt?.DiaChi && <li><EnvironmentOutlined aria-hidden /><span><b>Địa chỉ:</b> {tt.DiaChi}</span></li>}
            {hotline && <li><PhoneOutlined aria-hidden /><span><b>Hotline:</b> <a href={`tel:${hotline}`}>{docSo(hotline)}</a></span></li>}
            {tt?.Email && <li><MailOutlined aria-hidden /><span><b>Email:</b> <a href={`mailto:${tt.Email}`}>{tt.Email}</a></span></li>}
            {tt?.GioLamViec && <li><ClockCircleOutlined aria-hidden /><span><b>Giờ làm việc:</b> {tt.GioLamViec}</span></li>}
          </ul>
        </div>

        {dsCk.length > 0 && (
          <nav aria-label="Chuyên khoa">
            <h3>Chuyên khoa</h3>
            <ul>
              {dsCk.slice(0, 6).map((ck) => (
                <li key={ck.MaCK}>{laBenhNhan ? <Link to="/dat-lich">{ck.TenCK}</Link> : <span>{ck.TenCK}</span>}</li>
              ))}
            </ul>
          </nav>
        )}
        {truyCap.length > 0 && (
          <nav aria-label="Truy cập nhanh">
            <h3>Truy cập nhanh</h3>
            <ul>{truyCap.map((d) => <li key={d.den}><Link to={d.den}>{d.ten}</Link></li>)}</ul>
          </nav>
        )}
        <nav aria-label="Hỗ trợ">
          <h3>Hỗ trợ</h3>
          <ul>
            {hoTro.map((d) => <li key={d.den}><Link to={d.den}>{d.ten}</Link></li>)}
            {hotline && <li><a href={`tel:${hotline}`}>Gọi tổng đài {docSo(hotline)}</a></li>}
          </ul>
        </nav>
      </div>

      <div className="chan-trang-duoi">
        <p>© {new Date().getFullYear()} – Bản quyền thuộc {tt?.TenPhongKham ?? TEN_PHONG_KHAM}{tt?.DiaChi && ` · ${tt.DiaChi}`}</p>
        <p className="chan-trang-luu-y">
          Thông tin y tế trên hệ thống chỉ có giá trị tham khảo. Không tự ý chẩn đoán hoặc điều trị khi chưa có chỉ định của bác sĩ.
        </p>
      </div>
    </footer>
  )
}
