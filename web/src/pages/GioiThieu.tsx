import {
  ArrowRightOutlined, BellOutlined, CalendarOutlined, CheckCircleFilled, ClockCircleOutlined, CloudOutlined, DownOutlined, EnvironmentOutlined,
  ExperimentOutlined, FileProtectOutlined, HeartOutlined, LoginOutlined, MailOutlined, MedicineBoxOutlined, MenuOutlined, PhoneOutlined,
  ScanOutlined, SearchOutlined, StarOutlined, TeamOutlined, WalletOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Popover } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useManHinhNho } from '@/hooks/manHinh'
import { ANH, anhChuyenKhoa } from '@/lib/anh'
import { api, type ChuyenKhoa, type ThongTinLienHe } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { TEN_PHONG_KHAM } from '@/lib/hangSo'

// Dùng khi chưa tải được danh sách từ máy chủ (khớp dữ liệu mẫu bảng ChuyenKhoa)
const CK_MAC_DINH: ChuyenKhoa[] = [
  { MaCK: 1, TenCK: 'Nội tổng quát', MoTa: 'Khám, điều trị bệnh nội khoa thường gặp', PhiKhamCoBan: '' },
  { MaCK: 2, TenCK: 'Nhi', MoTa: 'Chăm sóc sức khỏe trẻ em', PhiKhamCoBan: '' },
  { MaCK: 3, TenCK: 'Tai Mũi Họng', MoTa: 'Khám, nội soi tai mũi họng', PhiKhamCoBan: '' },
  { MaCK: 4, TenCK: 'Da liễu', MoTa: 'Bệnh da, tóc, móng', PhiKhamCoBan: '' },
  { MaCK: 5, TenCK: 'Tiêu hóa', MoTa: 'Dạ dày, đại tràng, gan mật', PhiKhamCoBan: '' },
]

const DICH_VU = [
  { icon: <MedicineBoxOutlined />, ten: 'Khám chuyên khoa', moTa: 'Bác sĩ chuyên khoa nhiều năm kinh nghiệm' },
  { icon: <ExperimentOutlined />, ten: 'Xét nghiệm', moTa: 'Trả kết quả theo chỉ số, so với khoảng tham chiếu' },
  { icon: <ScanOutlined />, ten: 'Chẩn đoán hình ảnh', moTa: 'X-quang, siêu âm ngay tại phòng khám' },
  { icon: <SearchOutlined />, ten: 'Nội soi', moTa: 'Nội soi tiêu hóa, tai mũi họng' },
]

const TIEN_ICH = [
  { icon: <CalendarOutlined />, ten: 'Đặt lịch trực tuyến', moTa: 'Chọn bác sĩ, giờ khám 24/7' },
  { icon: <FileProtectOutlined />, ten: 'Hồ sơ sức khỏe', moTa: 'Chẩn đoán, đơn thuốc, kết quả trên web' },
  { icon: <WalletOutlined />, ten: 'Thanh toán MoMo', moTa: 'Không cần xếp hàng thu ngân' },
  { icon: <BellOutlined />, ten: 'Nhắc lịch, báo lượt', moTa: 'Thông báo khi sắp đến giờ khám' },
]

const LY_DO = [
  { icon: <HeartOutlined />, ten: 'Dịch vụ tận tình', moTa: 'Nhân viên hướng dẫn từ lúc đặt lịch đến khi nhận kết quả.' },
  { icon: <TeamOutlined />, ten: 'Bác sĩ giàu kinh nghiệm', moTa: 'Đội ngũ bác sĩ chuyên khoa nhiều năm công tác, được bệnh nhân đánh giá sau mỗi lượt khám.' },
  { icon: <ScanOutlined />, ten: 'Thiết bị hiện đại', moTa: 'Xét nghiệm, chẩn đoán hình ảnh, nội soi tại chỗ, kết quả đẩy thẳng vào hồ sơ.' },
  { icon: <ClockCircleOutlined />, ten: 'Không phải chờ lâu', moTa: 'Biết trước số thứ tự và giờ vào khám dự kiến, cập nhật theo thời gian thực.' },
]

const QUY_TRINH = [
  { ten: 'Đặt lịch', moTa: 'Chọn chuyên khoa, bác sĩ và khung giờ trên web hoặc gọi tổng đài.' },
  { ten: 'Check-in', moTa: 'Đến quầy lễ tân, xuất trình thẻ BHYT nếu có, nhận số thứ tự.' },
  { ten: 'Khám & cận lâm sàng', moTa: 'Bác sĩ khám, chỉ định xét nghiệm, chẩn đoán hình ảnh khi cần.' },
  { ten: 'Thanh toán & nhận kết quả', moTa: 'Thanh toán tại quầy hoặc MoMo, xem kết quả và đơn thuốc trên web.' },
]

const MENU = [
  { id: 'chuyen-khoa', ten: 'Chuyên khoa' },
  { id: 'ly-do', ten: 'Vì sao chọn chúng tôi' },
  { id: 'quy-trinh', ten: 'Quy trình khám' },
  { id: 'lien-he', ten: 'Liên hệ' },
]

/** Hotline 19001234 → "1900 1234" cho dễ đọc; số khác giữ nguyên. */
const docSo = (s: string) => (/^1[89]00\d{4}$/.test(s) ? `${s.slice(0, 4)} ${s.slice(4)}` : s)

const cuonToi = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

function MucMega({ icon, ten, moTa, onClick }: { icon: ReactNode; ten: string; moTa?: string | null; onClick: () => void }) {
  return (
    <button type="button" className="mega-muc" onClick={onClick}>
      <span className="mega-muc-icon">{icon}</span>
      <span className="mega-muc-chu">
        <strong>{ten}</strong>
        {moTa && <small>{moTa}</small>}
      </span>
    </button>
  )
}

/** Trang giới thiệu công khai (trước khi đăng nhập), bố cục tham khảo myhospital.vn. */
export default function GioiThieu() {
  const { nguoiDung } = usePhien()
  const navigate = useNavigate()
  const nho = useManHinhNho()
  const [daCuon, setDaCuon] = useState(false)
  const [moMega, setMoMega] = useState(false)
  const [moMenu, setMoMenu] = useState(false)
  const [tt, setTt] = useState<ThongTinLienHe | null>(null)
  const [dsCk, setDsCk] = useState<ChuyenKhoa[]>(CK_MAC_DINH)

  useEffect(() => {
    api.thongTinLienHe().then(setTt).catch(() => {})
    api.dsChuyenKhoa().then((ds) => ds.length && setDsCk(ds)).catch(() => {})
  }, [])

  // Thanh menu trong suốt trên ảnh hero, cuộn xuống thì chuyển nền trắng
  useEffect(() => {
    const kiem = () => setDaCuon(window.scrollY > 40)
    kiem()
    window.addEventListener('scroll', kiem, { passive: true })
    return () => window.removeEventListener('scroll', kiem)
  }, [])

  const hotline = tt?.Hotline ?? '19001234'
  const tenPk = tt?.TenPhongKham ?? TEN_PHONG_KHAM
  // Chưa đăng nhập thì mọi nút đặt lịch đưa sang đăng ký; đã đăng nhập thì vào thẳng trang đặt lịch
  const datLich = () => navigate(nguoiDung ? '/dat-lich' : '/dang-ky')
  const chon = (id: string) => { setMoMega(false); setMoMenu(false); cuonToi(id) }

  const bangMega = (
    <div className="mega gt-mega">
      <button type="button" className="mega-dau gt-mega-dau" onClick={() => chon('chuyen-khoa')}>
        <span className="mega-dau-icon"><MedicineBoxOutlined /></span>
        <strong>Xem tất cả dịch vụ</strong>
        <ArrowRightOutlined style={{ marginInlineStart: 'auto' }} />
      </button>
      <div className="mega-cot" style={{ gridTemplateColumns: 'repeat(3, minmax(240px, 1fr))' }}>
        <div>
          <div className="mega-tieu-de"><ExperimentOutlined /> KHÁM & CẬN LÂM SÀNG</div>
          {DICH_VU.map((d) => <MucMega key={d.ten} {...d} onClick={() => chon('chuyen-khoa')} />)}
        </div>
        <div>
          <div className="mega-tieu-de"><TeamOutlined /> THEO CHUYÊN KHOA</div>
          {dsCk.slice(0, 6).map((ck) => (
            <MucMega key={ck.MaCK} icon={<MedicineBoxOutlined />} ten={ck.TenCK} onClick={() => chon('chuyen-khoa')} />
          ))}
        </div>
        <div>
          <div className="mega-tieu-de"><CloudOutlined /> TIỆN ÍCH TRỰC TUYẾN</div>
          {TIEN_ICH.map((d) => <MucMega key={d.ten} {...d} onClick={() => { setMoMega(false); datLich() }} />)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="gt">
      <header className={daCuon || moMega ? 'gt-dau da-cuon' : 'gt-dau'}>
        <div className="gt-khung gt-dau-khung">
          <a href="#dau" className="gt-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <span className="logo-o" style={{ width: 38, height: 38 }} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span>
              <strong>PK VIỆT BẮC</strong>
              <small>Khám chữa bệnh tận tâm</small>
            </span>
          </a>

          {!nho && (
            <nav className="gt-menu" aria-label="Trang giới thiệu">
              <Popover trigger="hover" placement="bottom" arrow={false} open={moMega} onOpenChange={setMoMega}
                classNames={{ root: 'mega-pop' }} content={bangMega}>
                <button type="button" className={moMega ? 'gt-menu-muc dang-mo' : 'gt-menu-muc'}>
                  Dịch vụ <DownOutlined className="menu-ngang-mui" />
                </button>
              </Popover>
              {MENU.map((m) => (
                <button key={m.id} type="button" className="gt-menu-muc" onClick={() => chon(m.id)}>{m.ten}</button>
              ))}
            </nav>
          )}

          <div className="gt-dau-phai">
            {nguoiDung ? (
              <Button className="nut-cam" icon={<ArrowRightOutlined />} iconPlacement="end" onClick={() => navigate('/')}>
                Vào hệ thống
              </Button>
            ) : (
              <>
                {!nho && <Button className="gt-nut-dang-nhap" icon={<LoginOutlined />} onClick={() => navigate('/dang-nhap')}>Đăng nhập</Button>}
                <Button className="nut-cam" icon={<CalendarOutlined />} onClick={datLich}>Đặt lịch khám</Button>
              </>
            )}
            {nho && <Button type="text" className="gt-nut-menu" icon={<MenuOutlined />} aria-label="Mở menu" onClick={() => setMoMenu(true)} />}
          </div>
        </div>
      </header>

      <Drawer open={nho && moMenu} onClose={() => setMoMenu(false)} placement="right" size={280} title={tenPk}>
        <nav className="gt-menu-doc">
          {MENU.map((m) => <button key={m.id} type="button" onClick={() => chon(m.id)}>{m.ten}</button>)}
          {!nguoiDung && <Link to="/dang-nhap">Đăng nhập</Link>}
        </nav>
      </Drawer>

      {/* Hero: ảnh phòng khám phủ gradient, chữ trắng bên trái, thẻ kính mờ bên phải */}
      <section id="dau" className="gt-hero" style={{ backgroundImage: `url(${ANH.banner[0]})` }}>
        <div className="gt-khung gt-hero-khung">
          <div className="gt-hero-chu">
            <span className="nhan-kinh"><CloudOutlined /> Đặt lịch khám trực tuyến 24/7</span>
            <h1>{tenPk}</h1>
            <p>
              Khám chuyên khoa, xét nghiệm, chẩn đoán hình ảnh và nội soi tại một nơi. <b>Đặt lịch trước, biết giờ vào khám</b>,
              xem kết quả và đơn thuốc ngay trên web.
            </p>
            <div className="gt-hero-nut">
              <Button size="large" className="nut-trang" icon={<CalendarOutlined />} onClick={datLich}>Đặt lịch khám</Button>
              <Button size="large" className="nut-vien-trang" icon={<PhoneOutlined />} href={`tel:${hotline}`}>{docSo(hotline)}</Button>
            </div>
          </div>
          <div className="gt-hero-the">
            <strong>Đặt lịch trong 3 bước</strong>
            {['Chọn chuyên khoa và bác sĩ', 'Chọn ngày, khung giờ còn trống', 'Nhận mã lịch hẹn và thông báo nhắc lịch'].map((b, i) => (
              <div key={b} className="gt-hero-buoc"><span>{i + 1}</span>{b}</div>
            ))}
            <div className="gt-hero-the-duoi"><StarOutlined /> Bệnh nhân đánh giá bác sĩ sau mỗi lượt khám</div>
          </div>
        </div>
      </section>

      {/* Dải điểm nổi bật đè lên mép dưới hero */}
      <div className="gt-khung">
        <div className="gt-noi-bat">
          {[
            { icon: <MedicineBoxOutlined />, so: `${dsCk.length} chuyên khoa`, chu: 'Nội, Nhi, Tai Mũi Họng…' },
            { icon: <ExperimentOutlined />, so: 'Cận lâm sàng', chu: 'Xét nghiệm, X-quang, siêu âm, nội soi' },
            { icon: <CalendarOutlined />, so: 'Đặt lịch 24/7', chu: 'Trên web hoặc qua tổng đài' },
            { icon: <WalletOutlined />, so: 'Thanh toán MoMo', chu: 'Không cần xếp hàng thu ngân' },
          ].map((d) => (
            <div key={d.so} className="gt-noi-bat-muc">
              <span className="gt-icon">{d.icon}</span>
              <span><strong>{d.so}</strong><small>{d.chu}</small></span>
            </div>
          ))}
        </div>
      </div>

      <section id="chuyen-khoa" className="gt-phan">
        <div className="gt-khung">
          <div className="gt-tieu-de">
            <span className="gt-nhan">CHUYÊN KHOA</span>
            <h2>Các chuyên khoa tại phòng khám</h2>
            <p>Chọn chuyên khoa phù hợp với triệu chứng, đặt lịch với bác sĩ bạn muốn.</p>
          </div>
          <div className="gt-luoi gt-luoi-ck">
            {dsCk.map((ck) => (
              <button key={ck.MaCK} type="button" className="gt-the gt-the-ck" onClick={datLich}>
                <img src={anhChuyenKhoa(ck.MaCK, ck.AnhDaiDien)} alt={ck.TenCK} loading="lazy" />
                <span className="gt-the-than">
                  <strong>{ck.TenCK}</strong>
                  {ck.MoTa && <small>{ck.MoTa}</small>}
                  <span className="gt-lien-ket">Đặt lịch <ArrowRightOutlined /></span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="ly-do" className="gt-phan gt-phan-nen">
        <div className="gt-khung">
          <div className="gt-tieu-de">
            <span className="gt-nhan">VÌ SAO CHỌN CHÚNG TÔI</span>
            <h2>Khám chữa bệnh tận tâm, thủ tục nhanh gọn</h2>
          </div>
          <div className="gt-luoi">
            {LY_DO.map((l) => (
              <div key={l.ten} className="gt-the">
                <span className="gt-icon">{l.icon}</span>
                <strong>{l.ten}</strong>
                <small>{l.moTa}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="quy-trinh" className="gt-phan">
        <div className="gt-khung">
          <div className="gt-tieu-de">
            <span className="gt-nhan">QUY TRÌNH KHÁM</span>
            <h2>Bốn bước từ đặt lịch đến nhận kết quả</h2>
          </div>
          <ol className="gt-luoi gt-quy-trinh">
            {QUY_TRINH.map((b, i) => (
              <li key={b.ten} className="gt-the">
                <span className="gt-so">{String(i + 1).padStart(2, '0')}</span>
                <strong>{b.ten}</strong>
                <small>{b.moTa}</small>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Dải kêu gọi đặt lịch */}
      <section className="gt-khung">
        <div className="gt-keu-goi">
          <div>
            <h2>Đặt lịch khám ngay hôm nay</h2>
            <p>Chỉ mất 1 phút. Nhận thông báo nhắc lịch trước giờ khám.</p>
          </div>
          <div className="gt-hero-nut">
            <Button size="large" className="nut-trang" icon={<CalendarOutlined />} onClick={datLich}>Đặt lịch khám</Button>
            <Button size="large" className="nut-vien-trang" icon={<PhoneOutlined />} href={`tel:${hotline}`}>Gọi {docSo(hotline)}</Button>
          </div>
        </div>
      </section>

      <footer id="lien-he" className="gt-chan">
        <div className="gt-khung gt-chan-luoi">
          <div>
            <strong className="gt-chan-ten">{tenPk}</strong>
            {tt?.GioiThieu && <p>{tt.GioiThieu}</p>}
          </div>
          <ul>
            {tt?.DiaChi && <li><EnvironmentOutlined /> {tt.DiaChi}</li>}
            <li><PhoneOutlined /> Hotline: <a href={`tel:${hotline}`}>{docSo(hotline)}</a></li>
            {tt?.Email && <li><MailOutlined /> <a href={`mailto:${tt.Email}`}>{tt.Email}</a></li>}
            {tt?.GioLamViec && <li><ClockCircleOutlined /> {tt.GioLamViec}</li>}
          </ul>
          <ul>
            <li><CheckCircleFilled /> <Link to={nguoiDung ? '/dat-lich' : '/dang-ky'}>Đặt lịch khám</Link></li>
            <li><CheckCircleFilled /> <Link to={nguoiDung ? '/' : '/dang-nhap'}>{nguoiDung ? 'Vào hệ thống' : 'Đăng nhập'}</Link></li>
            {!nguoiDung && <li><CheckCircleFilled /> <Link to="/dang-ky">Tạo tài khoản bệnh nhân</Link></li>}
          </ul>
        </div>
        <div className="chan-trang-duoi">
          <p>© {new Date().getFullYear()} – Bản quyền thuộc {tenPk}</p>
          <p className="chan-trang-luu-y">
            Thông tin y tế trên hệ thống chỉ có giá trị tham khảo. Không tự ý chẩn đoán hoặc điều trị khi chưa có chỉ định của bác sĩ.
          </p>
        </div>
      </footer>
    </div>
  )
}
