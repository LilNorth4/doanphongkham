import { TeamOutlined } from '@ant-design/icons'
import { Select, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type NguoiThan } from '@/lib/api'
import { usePhien } from '@/lib/auth'

export interface NguoiKham { MaBN: number; HoTen: string; QuanHe: string | null }

/** Bản thân và người thân đã liên kết (UC1.7) của tài khoản đang đăng nhập; bản thân luôn đứng đầu. */
export function useNguoiKham() {
  const nguoiDung = usePhien().nguoiDung
  const [nguoiThan, setNguoiThan] = useState<NguoiThan[]>([])
  useEffect(() => { api.dsNguoiThan().then(setNguoiThan).catch(() => setNguoiThan([])) }, [])
  const ds: NguoiKham[] = nguoiDung?.MaBN ? [{ MaBN: nguoiDung.MaBN, HoTen: nguoiDung.HoTen, QuanHe: null }] : []
  for (const n of nguoiThan) {
    if (n.TrangThai === 'DA_LIEN_KET') ds.push({ MaBN: n.MaBN, HoTen: n.HoTen, QuanHe: n.QuanHe })
  }
  return ds
}

export const tenNguoiKham = (n: NguoiKham) => (n.QuanHe ? `${n.HoTen} (${n.QuanHe})` : `${n.HoTen} (bản thân)`)

/**
 * Chọn người khám: bản thân hoặc người thân. value undefined = bản thân. Không có người thân thì chỉ hiện gợi ý thêm.
 * ds truyền từ useNguoiKham() của trang cha để dùng chung một lần tải.
 */
export default function ChonNguoiKham({ ds, value, onChange, nhan = 'Người khám', choPhepTatCa = false }: {
  ds: NguoiKham[]; value?: number; onChange: (maBn?: number) => void; nhan?: string; choPhepTatCa?: boolean
}) {
  if (ds.length <= 1) {
    return choPhepTatCa ? null : (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        <TeamOutlined /> Đặt lịch, xem hồ sơ cho con, bố mẹ? <Link to="/nguoi-than">Thêm hồ sơ người thân</Link>
      </Typography.Text>
    )
  }
  const tatCa = choPhepTatCa ? [{ value: 0, label: 'Tất cả' }] : []
  return (
    <Space wrap>
      <Typography.Text strong><TeamOutlined /> {nhan}</Typography.Text>
      <Select style={{ minWidth: 240 }} value={value ?? (choPhepTatCa ? 0 : ds[0].MaBN)}
        onChange={(v: number) => onChange(v === 0 ? undefined : v)}
        options={[...tatCa, ...ds.map((n) => ({ value: n.MaBN, label: tenNguoiKham(n) }))]} />
    </Space>
  )
}
