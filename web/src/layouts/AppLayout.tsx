import {
  AuditOutlined, CalendarOutlined, CarryOutOutlined, EyeOutlined, FileSearchOutlined, FormOutlined, HomeOutlined, KeyOutlined,
  LogoutOutlined, MenuOutlined, MonitorOutlined, MoreOutlined, PhoneOutlined, SafetyCertificateOutlined, ScheduleOutlined, SolutionOutlined,
  TableOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { Badge, Button, ConfigProvider, Drawer, Dropdown, Flex, Layout, Menu, Spin, type MenuProps } from 'antd'
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AnhDaiDien from '@/components/AnhDaiDien'
import ChuongThongBao from '@/components/ChuongThongBao'
import { useManHinhNho } from '@/hooks/manHinh'
import { api } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { SU_KIEN_SO_CHO, SU_KIEN_SO_DANG_KY_CA, TEN_VAI_TRO, thuNgay } from '@/lib/hangSo'
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

const nhanSo = (ten: string, so: number): ReactNode => (
  <span className="menu-nhan">{ten}{so > 0 && <Badge count={so} size="small" />}</span>
)

const nhom = (ten: string, muc: (MucMenu | false)[]): MucMenu[] => {
  const con = muc.filter(Boolean) as MucMenu[]
  return con.length ? [{ type: 'group', label: ten, children: con }] : []
}

/** Khung sau khi đăng nhập: thanh bên tối chứa menu theo quyền và tài khoản, nội dung trên nền xám nhạt. */
export default function AppLayout() {
  const { nguoiDung, dangXuat, taiLai } = usePhien()
  const navigate = useNavigate()
  const location = useLocation()
  const nho = useManHinhNho()
  const [moMenu, setMoMenu] = useState(false)
  const co = (q: string) => !!nguoiDung?.Quyen.includes(q)
  const laLeTan = co('LICH_HEN.DUYET')
  const duyetCa = co('LICH_LV.QUAN_LY')
  const soCho = useSoDem(laLeTan, api.soChoXacNhan, SU_KIEN_SO_CHO, 30_000)
  const soDangKyCa = useSoDem(duyetCa, api.soDangKyChoDuyet, SU_KIEN_SO_DANG_KY_CA, 60_000)

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

  if (!nguoiDung) return null

  const menu = useMemo<MucMenu[]>(() => [
    { key: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
    ...nhom('KHÁM BỆNH', [
      co('LICH_HEN.DAT') && { key: '/dat-lich', icon: <CalendarOutlined />, label: 'Đặt lịch khám' },
      co('LICH_HEN.DAT') && { key: '/lich-hen-cua-toi', icon: <ScheduleOutlined />, label: 'Lịch hẹn của tôi' },
      laLeTan && { key: '/le-tan/lich-hen', icon: <SolutionOutlined />, label: nhanSo('Quản lý lịch hẹn', soCho) },
      laLeTan && { key: '/le-tan/dat-lich', icon: <PhoneOutlined />, label: 'Đặt lịch hộ' },
      co('KHAM.THUC_HIEN') && { key: '/bac-si/lich-kham', icon: <FormOutlined />, label: 'Lịch khám' },
    ]),
    ...nhom('LỊCH LÀM VIỆC', [
      co('LICH_LV.XEM') && { key: '/lich-lam-viec', icon: <TableOutlined />, label: 'Lịch làm việc' },
      co('LICH_LV.DANG_KY') && { key: '/lich-lam-viec/dang-ky', icon: <CarryOutOutlined />, label: 'Đăng ký ca' },
      duyetCa && { key: '/lich-lam-viec/duyet', icon: <AuditOutlined />, label: nhanSo('Duyệt đăng ký ca', soDangKyCa) },
    ]),
    ...nhom('GIÁM SÁT', [
      co('LICH_HEN.XEM') && { key: '/giam-sat/lich-hen', icon: <EyeOutlined />, label: 'Lịch hẹn' },
      co('KHAM.XEM') && { key: '/giam-sat/lich-kham', icon: <MonitorOutlined />, label: 'Lịch khám bác sĩ' },
    ]),
    ...nhom('QUẢN TRỊ', [
      co('TAI_KHOAN.QUAN_LY') && { key: '/quan-ly/tai-khoan', icon: <TeamOutlined />, label: 'Quản lý tài khoản' },
      co('VAI_TRO.QUAN_LY') && { key: '/quan-ly/phan-quyen', icon: <SafetyCertificateOutlined />, label: 'Phân quyền' },
      co('NHAT_KY.XEM') && { key: '/quan-ly/nhat-ky', icon: <FileSearchOutlined />, label: 'Nhật ký hệ thống' },
    ]),
  ], [co, duyetCa, laLeTan, soCho, soDangKyCa])

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

  const thanhBen = (
    <div className="thanh-ben">
      <Logo phu={TEN_VAI_TRO[nguoiDung.VaiTro]} den="/" onClick={() => setMoMenu(false)} />
      <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menu} className="thanh-ben-menu"
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

  return (
    <Layout style={{ minHeight: '100dvh' }}>
      {!nho && <Layout.Sider width={232} className="sider-co-dinh">{thanhBen}</Layout.Sider>}

      {/* Điện thoại: thanh bên trượt từ trái, cùng nội dung với bản máy tính */}
      <Drawer open={nho && moMenu} onClose={() => setMoMenu(false)} placement="left" size={280} closable={false}
        styles={{ body: { padding: 0, background: 'var(--toi)' } }}>
        {thanhBen}
      </Drawer>

      <Layout>
        <Layout.Header className={nho ? 'dau-trang dau-trang-nho' : 'dau-trang'}>
          {nho ? (
            <>
              <Button type="text" icon={<MenuOutlined />} aria-label="Mở menu" onClick={() => setMoMenu(true)}
                style={{ color: '#fff' }} />
              <Logo den="/" />
            </>
          ) : <span className="dau-trang-ngay">{thuNgay(dayjs())}</span>}
          <span style={{ marginInlineStart: 'auto' }}><ChuongThongBao /></span>
        </Layout.Header>
        <Layout.Content className="noi-dung">
          {/* Điện thoại: thẻ nội dung bớt lề trong để còn chỗ cho dữ liệu */}
          <ConfigProvider theme={nho ? { components: { Card: { bodyPadding: 16, headerPadding: 16 } } } : undefined}>
            {/* Chờ gói của trang tải xong mà vẫn giữ thanh bên */}
            <Suspense fallback={<Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>}>
              <Outlet />
            </Suspense>
          </ConfigProvider>
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
