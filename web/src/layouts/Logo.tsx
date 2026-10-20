import { Link } from 'react-router-dom'
import { TEN_PHONG_KHAM } from '@/lib/hangSo'

interface Props {
  phu?: string // dòng nhỏ dưới tên (vai trò, khẩu hiệu)
  lon?: boolean // cột giới thiệu trang đăng nhập
  den?: string // có thì bấm vào logo để chuyển tới đường dẫn này
  onClick?: () => void
}

/** Logo ô vuông dấu cộng + tên phòng khám, đặt trên nền tối. */
export default function Logo({ phu, lon, den, onClick }: Props) {
  const co = lon ? 44 : 34
  const noiDung = (
    <>
      <span className="logo-o" style={{ width: co, height: co }} aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="logo-chu">
        <strong style={{ fontSize: lon ? 17 : 15 }}>{lon ? TEN_PHONG_KHAM : 'PK Việt Bắc'}</strong>
        {phu && <small>{phu}</small>}
      </span>
    </>
  )
  return den
    ? <Link to={den} className="logo-khoi" onClick={onClick} aria-label="Về trang chủ">{noiDung}</Link>
    : <div className="logo-khoi">{noiDung}</div>
}
