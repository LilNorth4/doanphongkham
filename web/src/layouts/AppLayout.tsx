import {
  AppstoreOutlined, AuditOutlined, BarChartOutlined, CalendarOutlined, ClusterOutlined, FileProtectOutlined, CarryOutOutlined, DollarOutlined, DownOutlined, ExperimentOutlined, EyeOutlined, FileSearchOutlined, FormOutlined, HomeOutlined, KeyOutlined,
  LogoutOutlined, MedicineBoxOutlined, MenuOutlined, MonitorOutlined, MoreOutlined, PhoneOutlined, SafetyCertificateOutlined, ScheduleOutlined, SettingOutlined, SolutionOutlined,
  RollbackOutlined, TableOutlined, TeamOutlined, UserOutlined, WalletOutlined, CommentOutlined, LikeOutlined, StarOutlined,
} from '@ant-design/icons'
import { Badge, Button, ConfigProvider, Drawer, Dropdown, Flex, Layout, Menu, Popover, Space, Spin, Tag, Tooltip, type MenuProps } from 'antd'
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import AnhDaiDien from '@/components/AnhDaiDien'
import ChuongThongBao from '@/components/ChuongThongBao'
import { useManHinhNho } from '@/hooks/manHinh'
import { api } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { SU_KIEN_SO_CHO, SU_KIEN_SO_CLS, SU_KIEN_SO_DANG_KY_CA, SU_KIEN_SO_HOA_DON, SU_KIEN_SO_HOAN, SU_KIEN_SO_TAM_THU, SU_KIEN_SO_DANH_GIA, SU_KIEN_SO_GOP_Y, TEN_VAI_TRO } from '@/lib/hangSo'
import ChanTrang from './ChanTrang'
import Logo from './Logo'

type MucMenu = Required<MenuProps>['items'][number]

/** Số đếm trên menu: tải định kỳ và nhận cập nhật tức thì qua sự kiện của trang liên quan. */
function useSoDem(bat: boolean, tai: () => Promise<{ so_luong: number }>, suKien: string, chuKy: number) {
  const [so, setSo] = useState(0)
  useEffect(() => {
    if (!bat) return
    const lay = () => tai().then((r) => setSo(r.so_luong)).catch(() => {})
    lay()
    const id = setInterval(lay, chuKy)
    const capNhat = (e: Event) => setSo((e as CustomEvent<number>).detail)
    window.addEventListener(suKien, capNhat)
    return () => {
      clearInterval(id)
      window.removeEventListener(suKien, capNhat)
    }
  }, [bat, tai, suKien, chuKy])
  return so
}

const soChoDanhGia = () => api.danhGiaCuaToi().then((d) => ({ so_luong: d.ChoDanhGia.length }))

/** Một chức năng trong menu: đường dẫn, tên, mô tả ngắn hiện trong bảng thả xuống, số việc đang chờ. */
interface Muc { den: string; ten: string; moTa: string; icon: ReactNode; so?: number }
/** Một mục trên thanh ngang: nhiều chức năng thì mở bảng thả xuống chia cột, một chức năng thì là liên kết thẳng. */
interface Nhom { khoa: string; ten: string; moTa: string; icon: ReactNode; cot: { ten?: string; icon?: ReactNode; muc: Muc[] }[] }

const loc = (muc: (Muc | false)[]) => muc.filter(Boolean) as Muc[]
const dsMuc = (n: Nhom) => n.cot.flatMap((c) => c.muc)
const tongSo = (n: Nhom) => dsMuc(n).reduce((t, m) => t + (m.so ?? 0), 0)

const nhanSo = (ten: string, so = 0): ReactNode => (
  <span className="menu-nhan">{ten}{so > 0 && <Badge count={so} size="small" />}</span>
)

/** Bảng thả xuống kiểu mega-menu: dòng đầu tên nhóm, bên dưới các cột chức năng có biểu tượng và mô tả. */
function BangNhom({ nhom, hienTai, dong }: { nhom: Nhom; hienTai: string; dong: () => void }) {
  return (
    <div className="mega">
      <div className="mega-dau">
        <span className="mega-dau-icon">{nhom.icon}</span>
        <strong>{nhom.ten}</strong>
        <span>{nhom.moTa}</span>
      </div>
      <div className="mega-cot" style={{ gridTemplateColumns: `repeat(${nhom.cot.length}, minmax(260px, 1fr))` }}>
        {nhom.cot.map((c, i) => (
          <div key={c.ten ?? i}>
            {c.ten && <div className="mega-tieu-de">{c.icon} {c.ten}</div>}
            {c.muc.map((m) => (
              <Link key={m.den} to={m.den} onClick={dong} className={m.den === hienTai ? 'mega-muc dang-chon' : 'mega-muc'}>
                <span className="mega-muc-icon">{m.icon}</span>
                <span className="mega-muc-chu">
                  <strong>{m.ten}</strong>
                  <small>{m.moTa}</small>
                </span>
                {(m.so ?? 0) > 0 && <Badge count={m.so} size="small" />}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Khung sau khi đăng nhập: thanh ngang gradient chứa menu theo quyền (bảng thả xuống kiểu mega-menu) và tài khoản. */
export default function AppLayout() {
  const { nguoiDung, dangXuat, taiLai } = usePhien()
  const navigate = useNavigate()
  const location = useLocation()
  const nho = useManHinhNho()
  const [moMenu, setMoMenu] = useState(false)
  const [moNhom, setMoNhom] = useState<string | null>(null)
  const co = (q: string) => !!nguoiDung?.Quyen.includes(q)
  const laLeTan = co('LICH_HEN.DUYET')
  const duyetCa = co('LICH_LV.QUAN_LY')
  const soCho = useSoDem(laLeTan, api.soChoXacNhan, SU_KIEN_SO_CHO, 30_000)
  const soDangKyCa = useSoDem(duyetCa, api.soDangKyChoDuyet, SU_KIEN_SO_DANG_KY_CA, 60_000)
  const thuTien = co('THANH_TOAN.THU')
  const lamCls = co('CLS.THUC_HIEN')
  const soTamThu = useSoDem(thuTien, api.soChoTamThu, SU_KIEN_SO_TAM_THU, 30_000)
  const soHoaDon = useSoDem(thuTien, api.soChoThanhToan, SU_KIEN_SO_HOA_DON, 30_000)
  const hoanTien = co('HOAN_TIEN.LAP') || co('HOAN_TIEN.DUYET')
  const soHoan = useSoDem(hoanTien, api.soPhieuHoanCho, SU_KIEN_SO_HOAN, 60_000)
  const soCls = useSoDem(lamCls, api.soChoCls, SU_KIEN_SO_CLS, 30_000)
  const xuLyGopY = co('GOP_Y.XU_LY')
  const soGopY = useSoDem(xuLyGopY, api.soGopYCho, SU_KIEN_SO_GOP_Y, 60_000)
  const danhGia = co('DANH_GIA.GUI')
  const soDanhGia = useSoDem(danhGia, soChoDanhGia, SU_KIEN_SO_DANH_GIA, 300_000)

  // Quyền có thể bị quản trị viên đổi trong lúc đang dùng (UC2.7): làm mới mỗi phút và khi quay lại tab
  useEffect(() => {
    const id = setInterval(taiLai, 60_000)
    const khiHien = () => document.visibilityState === 'visible' && taiLai()
    document.addEventListener('visibilitychange', khiHien)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', khiHien)
    }
  }, [taiLai])

  // Chế độ thử: hiện CSDL backend đang ghi, để thấy ngay khi chạy nhầm sang CSDL khác
  const [csdl, setCsdl] = useState<string>()
  useEffect(() => { api.cauHinh().then((c) => setCsdl(c.csdl)).catch(() => {}) }, [])

  if (!nguoiDung) return null

  const nhomMenu = useMemo<Nhom[]>(() => {
    const ds: Nhom[] = [
      // Bệnh nhân: mỗi chức năng là một mục riêng trên thanh, đặt lịch là nút nổi bật bên phải
      { khoa: 'lich-hen', ten: 'Lịch hẹn', moTa: '', icon: <ScheduleOutlined />, cot: [{ muc: loc([
        co('LICH_HEN.DAT') && { den: '/lich-hen-cua-toi', ten: 'Lịch hẹn của tôi', moTa: 'Xem, đổi, hủy lịch và danh sách chờ', icon: <ScheduleOutlined /> },
      ]) }] },
      { khoa: 'ho-so-suc-khoe', ten: 'Hồ sơ sức khỏe', moTa: '', icon: <FileProtectOutlined />, cot: [{ muc: loc([
        co('HO_SO.XEM_CUA_MINH') && { den: '/ho-so-suc-khoe', ten: 'Hồ sơ sức khỏe', moTa: 'Chẩn đoán, đơn thuốc, kết quả xét nghiệm', icon: <FileProtectOutlined /> },
      ]) }] },
      { khoa: 'hoa-don', ten: 'Hóa đơn', moTa: '', icon: <DollarOutlined />, cot: [{ muc: loc([
        co('HO_SO.XEM_CUA_MINH') && { den: '/hoa-don', ten: 'Hóa đơn', moTa: 'Hóa đơn, thanh toán MoMo', icon: <DollarOutlined /> },
      ]) }] },
      { khoa: 'phan-hoi', ten: 'Đánh giá & góp ý', moTa: 'Ý kiến của bạn sau mỗi lượt khám', icon: <StarOutlined />, cot: [{ muc: loc([
        danhGia && { den: '/danh-gia', ten: 'Đánh giá', moTa: 'Chấm điểm bác sĩ, dịch vụ sau khám', icon: <StarOutlined />, so: soDanhGia },
        danhGia && { den: '/gop-y', ten: 'Góp ý – Khiếu nại', moTa: 'Gửi và theo dõi phản hồi', icon: <CommentOutlined /> },
      ]) }] },
      // Nhân viên
      { khoa: 'tiep-don', ten: 'Tiếp đón', moTa: 'Lịch hẹn, check-in, đặt lịch cho bệnh nhân', icon: <SolutionOutlined />, cot: [{ muc: loc([
        laLeTan && { den: '/le-tan/lich-hen', ten: 'Quản lý lịch hẹn', moTa: 'Duyệt lịch, check-in bệnh nhân', icon: <SolutionOutlined />, so: soCho },
        laLeTan && { den: '/le-tan/dat-lich', ten: 'Đặt lịch hộ', moTa: 'Điện thoại, tin nhắn, vãng lai', icon: <PhoneOutlined /> },
      ]) }] },
      { khoa: 'kham', ten: 'Khám bệnh', moTa: 'Khám lâm sàng và cận lâm sàng', icon: <MedicineBoxOutlined />, cot: [{ muc: loc([
        co('KHAM.THUC_HIEN') && { den: '/bac-si/lich-kham', ten: 'Lịch khám', moTa: 'Gọi bệnh nhân, khám, kê đơn, chỉ định CLS', icon: <FormOutlined /> },
        lamCls && { den: '/can-lam-sang', ten: 'Hàng chờ cận lâm sàng', moTa: 'Tiếp nhận, trả kết quả xét nghiệm, hình ảnh', icon: <ExperimentOutlined />, so: soCls },
      ]) }] },
      { khoa: 'thu-ngan', ten: 'Thu ngân', moTa: 'Thu tiền, hóa đơn, hoàn tiền', icon: <WalletOutlined />, cot: [{ muc: loc([
        thuTien && { den: '/le-tan/tam-thu', ten: 'Thu tạm thu CLS', moTa: 'Thu trước tiền chỉ định cận lâm sàng', icon: <WalletOutlined />, so: soTamThu },
        thuTien && { den: '/le-tan/thanh-toan', ten: 'Thanh toán hóa đơn', moTa: 'Tiền mặt, chuyển khoản, MoMo', icon: <DollarOutlined />, so: soHoaDon },
        !thuTien && co('HOA_DON.HUY') && { den: '/le-tan/thanh-toan', ten: 'Hóa đơn', moTa: 'Tra cứu, hủy hóa đơn', icon: <DollarOutlined /> },
        co('HOAN_TIEN.LAP') && { den: '/hoan-tien', ten: 'Hoàn tiền', moTa: 'Lập phiếu hoàn tiền cho bệnh nhân', icon: <RollbackOutlined />, so: soHoan },
        !co('HOAN_TIEN.LAP') && co('HOAN_TIEN.DUYET') && { den: '/hoan-tien', ten: 'Duyệt hoàn tiền', moTa: 'Duyệt, từ chối phiếu hoàn', icon: <RollbackOutlined />, so: soHoan },
      ]) }] },
      { khoa: 'lich-lam-viec', ten: 'Lịch làm việc', moTa: 'Ca làm việc của bác sĩ, nhân viên', icon: <TableOutlined />, cot: [{ muc: loc([
        co('LICH_LV.XEM') && { den: '/lich-lam-viec', ten: 'Lịch làm việc', moTa: 'Lịch ca theo tuần, theo phòng', icon: <TableOutlined /> },
        co('LICH_LV.DANG_KY') && { den: '/lich-lam-viec/dang-ky', ten: 'Đăng ký ca', moTa: 'Đăng ký ca sáng, chiều', icon: <CarryOutOutlined /> },
        duyetCa && { den: '/lich-lam-viec/duyet', ten: 'Duyệt đăng ký ca', moTa: 'Duyệt, từ chối yêu cầu đăng ký', icon: <AuditOutlined />, so: soDangKyCa },
      ]) }] },
      { khoa: 'giam-sat', ten: 'Giám sát', moTa: 'Xem trang lễ tân, bác sĩ ở chế độ chỉ xem', icon: <EyeOutlined />, cot: [{ muc: loc([
        co('LICH_HEN.XEM') && { den: '/giam-sat/lich-hen', ten: 'Lịch hẹn', moTa: 'Lịch hẹn, check-in trong ngày', icon: <EyeOutlined /> },
        co('KHAM.XEM') && { den: '/giam-sat/lich-kham', ten: 'Lịch khám bác sĩ', moTa: 'Tiến độ khám của từng bác sĩ', icon: <MonitorOutlined /> },
      ]) }] },
      { khoa: 'quan-tri', ten: 'Quản trị', moTa: 'Báo cáo và cấu hình hệ thống', icon: <SettingOutlined />, cot: [
        { ten: 'BÁO CÁO', icon: <BarChartOutlined />, muc: loc([
          co('THONG_KE.XEM') && { den: '/quan-ly/thong-ke', ten: 'Thống kê', moTa: 'Doanh thu, lượt khám, xuất báo cáo', icon: <BarChartOutlined /> },
          co('THONG_KE.XEM') && { den: '/quan-ly/danh-gia', ten: 'Báo cáo đánh giá', moTa: 'Điểm hài lòng, phân tích cảm xúc', icon: <LikeOutlined /> },
          xuLyGopY && { den: '/quan-ly/gop-y', ten: 'Góp ý', moTa: 'Xử lý góp ý, khiếu nại', icon: <CommentOutlined />, so: soGopY },
        ]) },
        { ten: 'HỆ THỐNG', icon: <SafetyCertificateOutlined />, muc: loc([
          co('TAI_KHOAN.QUAN_LY') && { den: '/quan-ly/tai-khoan', ten: 'Quản lý tài khoản', moTa: 'Nhân viên, bệnh nhân, khóa, mật khẩu', icon: <TeamOutlined /> },
          co('VAI_TRO.QUAN_LY') && { den: '/quan-ly/phan-quyen', ten: 'Phân quyền', moTa: 'Quyền của từng vai trò', icon: <SafetyCertificateOutlined /> },
          co('DANH_MUC.QUAN_LY') && { den: '/quan-ly/danh-muc', ten: 'Danh mục', moTa: 'Chuyên khoa, phòng, dịch vụ, thuốc, ICD', icon: <AppstoreOutlined /> },
          co('MAT_BANG.QUAN_LY') && { den: '/quan-ly/mat-bang', ten: 'Sơ đồ mặt bằng', moTa: 'Vị trí phòng, đường đi, chỉ đường', icon: <ClusterOutlined /> },
          co('NHAT_KY.XEM') && { den: '/quan-ly/nhat-ky', ten: 'Nhật ký hệ thống', moTa: 'Thao tác quản trị, truy cập hồ sơ', icon: <FileSearchOutlined /> },
        ]) },
      ] },
    ]
    return ds.map((n) => ({ ...n, cot: n.cot.filter((c) => c.muc.length) })).filter((n) => n.cot.length)
  }, [co, danhGia, duyetCa, laLeTan, lamCls, soCho, soCls, soDangKyCa, soDanhGia, soGopY, soHoaDon, soHoan, soTamThu, thuTien, xuLyGopY])

  // Ngăn menu điện thoại: cùng các nhóm, hiện dạng danh sách dọc
  const menuDoc = useMemo<MucMenu[]>(() => [
    { key: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
    ...(co('LICH_HEN.DAT') ? [{ key: '/dat-lich', icon: <CalendarOutlined />, label: 'Đặt lịch khám' }] : []),
    ...nhomMenu.flatMap((n): MucMenu[] => {
      const muc = dsMuc(n).map((m) => ({ key: m.den, icon: m.icon, label: nhanSo(m.ten, m.so) }))
      return muc.length === 1 ? muc : [{ type: 'group', label: n.ten.toUpperCase(), children: muc }]
    }),
  ], [co, nhomMenu])

  const menuTaiKhoan: MenuProps['items'] = [
    { key: 'thong-tin', icon: <UserOutlined />, label: 'Thông tin cá nhân' },
    { key: 'doi-mat-khau', icon: <KeyOutlined />, label: 'Đổi mật khẩu' },
    { type: 'divider' },
    { key: 'dang-xuat', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ]
  const chonTaiKhoan: MenuProps['onClick'] = async ({ key }) => {
    setMoMenu(false)
    if (key === 'thong-tin') navigate('/ho-so')
    if (key === 'doi-mat-khau') navigate('/doi-mat-khau')
    if (key === 'dang-xuat') {
      await dangXuat()
      navigate('/dang-nhap', { replace: true })
    }
  }

  const anhDaiDien = <AnhDaiDien anh={nguoiDung.AnhDaiDien} hoTen={nguoiDung.HoTen} />
  const hienTai = location.pathname

  // Ngăn menu điện thoại: nền tối, danh sách dọc và tài khoản ở cuối
  const thanhBen = (
    <div className="thanh-ben">
      <Logo phu={TEN_VAI_TRO[nguoiDung.VaiTro]} den="/" onClick={() => setMoMenu(false)} />
      <Menu theme="dark" mode="inline" selectedKeys={[hienTai]} items={menuDoc} className="thanh-ben-menu"
        onClick={({ key }) => { setMoMenu(false); navigate(key) }} />
      <Dropdown menu={{ items: menuTaiKhoan, onClick: chonTaiKhoan }} trigger={['click']} placement="topLeft">
        <button type="button" className="thanh-ben-toi" aria-label="Tài khoản">
          {anhDaiDien}
          <span className="thanh-ben-toi-ten">
            <strong>{nguoiDung.HoTen}</strong>
            <small>{TEN_VAI_TRO[nguoiDung.VaiTro]}</small>
          </span>
          <MoreOutlined aria-hidden style={{ opacity: 0.7 }} />
        </button>
      </Dropdown>
    </div>
  )

  // Thanh ngang máy tính: nhóm nhiều chức năng mở bảng khi rê chuột, nhóm một chức năng là liên kết thẳng
  const menuNgang = (
    <nav className="menu-ngang" aria-label="Chức năng">
      <Link to="/" className={hienTai === '/' ? 'menu-ngang-muc dang-chon' : 'menu-ngang-muc'}>
        <HomeOutlined /> Trang chủ
      </Link>
      {nhomMenu.map((n) => {
        const muc = dsMuc(n)
        const lop = muc.some((m) => m.den === hienTai) ? 'menu-ngang-muc dang-chon' : 'menu-ngang-muc'
        if (muc.length === 1) {
          return (
            <Link key={n.khoa} to={muc[0].den} className={lop}>
              {muc[0].icon} {nhanSo(muc[0].ten, muc[0].so)}
            </Link>
          )
        }
        const so = tongSo(n)
        return (
          <Popover key={n.khoa} trigger="hover" placement="bottomLeft" arrow={false} mouseEnterDelay={0.05}
            open={moNhom === n.khoa} onOpenChange={(m) => setMoNhom(m ? n.khoa : null)} classNames={{ root: 'mega-pop' }}
            content={<BangNhom nhom={n} hienTai={hienTai} dong={() => setMoNhom(null)} />}>
            <button type="button" className={moNhom === n.khoa ? `${lop} dang-mo` : lop} aria-haspopup="true">
              {n.icon} <span className="menu-nhan">{n.ten}{so > 0 && <Badge count={so} size="small" />}</span>
              <DownOutlined className="menu-ngang-mui" />
            </button>
          </Popover>
        )
      })}
    </nav>
  )

  return (
    <Layout style={{ minHeight: '100dvh' }}>
      {/* Điện thoại: menu trượt từ trái, cùng các chức năng với thanh ngang */}
      <Drawer open={nho && moMenu} onClose={() => setMoMenu(false)} placement="left" size={280} closable={false}
        styles={{ body: { padding: 0, background: 'var(--toi)' } }}>
        {thanhBen}
      </Drawer>

      <Layout.Header className="dau-trang">
        <div className="dau-trang-khung">
          {nho && <Button type="text" icon={<MenuOutlined />} aria-label="Mở menu" onClick={() => setMoMenu(true)} />}
          <Logo den="/" />
          {!nho && menuNgang}
          <Space className="dau-trang-phai" size={8}>
            {/* Điện thoại: chỉ hiện khi đang ghi nhầm CSDL, để không chiếm chỗ của logo */}
            {csdl && (!nho || csdl !== 'phongkham') && (
              <Tooltip title="Chế độ thử: dữ liệu nhập trên giao diện được lưu vào CSDL này">
                <Tag color={csdl === 'phongkham' ? 'default' : 'orange'}
                  className={csdl === 'phongkham' ? 'dau-trang-csdl csdl-chinh' : 'dau-trang-csdl'}>
                  {nho ? csdl : `CSDL: ${csdl}`}
                </Tag>
              </Tooltip>
            )}
            {!nho && co('LICH_HEN.DAT') && (
              <Button className="nut-cam" icon={<CalendarOutlined />} aria-label="Đặt lịch khám" onClick={() => navigate('/dat-lich')}>
                <span className="chu-nut">Đặt lịch khám</span>
              </Button>
            )}
            <ChuongThongBao />
            {!nho && (
              <Dropdown menu={{ items: menuTaiKhoan, onClick: chonTaiKhoan }} trigger={['click']} placement="bottomRight">
                <button type="button" className="dau-trang-toi" aria-label="Tài khoản">
                  {anhDaiDien}
                  <span className="thanh-ben-toi-ten">
                    <strong>{nguoiDung.HoTen}</strong>
                    <small>{TEN_VAI_TRO[nguoiDung.VaiTro]}</small>
                  </span>
                  <DownOutlined className="menu-ngang-mui" />
                </button>
              </Dropdown>
            )}
          </Space>
        </div>
      </Layout.Header>

      <Layout.Content className="noi-dung">
        {/* Điện thoại: thẻ nội dung bớt lề trong để còn chỗ cho dữ liệu */}
        <ConfigProvider theme={nho ? { components: { Card: { bodyPadding: 16, headerPadding: 16 } } } : undefined}>
          {/* Chờ gói của trang tải xong mà vẫn giữ thanh menu */}
          <Suspense fallback={<Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>}>
            <Outlet />
          </Suspense>
        </ConfigProvider>
      </Layout.Content>
      <ChanTrang />
    </Layout>
  )
}
