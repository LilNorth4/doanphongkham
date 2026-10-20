import { BellOutlined } from '@ant-design/icons'
import { Badge, Button, Empty, Flex, Popover, Typography, theme } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type ThongBao } from '@/lib/api'
import { usePhien } from '@/lib/auth'

dayjs.extend(relativeTime)

/** UC1.8: chuông thông báo, tự cập nhật mỗi 30 giây; bấm vào thì mở trang liên quan. */
export default function ChuongThongBao() {
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const { nguoiDung } = usePhien()
  const [mo, setMo] = useState(false)
  const [ds, setDs] = useState<ThongBao[]>([])
  const [chuaDoc, setChuaDoc] = useState(0)

  const tai = useCallback(() => {
    api.thongBao().then((r) => { setDs(r.ds); setChuaDoc(r.chua_doc) }).catch(() => {})
  }, [])

  useEffect(() => {
    tai()
    const id = setInterval(tai, 30_000)
    return () => clearInterval(id)
  }, [tai])

  const duongDan = (tb: ThongBao) => {
    const laBenhNhan = nguoiDung?.VaiTro === 'BENH_NHAN'
    if (tb.LoaiDoiTuong === 'DANG_KY_CHO') return '/lich-hen-cua-toi?tab=cho'
    if (tb.LoaiDoiTuong === 'CA_LAM_VIEC') return tb.MaDoiTuong ? `/lich-lam-viec?ca=${tb.MaDoiTuong}` : '/lich-lam-viec'
    if (tb.LoaiDoiTuong === 'DANG_KY_CA') {
      return nguoiDung?.Quyen.includes('LICH_LV.QUAN_LY') ? '/lich-lam-viec/duyet' : '/lich-lam-viec/dang-ky'
    }
    if (tb.LoaiDoiTuong === 'LUOT_KHAM') {
      if (laBenhNhan) return '/lich-hen-cua-toi'
      if (nguoiDung?.Quyen.includes('LICH_HEN.DUYET')) return '/le-tan/lich-hen'
      if (nguoiDung?.Quyen.includes('KHAM.THUC_HIEN')) return '/bac-si/lich-kham'
    }
    return null
  }

  const bam = async (tb: ThongBao) => {
    if (!tb.DaDoc) {
      await api.daDocThongBao(tb.MaTB).catch(() => {})
      tai()
    }
    const den = duongDan(tb)
    if (den) {
      setMo(false)
      navigate(den)
    }
  }

  const noiDung = (
    <div style={{ width: 'min(380px, calc(100vw - 32px))' }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Typography.Text strong>Thông báo</Typography.Text>
        {chuaDoc > 0 && (
          <Button type="link" size="small" onClick={() => api.docHetThongBao().then(tai)}>Đánh dấu đã đọc tất cả</Button>
        )}
      </Flex>
      {ds.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" /> : (
        <div style={{ maxHeight: 420, overflowY: 'auto', marginInline: -12 }}>
          {ds.map((tb) => (
            <div key={tb.MaTB} onClick={() => bam(tb)} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && bam(tb)}
              style={{
                padding: '10px 12px', cursor: 'pointer', borderTop: `1px solid ${token.colorBorderSecondary}`,
                background: tb.DaDoc ? undefined : token.colorPrimaryBg,
              }}>
              <Flex justify="space-between" gap={8}>
                <Typography.Text strong={!tb.DaDoc}>{tb.TieuDe}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  {dayjs(tb.ThoiGianTao).fromNow()}
                </Typography.Text>
              </Flex>
              <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }} ellipsis={{ rows: 2 }}>
                {tb.NoiDung}
              </Typography.Paragraph>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Popover content={noiDung} trigger="click" open={mo} onOpenChange={(m) => { setMo(m); if (m) tai() }} placement="bottomRight">
      <Badge count={chuaDoc} size="small" offset={[-4, 4]}>
        <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 18 }} />} aria-label="Thông báo" />
      </Badge>
    </Popover>
  )
}
