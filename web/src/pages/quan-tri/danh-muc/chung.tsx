import { DeleteOutlined } from '@ant-design/icons'
import { App, Button, InputNumber, Popconfirm, Switch, Tag, type InputNumberProps } from 'antd'
import { useState } from 'react'
import { api, LoiApi, type TrangThaiDanhMuc } from '@/lib/api'

export const thongBaoLoi = (e: unknown) => (e instanceof LoiApi ? e.message : 'Có lỗi xảy ra')

/** Chuyển số dạng chuỗi từ API (DECIMAL) sang number cho InputNumber; null giữ null. */
export const so = (v: string | number | null | undefined) => (v == null ? null : Number(v))

/** Ô nhập số tiền (đồng), hiện dấu chấm phân cách hàng nghìn. Dùng trong Form.Item. */
export function ONhapTien(props: InputNumberProps<number>) {
  return (
    <InputNumber<number> min={0} step={1000} style={{ width: '100%' }} suffix="đ" {...props}
      formatter={(v) => (v == null || `${v}` === '' ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
      parser={(v) => Number((v ?? '').replace(/\./g, ''))} />
  )
}

export function TagTrangThai({ tt }: { tt: TrangThaiDanhMuc }) {
  return tt === 'HOAT_DONG' ? <Tag color="success">Hoạt động</Tag> : <Tag>Ngừng</Tag>
}

/**
 * Công tắc ngừng / mở lại một mục danh mục. Ngừng thì hỏi lại vì mục sẽ biến mất khỏi các màn hình đặt lịch, khám bệnh;
 * dữ liệu cũ đã dùng mục này vẫn giữ nguyên.
 */
export function CongTacTrangThai({ loai, ma, tt, ten, onXong }: {
  loai: Parameters<typeof api.doiTrangThaiDanhMuc>[0]
  ma: number | string
  tt: TrangThaiDanhMuc
  ten: string
  onXong: () => void
}) {
  const { message } = App.useApp()
  const [dangGui, setDangGui] = useState(false)
  const doi = async (hoatDong: boolean) => {
    setDangGui(true)
    try {
      await api.doiTrangThaiDanhMuc(loai, ma, hoatDong)
      message.success(hoatDong ? `Đã mở lại ${ten}` : `Đã ngừng ${ten}`)
      onXong()
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangGui(false)
    }
  }
  const dangHoatDong = tt === 'HOAT_DONG'
  if (!dangHoatDong) {
    return <Switch size="small" checked={false} loading={dangGui} onChange={() => doi(true)} aria-label={`Mở lại ${ten}`} />
  }
  return (
    <Popconfirm title={`Ngừng ${ten}?`} description="Mục ngừng sẽ không còn để chọn; dữ liệu cũ vẫn giữ nguyên."
      okText="Ngừng" okButtonProps={{ danger: true }} cancelText="Đóng" onConfirm={() => doi(false)}>
      <Switch size="small" checked loading={dangGui} aria-label={`Ngừng ${ten}`} />
    </Popconfirm>
  )
}

/** Nút xóa mục nhập nhầm; máy chủ chặn nếu mục đã được dùng (khi đó chỉ được ngừng). */
export function NutXoa({ ten, xoa, onXong }: { ten: string; xoa: () => Promise<unknown>; onXong: () => void }) {
  const { message } = App.useApp()
  const [dangGui, setDangGui] = useState(false)
  const chay = async () => {
    setDangGui(true)
    try {
      await xoa()
      message.success(`Đã xóa ${ten}`)
      onXong()
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangGui(false)
    }
  }
  return (
    <Popconfirm title={`Xóa ${ten}?`} description="Chỉ xóa được mục chưa dùng; mục đã dùng hãy ngừng để giữ lịch sử."
      okText="Xóa" okButtonProps={{ danger: true }} cancelText="Không" onConfirm={chay}>
      <Button size="small" danger icon={<DeleteOutlined />} loading={dangGui} aria-label={`Xóa ${ten}`} />
    </Popconfirm>
  )
}
