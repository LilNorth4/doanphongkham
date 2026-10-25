import { Button, Card, Result, Spin } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, LoiApi, type GiaoDichMoMo } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { tien } from '@/lib/hangSo'

/**
 * MoMo đưa người dùng về đây sau khi thanh toán, kèm kết quả trên đường dẫn. Trang gửi kết quả về máy chủ;
 * máy chủ kiểm tra chữ ký và hỏi lại MoMo trước khi ghi nhận, không tin tham số trên đường dẫn.
 */
export default function KetQuaMoMo() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const laThuNgan = !!usePhien().nguoiDung?.Quyen.includes('THANH_TOAN.THU')
  const [gd, setGd] = useState<GiaoDichMoMo | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const daGui = useRef(false)

  useEffect(() => {
    if (daGui.current) return
    daGui.current = true
    const thamSo = Object.fromEntries(params.entries())
    if (!thamSo.orderId) {
      setLoi('Thiếu thông tin giao dịch MoMo')
      return
    }
    api.ketQuaMoMo(thamSo).then(setGd).catch((e) => setLoi(e instanceof LoiApi ? e.message : 'Không xác nhận được kết quả'))
  }, [params])

  // MoMo báo đang xử lý: hỏi lại vài lần
  useEffect(() => {
    if (gd?.TrangThai !== 'CHO_THANH_TOAN') return
    let lan = 0
    const id = setInterval(async () => {
      lan++
      try {
        const moi = await api.trangThaiMoMo(gd.MaDonMoMo)
        if (moi.TrangThai !== 'CHO_THANH_TOAN' || lan >= 10) {
          clearInterval(id)
          setGd(moi)
        }
      } catch { /* thử lại lần sau */ }
    }, 3000)
    return () => clearInterval(id)
  }, [gd])

  const veHoaDon = () => navigate(laThuNgan ? '/le-tan/thanh-toan' : `/hoa-don${gd?.MaHD ? `?hd=${gd.MaHD}` : ''}`)

  return (
    <Card>
      {loi ? (
        <Result status="error" title="Không xác nhận được thanh toán" subTitle={loi}
          extra={<Button type="primary" onClick={veHoaDon}>Về trang hóa đơn</Button>} />
      ) : !gd ? (
        <Result icon={<Spin size="large" />} title="Đang xác nhận thanh toán với MoMo…" />
      ) : gd.TrangThai === 'THANH_CONG' ? (
        <Result status="success" title={`Đã thanh toán ${tien(gd.SoTien)}`}
          subTitle={`Hóa đơn ${gd.MaSoHoaDon} · mã giao dịch MoMo ${gd.MaGiaoDichMoMo ?? ''}`}
          extra={<Button type="primary" onClick={veHoaDon}>Xem hóa đơn</Button>} />
      ) : gd.TrangThai === 'THAT_BAI' ? (
        <Result status="warning" title="Thanh toán chưa thành công" subTitle={gd.ThongDiep ?? 'Giao dịch bị hủy hoặc hết hạn'}
          extra={<Button type="primary" onClick={veHoaDon}>Về trang hóa đơn để thử lại</Button>} />
      ) : (
        <Result status="info" title="MoMo đang xử lý giao dịch"
          subTitle="Trang sẽ tự cập nhật. Nếu đã trừ tiền mà chưa thấy cập nhật, vui lòng báo quầy thu ngân."
          extra={<Button onClick={veHoaDon}>Về trang hóa đơn</Button>} />
      )}
    </Card>
  )
}
