import { ArrowLeftOutlined, CheckCircleFilled, CloudOutlined } from '@ant-design/icons'
import { ConfigProvider } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useManHinhNho } from '@/hooks/manHinh'
import { ANH } from '@/lib/anh'
import Logo from './Logo'

interface Props {
  tieuDe: string
  moTa?: ReactNode
  rong?: boolean // biểu mẫu nhiều trường (đăng ký) cần khung rộng hơn
  children: ReactNode
}

/** Bố cục chung cho đăng nhập, đăng ký, xác thực, khôi phục mật khẩu: nửa trái giới thiệu nền tối, nửa phải thẻ biểu mẫu. */
export default function AuthLayout({ tieuDe, moTa, rong, children }: Props) {
  const nho = useManHinhNho()
  return (
    <div className="auth-trang" style={{ '--anh-nen': `url(${ANH.nenDangNhap})` } as CSSProperties}>
      <aside className="auth-gioi-thieu">
        <Logo lon den="/gioi-thieu" />
        <div className="auth-gioi-thieu-chinh">
          <span className="nhan-kinh"><CloudOutlined /> Đặt lịch khám trực tuyến 24/7</span>
          <h1>Hệ thống quản lý đặt lịch &amp; khám bệnh</h1>
          <p>
            Một tài khoản, giao diện theo vai trò: lễ tân, bác sĩ, bác sĩ cận lâm sàng và quản trị viên dùng trang
            quản trị; bệnh nhân đặt lịch, theo dõi lượt khám và nhận thông báo ngay trên web.
          </p>
          <ul className="auth-diem">
            <li><CheckCircleFilled /> Chọn chuyên khoa, bác sĩ, giờ khám chỉ trong vài bước</li>
            <li><CheckCircleFilled /> Xem kết quả xét nghiệm, đơn thuốc ngay trên web</li>
            <li><CheckCircleFilled /> Thanh toán MoMo, nhận thông báo khi đến lượt</li>
          </ul>
        </div>
        <small>Hotline 1900 1234 · Thứ 2 – Thứ 7: 7h00–11h30, 13h30–17h00</small>
      </aside>

      {/* Điện thoại: dải tối thay cho cột giới thiệu (ẩn bằng CSS trên màn hình lớn) */}
      <header className="auth-dau-mobile">
        <Logo phu="Đặt lịch khám, xem kết quả, nhận thông báo" />
      </header>

      <main className="auth-noi-dung">
        <div className={rong ? 'auth-the auth-the-rong' : 'auth-the'}>
          <Link to="/gioi-thieu" className="auth-ve-gioi-thieu"><ArrowLeftOutlined /> Về trang giới thiệu</Link>
          <div className="auth-tieu-de">
            <h1>{tieuDe}</h1>
            {moTa && <p>{moTa}</p>}
          </div>
          {/* Cỡ large = chữ 16px: iOS không tự phóng to trang khi chạm vào ô nhập */}
          <ConfigProvider componentSize={nho ? 'large' : undefined}>{children}</ConfigProvider>
        </div>
      </main>
    </div>
  )
}
