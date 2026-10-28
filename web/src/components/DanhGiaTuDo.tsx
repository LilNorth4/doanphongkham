import { SearchOutlined, SendOutlined } from '@ant-design/icons'
import { Alert, App, Avatar, Button, Card, Col, Collapse, Empty, Flex, Input, Rate, Row, Skeleton, Tag, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { chuCaiDau } from '@/components/AnhDaiDien'
import { api, LoiApi, type BieuMauTuDo, type CotTieuChi, type NhanVienDanhGia } from '@/lib/api'
import { TIEU_CHI_DANH_GIA } from '@/lib/hangSo'

const NHAN_SAO = ['Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt']

/** Dòng mô tả ngắn của một nhân viên: chuyên khoa / phòng phụ trách, điểm hiện tại. */
const moTa = (n: NhanVienDanhGia) => [n.HocHamHocVi, n.TenCK, n.MaSoPhong && `Phòng ${n.MaSoPhong}`,
  n.DiemDanhGiaTB && `${Number(n.DiemDanhGiaTB).toFixed(1)}★ (${n.SoLuotDanhGia})`].filter(Boolean).join(' · ')

/**
 * Đánh giá tự do, gửi bất kỳ lúc nào (không cần sau khám): chấm cơ sở vật chất, dịch vụ...; chấm lễ tân, bác sĩ nào
 * cũng được (không bắt buộc chấm hết); và viết góp ý. Chỉ cần một mục là gửi được.
 */
export default function DanhGiaTuDo({ onXong }: { onXong: () => void }) {
  const { message } = App.useApp()
  const [mau, setMau] = useState<BieuMauTuDo | null>(null)
  const [diem, setDiem] = useState<Partial<Record<CotTieuChi, number>>>({})
  const [nv, setNv] = useState<Record<number, { diem: number; nhanXet: string }>>({})
  const [gopY, setGopY] = useState('')
  const [tim, setTim] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)

  useEffect(() => { api.bieuMauTuDo().then(setMau).catch(() => setMau({ TieuChi: {} as never, NhomNhanVien: {}, NhanVien: [] })) }, [])

  const soDiem = Object.values(diem).filter(Boolean).length
  const soNv = Object.values(nv).filter((x) => x.diem > 0).length
  const coNoiDung = soDiem > 0 || soNv > 0 || gopY.trim().length > 0

  const nhom = useMemo(() => {
    if (!mau) return []
    const k = tim.trim().toLowerCase()
    return Object.entries(mau.NhomNhanVien).map(([loai, ten]) => ({
      loai, ten,
      ds: mau.NhanVien.filter((n) => n.LoaiNhanVien === loai
        && (!k || n.HoTen.toLowerCase().includes(k) || (n.TenCK ?? '').toLowerCase().includes(k))),
    })).filter((g) => g.ds.length > 0)
  }, [mau, tim])

  const gui = async () => {
    setLoi(null)
    setDangGui(true)
    try {
      await api.guiDanhGiaTuDo({
        diem_dich_vu: diem,
        nhan_vien: Object.entries(nv).filter(([, x]) => x.diem > 0)
          .map(([ma, x]) => ({ ma_nv: Number(ma), diem: x.diem, nhan_xet: x.nhanXet.trim() || null })),
        gop_y: gopY.trim() || null,
      })
      message.success('Cảm ơn bạn đã đánh giá! Ý kiến đã được gửi tới phòng khám.')
      setDiem({}); setNv({}); setGopY('')
      onXong()
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Không gửi được đánh giá')
    } finally {
      setDangGui(false)
    }
  }

  if (!mau) return <Card><Skeleton active /></Card>

  return (
    <Card title="Đánh giá phòng khám" extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>Không cần đã khám · chấm mục nào cũng được</Typography.Text>}>
      <Typography.Title level={5} style={{ marginTop: 0 }}>Cơ sở vật chất và dịch vụ</Typography.Title>
      <Row gutter={[16, 8]}>
        {TIEU_CHI_DANH_GIA.map((t) => (
          <Col xs={24} md={12} key={t.cot}>
            <Flex align="center" justify="space-between" gap={8} wrap>
              <Typography.Text>{t.ten}</Typography.Text>
              <Rate value={diem[t.cot] ?? 0} tooltips={NHAN_SAO} allowClear
                onChange={(v) => setDiem((d) => ({ ...d, [t.cot]: v || undefined }))} />
            </Flex>
          </Col>
        ))}
      </Row>

      <Flex justify="space-between" align="center" wrap gap={8} style={{ margin: '20px 0 8px' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>Đánh giá nhân viên {soNv > 0 && <Tag color="blue">Đã chấm {soNv}</Tag>}</Typography.Title>
        <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm tên, chuyên khoa" value={tim} onChange={(e) => setTim(e.target.value)}
          style={{ maxWidth: 260 }} />
      </Flex>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Chỉ chấm những người bạn đã gặp; không cần chấm hết danh sách.
      </Typography.Paragraph>
      {nhom.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy nhân viên" /> : (
        <Collapse defaultActiveKey={['LE_TAN', 'BAC_SI']} items={nhom.map((g) => ({
          key: g.loai,
          label: <>{g.ten} <Typography.Text type="secondary">({g.ds.length})</Typography.Text></>,
          children: (
            <Flex vertical gap={12}>
              {g.ds.map((n) => {
                const x = nv[n.MaNV]
                return (
                  <div key={n.MaNV}>
                    <Flex align="center" gap={12} wrap>
                      <Avatar src={n.AnhDaiDien ?? undefined}>{chuCaiDau(n.HoTen)}</Avatar>
                      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                        <Typography.Text strong>{n.HoTen}</Typography.Text>
                        <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{moTa(n)}</Typography.Text></div>
                      </div>
                      <Rate value={x?.diem ?? 0} tooltips={NHAN_SAO} allowClear aria-label={`Chấm ${n.HoTen}`}
                        onChange={(v) => setNv((d) => ({ ...d, [n.MaNV]: { diem: v, nhanXet: d[n.MaNV]?.nhanXet ?? '' } }))} />
                    </Flex>
                    {!!x?.diem && (
                      <Input maxLength={500} placeholder={`Nhận xét về ${n.HoTen} (không bắt buộc)`} value={x.nhanXet}
                        style={{ marginTop: 6, marginInlineStart: 44, width: 'calc(100% - 44px)' }}
                        onChange={(e) => setNv((d) => ({ ...d, [n.MaNV]: { ...d[n.MaNV], nhanXet: e.target.value } }))} />
                    )}
                  </div>
                )
              })}
            </Flex>
          ),
        }))} />
      )}

      <Typography.Title level={5} style={{ margin: '20px 0 8px' }}>Góp ý cho phòng khám</Typography.Title>
      <Input.TextArea value={gopY} onChange={(e) => setGopY(e.target.value)} autoSize={{ minRows: 3, maxRows: 8 }} maxLength={2000} showCount
        placeholder="Điều bạn hài lòng, điều cần cải thiện về thời gian chờ, tiếp đón, cơ sở vật chất, chi phí..." />

      {loi && <Alert type="error" showIcon title={loi} style={{ marginTop: 12 }} />}
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginTop: 16 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {coNoiDung ? `${soDiem} mục dịch vụ · ${soNv} nhân viên${gopY.trim() ? ' · có góp ý' : ''}` : 'Chấm ít nhất một mục hoặc viết góp ý để gửi'}
        </Typography.Text>
        <Button type="primary" icon={<SendOutlined />} disabled={!coNoiDung} loading={dangGui} onClick={gui}>Gửi đánh giá</Button>
      </Flex>
    </Card>
  )
}
