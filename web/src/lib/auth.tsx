import { Flex, Spin } from 'antd'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, layToken, luuToken, SU_KIEN_HET_PHIEN, type NguoiDung } from '@/lib/api'

interface PhienDangNhap {
  nguoiDung: NguoiDung | null
  dangTai: boolean
  dangNhap: (dinhDanh: string, matKhau: string) => Promise<NguoiDung>
  dangXuat: () => Promise<void>
  taiLai: () => Promise<void>
}

const PhienContext = createContext<PhienDangNhap | null>(null)

export function PhienProvider({ children }: { children: ReactNode }) {
  const [nguoiDung, setNguoiDung] = useState<NguoiDung | null>(null)
  const [dangTai, setDangTai] = useState(() => layToken() !== null)

  const taiLai = useCallback(async () => {
    if (!layToken()) {
      setNguoiDung(null)
      return
    }
    try {
      setNguoiDung(await api.toi())
    } catch {
      setNguoiDung(null)
    }
  }, [])

  useEffect(() => {
    taiLai().finally(() => setDangTai(false))
    const hetPhien = () => setNguoiDung(null)
    window.addEventListener(SU_KIEN_HET_PHIEN, hetPhien)
    return () => window.removeEventListener(SU_KIEN_HET_PHIEN, hetPhien)
  }, [taiLai])

  const dangNhap = useCallback(async (dinhDanh: string, matKhau: string) => {
    const { Token, ...nd } = await api.dangNhap(dinhDanh, matKhau)
    luuToken(Token)
    setNguoiDung(nd)
    return nd
  }, [])

  const dangXuat = useCallback(async () => {
    try {
      await api.dangXuat()
    } catch {
      /* phiên đã hết hạn sẵn thì vẫn coi như đăng xuất */
    }
    luuToken(null)
    setNguoiDung(null)
  }, [])

  return (
    <PhienContext.Provider value={{ nguoiDung, dangTai, dangNhap, dangXuat, taiLai }}>
      {children}
    </PhienContext.Provider>
  )
}

export function usePhien() {
  const ctx = useContext(PhienContext)
  if (!ctx) throw new Error('usePhien phải dùng bên trong PhienProvider')
  return ctx
}

function DangTai() {
  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh' }}>
      <Spin size="large" />
    </Flex>
  )
}

/** Trang cần đăng nhập (và một trong các quyền nếu có); còn dùng mật khẩu tạm thì buộc sang trang đổi mật khẩu. */
export function CanDangNhap({ children, quyen }: { children: ReactNode; quyen?: string | string[] }) {
  const { nguoiDung, dangTai } = usePhien()
  const location = useLocation()
  if (dangTai) return <DangTai />
  if (!nguoiDung) {
    // Khách mở trang gốc thì xem trang giới thiệu; các trang khác vẫn đưa sang đăng nhập rồi quay lại
    return location.pathname === '/'
      ? <Navigate to="/gioi-thieu" replace />
      : <Navigate to="/dang-nhap" replace state={{ tu: location.pathname }} />
  }
  if (nguoiDung.PhaiDoiMatKhau && location.pathname !== '/doi-mat-khau') {
    return <Navigate to="/doi-mat-khau" replace />
  }
  if (quyen && ![quyen].flat().some((q) => nguoiDung.Quyen.includes(q))) return <Navigate to="/" replace />
  return children
}

/** Trang dành cho khách (đăng nhập, đăng ký...): đã đăng nhập thì về trang chủ. */
export function ChiKhach({ children }: { children: ReactNode }) {
  const { nguoiDung, dangTai } = usePhien()
  if (dangTai) return <DangTai />
  if (nguoiDung) return <Navigate to="/" replace />
  return children
}
