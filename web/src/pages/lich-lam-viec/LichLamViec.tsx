import { LeftOutlined, PlusOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons'
import {
  App, Button, Card, Col, DatePicker, Flex, Row, Segmented, Select, Space, Tooltip, Typography, theme, type TableProps,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, LoiApi, type BacSi, type CaLam, type CaLamViec, type ChuyenKhoa } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import BangThichUng from '@/components/BangThichUng'
import ChiTietCaLamViec from '@/pages/lich-lam-viec/ChiTietCaLamViec'
import { useManHinhNho } from '@/hooks/manHinh'
import TaoCaLamViec, { type MacDinhTaoCa } from '@/pages/lich-lam-viec/TaoCaLamViec'
import { CA_LAM, caDaNghi, DS_CA_LAM, moc } from '@/lib/hangSo'

/** Ô một ca trong lịch tuần: phòng và số khung giờ còn trống. */
function OCa({ ca, onMo }: { ca: CaLamViec; onMo: () => void }) {
  const { token } = theme.useToken()
  const nghi = caDaNghi(ca)
  const qua = moc(ca.NgayLam, CA_LAM[ca.CaLam].ketThuc).isBefore(dayjs())
  const mau = nghi ? token.colorError : ca.SoTrong > 0 ? token.colorSuccess : token.colorTextSecondary
  return (
    <button type="button" onClick={onMo} style={{
      display: 'block', width: '100%', minWidth: 92, textAlign: 'left', cursor: 'pointer', font: 'inherit',
      padding: '4px 8px', borderRadius: token.borderRadiusSM, border: `1px solid ${token.colorBorderSecondary}`,
      borderInlineStart: `3px solid ${mau}`, background: qua ? token.colorFillQuaternary : token.colorBgContainer,
      color: token.colorText, opacity: qua ? 0.7 : 1,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>
        {ca.CaLam === 'SANG' ? 'Sáng' : 'Chiều'} · {ca.MaSoPhong}
      </div>
      <div style={{ fontSize: 12, color: mau }}>
        {nghi ? 'Đã hủy' : `${ca.SoTrong}/${ca.TongKhung} trống`}
        {!nghi && ca.SoKhoa > 0 && <span style={{ color: token.colorTextTertiary }}> · khóa {ca.SoKhoa}</span>}
      </div>
    </button>
  )
}

/** Gói 4: lịch làm việc theo tuần của các bác sĩ; quản trị viên xếp ca, bác sĩ khóa khung giờ của mình. */
export default function LichLamViec() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const nho = useManHinhNho()
  const { nguoiDung } = usePhien()
  const [params, setParams] = useSearchParams()
  const [tuan, setTuan] = useState<Dayjs>(dayjs().startOf('week'))
  const [maCk, setMaCk] = useState<number>()
  const laBacSi = nguoiDung?.VaiTro === 'BAC_SI'
  const [cuaToi, setCuaToi] = useState(laBacSi)
  const [dsCk, setDsCk] = useState<ChuyenKhoa[]>([])
  const [dsBs, setDsBs] = useState<BacSi[]>([])
  const [dsCa, setDsCa] = useState<CaLamViec[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [maCa, setMaCa] = useState<number | null>(null)
  const [taoCa, setTaoCa] = useState<MacDinhTaoCa | null>(null)
  const quanLy = !!nguoiDung?.Quyen.includes('LICH_LV.QUAN_LY')
  // Bác sĩ chỉ xem lịch của bác sĩ cùng chuyên khoa (backend cũng giới hạn như vậy)
  const cungKhoa = laBacSi && !quanLy

  // Ổn định để ngăn chi tiết không tải lại ca mỗi lần trang render
  const dongCa = useCallback(() => setMaCa(null), [])
  const ngays = useMemo(() => Array.from({ length: 6 }, (_, i) => tuan.add(i, 'day')), [tuan])

  const tai = useCallback(async () => {
    if (cungKhoa && !cuaToi && maCk == null) return
    setDangTai(true)
    try {
      const [bs, ca] = await Promise.all([
        api.dsBacSi(maCk),
        api.dsCa({
          tu_ngay: tuan.format('YYYY-MM-DD'), den_ngay: tuan.add(5, 'day').format('YYYY-MM-DD'), ma_ck: maCk,
          ma_bs: cuaToi && nguoiDung?.MaNV ? nguoiDung.MaNV : undefined,
        }),
      ])
      setDsBs(bs)
      setDsCa(ca)
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được lịch làm việc')
    } finally {
      setDangTai(false)
    }
  }, [tuan, maCk, cuaToi, cungKhoa, nguoiDung?.MaNV, message])

  useEffect(() => { tai() }, [tai])
  useEffect(() => { api.dsChuyenKhoa().then(setDsCk).catch(() => {}) }, [])
  useEffect(() => {
    if (!cungKhoa) return
    api.dsBacSi().then((d) => setMaCk(d.find((b) => b.MaBS === nguoiDung?.MaNV)?.MaCK)).catch(() => {})
  }, [cungKhoa, nguoiDung?.MaNV])

  // Mở từ thông báo: /lich-lam-viec?ca=123 -> nhảy tới tuần của ca và mở chi tiết
  useEffect(() => {
    const ma = Number(params.get('ca'))
    if (!ma) return
    setParams({}, { replace: true })
    api.chiTietCa(ma).then((ca) => {
      setTuan(dayjs(ca.NgayLam).startOf('week'))
      setMaCa(ma)
    }).catch(() => message.warning('Ca làm việc không còn tồn tại'))
  }, [params, setParams, message])

  const theoO = useMemo(() => {
    const m = new Map<string, CaLamViec>()
    dsCa.forEach((c) => m.set(`${c.MaBS}|${c.NgayLam}|${c.CaLam}`, c))
    return m
  }, [dsCa])

  const dong = cuaToi ? dsBs.filter((b) => b.MaBS === nguoiDung?.MaNV) : dsBs
  const homNay = dayjs()

  const oNgay = (bs: BacSi, ngay: Dayjs) => {
    const d = ngay.format('YYYY-MM-DD')
    const o = DS_CA_LAM.map((c: CaLam) => {
      const ca = theoO.get(`${bs.MaBS}|${d}|${c}`)
      if (ca) return <OCa key={c} ca={ca} onMo={() => setMaCa(ca.MaCa)} />
      if (quanLy && moc(d, CA_LAM[c].batDau).isAfter(homNay)) {
        return (
          <Tooltip key={c} title={`Thêm ${CA_LAM[c].ten.toLowerCase()}`}>
            <Button size="small" type="dashed" block icon={<PlusOutlined />} style={{ color: token.colorTextTertiary }}
              onClick={() => setTaoCa({ ma_bs: bs.MaBS, ngay, ca: c })}>
              {c === 'SANG' ? 'Sáng' : 'Chiều'}
            </Button>
          </Tooltip>
        )
      }
      return null
    }).filter(Boolean)
    return o.length ? <Flex vertical gap={4}>{o}</Flex> : <Typography.Text type="secondary">—</Typography.Text>
  }

  const cot: TableProps<BacSi>['columns'] = [
    {
      title: 'Bác sĩ', key: 'bs', fixed: nho ? undefined : 'left', width: 190,
      render: (_, b) => (
        <div>
          <Typography.Text strong>{b.HoTen}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{b.TenCK}</Typography.Text></div>
        </div>
      ),
    },
    ...ngays.map((n) => ({
      key: n.format('YYYY-MM-DD'), width: 120,
      title: (
        <span style={n.isSame(homNay, 'day') ? { color: token.colorPrimary } : undefined}>
          {`T${n.day() + 1}`} <span style={{ fontWeight: 400 }}>{n.format('DD/MM')}</span>
        </span>
      ),
      render: (_: unknown, b: BacSi) => oNgay(b, n),
    })),
  ]

  const tongCa = dsCa.filter((c) => !caDaNghi(c))
  const thongKe = [
    { ten: 'Số ca', so: tongCa.length },
    { ten: 'Khung giờ trống', so: tongCa.reduce((s, c) => s + Number(c.SoTrong), 0) },
    { ten: 'Đã đặt', so: tongCa.reduce((s, c) => s + Number(c.SoDaDat), 0) },
    { ten: 'Đã khóa', so: tongCa.reduce((s, c) => s + Number(c.SoKhoa), 0) },
  ]

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Lịch làm việc</Typography.Title>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={tai} loading={dangTai} aria-label="Làm mới" />
          {quanLy && <Button type="primary" icon={<PlusOutlined />} onClick={() => setTaoCa({})}>Tạo ca</Button>}
        </Space>
      </Flex>

      <Flex gap={12} wrap align="center" style={{ marginBottom: 12 }}>
        <Space.Compact>
          <Button icon={<LeftOutlined />} onClick={() => setTuan(tuan.subtract(1, 'week'))} aria-label="Tuần trước" />
          <DatePicker picker="week" value={tuan} allowClear={false} style={{ width: nho ? 170 : 220 }}
            onChange={(d) => d && setTuan(d.startOf('week'))}
            format={(d) => `${d.startOf('week').format('DD/MM')} – ${d.startOf('week').add(5, 'day').format(nho ? 'DD/MM' : 'DD/MM/YYYY')}`} />
          <Button icon={<RightOutlined />} onClick={() => setTuan(tuan.add(1, 'week'))} aria-label="Tuần sau" />
        </Space.Compact>
        {!tuan.isSame(homNay.startOf('week'), 'day') && (
          <Button type="link" onClick={() => setTuan(homNay.startOf('week'))}>Tuần này</Button>
        )}
        {laBacSi && (
          <Segmented value={cuaToi ? 'toi' : 'tat-ca'} onChange={(v) => setCuaToi(v === 'toi')}
            options={[{ value: 'toi', label: 'Lịch của tôi' }, { value: 'tat-ca', label: cungKhoa ? 'Cùng khoa' : 'Tất cả' }]} />
        )}
        {!cuaToi && !cungKhoa && (
          <Select allowClear placeholder="Tất cả chuyên khoa" style={{ width: 200 }} value={maCk} onChange={setMaCk}
            options={dsCk.map((c) => ({ value: c.MaCK, label: c.TenCK }))} />
        )}
      </Flex>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {thongKe.map((t) => (
          <Col xs={12} md={6} key={t.ten}>
            <Card size="small" styles={{ body: { padding: nho ? '8px 10px' : 12 } }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.ten}</Typography.Text>
              <div style={{ fontSize: nho ? 18 : 22, fontWeight: 600 }}>{t.so}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <BangThichUng rowKey="MaBS" columns={cot} dataSource={dong} loading={dangTai} size="small" pagination={false}
        bordered scroll={{ x: 'max-content' }}
        locale={{ emptyText: cuaToi ? 'Bạn chưa có hồ sơ bác sĩ' : 'Không có bác sĩ' }} />

      <ChiTietCaLamViec maCa={maCa} onDong={dongCa} onDoi={tai} />
      <TaoCaLamViec macDinh={taoCa} dsBs={dsBs} onDong={() => setTaoCa(null)}
        onXong={() => { setTaoCa(null); tai() }} />
    </Card>
  )
}
