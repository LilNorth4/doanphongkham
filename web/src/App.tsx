import { Flex, Spin } from 'antd'
import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import { CanDangNhap, ChiKhach } from '@/lib/auth'

// Mỗi trang là một gói riêng, chỉ tải khi mở tới
const TrangChu = lazy(() => import('@/pages/TrangChu'))
// Xác thực
const DangKy = lazy(() => import('@/pages/xac-thuc/DangKy'))
const DangNhap = lazy(() => import('@/pages/xac-thuc/DangNhap'))
const DoiMatKhau = lazy(() => import('@/pages/xac-thuc/DoiMatKhau'))
const QuenMatKhau = lazy(() => import('@/pages/xac-thuc/QuenMatKhau'))
const XacThucEmail = lazy(() => import('@/pages/xac-thuc/XacThucEmail'))
// Bệnh nhân
const DatLich = lazy(() => import('@/pages/benh-nhan/DatLich'))
const LichHenCuaToi = lazy(() => import('@/pages/benh-nhan/LichHenCuaToi'))
const HoSoSucKhoe = lazy(() => import('@/pages/benh-nhan/HoSoSucKhoe'))
// Lễ tân
const DatLichHo = lazy(() => import('@/pages/le-tan/DatLichHo'))
const QuanLyLichHen = lazy(() => import('@/pages/le-tan/QuanLyLichHen'))
// Bác sĩ
const LichKham = lazy(() => import('@/pages/bac-si/LichKham'))
const KhamBenh = lazy(() => import('@/pages/bac-si/KhamBenh'))
// Lịch làm việc
const DangKyCa = lazy(() => import('@/pages/lich-lam-viec/DangKyCa'))
const DuyetDangKyCa = lazy(() => import('@/pages/lich-lam-viec/DuyetDangKyCa'))
const LichLamViec = lazy(() => import('@/pages/lich-lam-viec/LichLamViec'))
const HoSo = lazy(() => import('@/pages/HoSo'))
// Quản trị
const DanhMuc = lazy(() => import('@/pages/quan-tri/DanhMuc'))
const MatBang = lazy(() => import('@/pages/quan-tri/MatBang'))
const NhatKy = lazy(() => import('@/pages/quan-tri/NhatKy'))
const PhanQuyen = lazy(() => import('@/pages/quan-tri/PhanQuyen'))
const QuanLyTaiKhoan = lazy(() => import('@/pages/quan-tri/QuanLyTaiKhoan'))

type RouteItem = {
  path?: string
  index?: boolean
  element: ReactNode
}

const publicRoutes: RouteItem[] = [
  { path: '/dang-nhap', element: <ChiKhach><DangNhap /></ChiKhach> },
  { path: '/dang-ky', element: <ChiKhach><DangKy /></ChiKhach> },
  { path: '/xac-thuc-email', element: <ChiKhach><XacThucEmail /></ChiKhach> },
  { path: '/quen-mat-khau', element: <ChiKhach><QuenMatKhau /></ChiKhach> },
  { path: '/doi-mat-khau', element: <CanDangNhap><DoiMatKhau /></CanDangNhap> },
]

const privateRoutes: RouteItem[] = [
  { index: true, element: <TrangChu /> },
  { path: '/ho-so', element: <HoSo /> },
  { path: '/dat-lich', element: <CanDangNhap quyen="LICH_HEN.DAT"><DatLich /></CanDangNhap> },
  { path: '/lich-hen-cua-toi', element: <CanDangNhap quyen="LICH_HEN.DAT"><LichHenCuaToi /></CanDangNhap> },
  { path: '/ho-so-suc-khoe', element: <CanDangNhap quyen="HO_SO.XEM_CUA_MINH"><HoSoSucKhoe /></CanDangNhap> },
  { path: '/le-tan/lich-hen', element: <CanDangNhap quyen="LICH_HEN.DUYET"><QuanLyLichHen /></CanDangNhap> },
  { path: '/le-tan/dat-lich', element: <CanDangNhap quyen="LICH_HEN.DUYET"><DatLichHo /></CanDangNhap> },
  { path: '/bac-si/lich-kham', element: <CanDangNhap quyen="KHAM.THUC_HIEN"><LichKham /></CanDangNhap> },
  { path: '/bac-si/kham/:maLk', element: <CanDangNhap quyen={['KHAM.THUC_HIEN', 'KHAM.XEM']}><KhamBenh /></CanDangNhap> },
  { path: '/lich-lam-viec', element: <CanDangNhap quyen="LICH_LV.XEM"><LichLamViec /></CanDangNhap> },
  { path: '/lich-lam-viec/dang-ky', element: <CanDangNhap quyen="LICH_LV.DANG_KY"><DangKyCa /></CanDangNhap> },
  { path: '/lich-lam-viec/duyet', element: <CanDangNhap quyen="LICH_LV.QUAN_LY"><DuyetDangKyCa /></CanDangNhap> },
  // Giám sát: quản trị viên xem lại các trang của lễ tân, bác sĩ ở chế độ chỉ xem
  { path: '/giam-sat/lich-hen', element: <CanDangNhap quyen="LICH_HEN.XEM"><QuanLyLichHen /></CanDangNhap> },
  { path: '/giam-sat/lich-kham', element: <CanDangNhap quyen="KHAM.XEM"><LichKham /></CanDangNhap> },
  { path: '/quan-ly/tai-khoan', element: <CanDangNhap quyen="TAI_KHOAN.QUAN_LY"><QuanLyTaiKhoan /></CanDangNhap> },
  { path: '/quan-ly/phan-quyen', element: <CanDangNhap quyen="VAI_TRO.QUAN_LY"><PhanQuyen /></CanDangNhap> },
  { path: '/quan-ly/danh-muc', element: <CanDangNhap quyen="DANH_MUC.QUAN_LY"><DanhMuc /></CanDangNhap> },
  { path: '/quan-ly/mat-bang', element: <CanDangNhap quyen="MAT_BANG.QUAN_LY"><MatBang /></CanDangNhap> },
  { path: '/quan-ly/nhat-ky', element: <CanDangNhap quyen="NHAT_KY.XEM"><NhatKy /></CanDangNhap> },
]

export default function App() {
  return (
    <Suspense fallback={<Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>}>
      <Routes>
        {publicRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        <Route element={<CanDangNhap><AppLayout /></CanDangNhap>}>
          {privateRoutes.map(({ index, path, element }) => (
            <Route key={path ?? 'index'} index={index} path={path} element={element} />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
