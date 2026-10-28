import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons'
import { App, Button, Card, Drawer, Empty, Flex, List, Skeleton, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import XemHoaDon, { inHoaDon, TRANG_THAI_HOA_DON } from '@/components/XemHoaDon'
import { useManHinhNho } from '@/hooks/manHinh'
import { api, LoiApi, type DongHoaDon, type HoaDon } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { TEN_HINH_THUC, tien } from '@/lib/hangSo'

/** Logo chữ của MoMo cho nút thanh toán (màu nhận diện #A50064). */
const NUT_MOMO = { background: '#A50064', borderColor: '#A50064' }

/**
 * UC10.2: bệnh nhân xem hóa đơn các lượt khám và tự thanh toán phần còn lại qua ví MoMo:
 * bấm thanh toán thì chuyển sang trang MoMo, xong MoMo đưa về trang kết quả của phòng khám.
 */
export default function HoaDonCuaToi() {
  const { message } = App.useApp()
  const nho = useManHinhNho()
  // UC1.7: hóa đơn của người thân hiện tên người khám
  const toi = usePhien().nguoiDung?.HoTen
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [ds, setDs] = useState<DongHoaDon[] | null>(null)
  const [xem, setXem] = useState<HoaDon | null>(null)
  const [dangTra, setDangTra] = useState<number | null>(null)

  const tai = useCallback(() => {
    api.hoaDonCuaToi().then(setDs).catch((e) => message.error(e instanceof LoiApi ? e.message : 'Không tải được hóa đơn'))
  }, [message])
  useEffect(() => { tai() }, [tai])

  const moXem = useCallback(async (maHd: number) => {
    try {
      setXem(await api.hoaDonCuaToiChiTiet(maHd))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được hóa đơn')
    }
  }, [message])

  // Mở từ thông báo: /hoa-don?hd=123
  useEffect(() => {
    const ma = Number(params.get('hd'))
    if (ma) moXem(ma)
  }, [params, moXem])

  const traMoMo = async (maHd: number) => {
    setDangTra(maHd)
    try {
      const lenh = await api.momoCuaToi(maHd)
      window.location.href = lenh.pay_url
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tạo được lệnh thanh toán MoMo')
      setDangTra(null)
    }
  }

  return (
    <Card>
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Hóa đơn của tôi</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={tai} aria-label="Làm mới" />
      </Flex>
      {ds === null ? <Skeleton active /> : ds.length === 0 ? <Empty description="Chưa có hóa đơn nào" /> : (
        <List dataSource={ds} renderItem={(h) => {
          const chuaTra = h.TrangThai === 'CHUA_THANH_TOAN'
          const conLai = Math.max(Number(h.ConPhaiThu), 0)
          return (
            <List.Item style={{ display: 'block' }}>
              <Flex justify="space-between" gap={12} wrap align="center">
                <div>
                  <Flex gap={8} align="center" wrap>
                    <Typography.Text strong>{dayjs(h.NgayKham).format('DD/MM/YYYY')}</Typography.Text>
                    <Tag color={TRANG_THAI_HOA_DON[h.TrangThai].mau}>{TRANG_THAI_HOA_DON[h.TrangThai].ten}</Tag>
                    {h.BenhNhan && h.BenhNhan !== toi && <Tag color="purple">{h.BenhNhan}</Tag>}
                  </Flex>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {h.BacSi}{h.TenCK && ` · ${h.TenCK}`} · {h.MaSoHoaDon}
                  </Typography.Text>
                  <div style={{ marginTop: 4 }}>
                    {chuaTra
                      ? <>Còn phải thanh toán <Typography.Text strong style={{ fontSize: 16 }}>{tien(conLai)}</Typography.Text></>
                      : <Typography.Text type="secondary">Đã thanh toán {h.HinhThuc && TEN_HINH_THUC[h.HinhThuc].toLowerCase()} · {dayjs(h.NgayThanhToan).format('DD/MM/YYYY')}</Typography.Text>}
                  </div>
                </div>
                <Flex gap={8} wrap style={nho ? { width: '100%' } : undefined}>
                  <Button onClick={() => moXem(h.MaHD)} style={nho ? { flex: 1 } : undefined}>Chi tiết</Button>
                  {!chuaTra && h.NgayThanhToan && dayjs().diff(dayjs(h.NgayThanhToan), 'day', true) < 7 && (
                    <Button onClick={() => navigate(`/danh-gia?luot=${h.MaLK}`)} style={nho ? { flex: 1 } : undefined}>Đánh giá</Button>
                  )}
                  {chuaTra && conLai >= 1000 && (
                    <Button type="primary" style={{ ...NUT_MOMO, ...(nho ? { flex: 2 } : {}) }} loading={dangTra === h.MaHD}
                      onClick={() => traMoMo(h.MaHD)}>
                      Thanh toán bằng MoMo
                    </Button>
                  )}
                </Flex>
              </Flex>
            </List.Item>
          )
        }} />
      )}
      <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}>
        Có thể thanh toán tại quầy thu ngân (tiền mặt, chuyển khoản, quét mã MoMo) hoặc tự thanh toán bằng ví MoMo tại đây.
      </Typography.Paragraph>

      <Drawer open={!!xem} onClose={() => setXem(null)} size={nho ? '100%' : 640} title={xem ? `Hóa đơn ${xem.MaSoHoaDon}` : ''}
        extra={xem && <Button icon={<PrinterOutlined />} onClick={() => inHoaDon(xem)}>In</Button>}>
        {xem && (
          <Flex vertical gap={16}>
            <XemHoaDon hd={xem} />
            {xem.TrangThai === 'CHUA_THANH_TOAN' && Number(xem.ConPhaiThu) >= 1000 && (
              <Button type="primary" size="large" block style={NUT_MOMO} loading={dangTra === xem.MaHD} onClick={() => traMoMo(xem.MaHD)}>
                Thanh toán {tien(xem.ConPhaiThu)} bằng MoMo
              </Button>
            )}
            {xem.MoMoThu && xem.TrangThai === 'CHUA_THANH_TOAN' && (
              <Typography.Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                Đang dùng môi trường thử của MoMo, không trừ tiền thật.
              </Typography.Text>
            )}
          </Flex>
        )}
      </Drawer>
    </Card>
  )
}
