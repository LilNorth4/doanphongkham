import { ClockCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Calendar, Col, Empty, Flex, Row, Skeleton, Typography, theme } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type KhungGio, type NgayTrong } from '@/lib/api'
import { thuNgay } from '@/lib/hangSo'

interface Props {
  maCk?: number
  maBs?: number
  /** Lễ tân xếp khách vãng lai: chỉ các khung còn lại trong hôm nay (UC7.7). */
  vangLai?: boolean
  value?: KhungGio | null
  onChange: (kg: KhungGio | null) => void
  /** Bỏ qua khung giờ này (đang là lịch hiện tại khi đổi lịch). */
  boQuaMaKg?: number
  /** Nội dung hiện khi ngày đã chọn hết chỗ, VD nút đăng ký danh sách chờ. */
  khiHetCho?: (ngay: Dayjs | null) => ReactNode
}

/** Chọn ngày (chỉ ngày còn chỗ trong 30 ngày tới, BR02) rồi chọn khung giờ theo ca. */
export default function ChonKhungGio({ maCk, maBs, vangLai, value, onChange, boQuaMaKg, khiHetCho }: Props) {
  const { token } = theme.useToken()
  const [ngayTrong, setNgayTrong] = useState<NgayTrong[] | null>(null)
  const [ngay, setNgay] = useState<Dayjs | null>(vangLai ? dayjs() : null)
  const [khung, setKhung] = useState<KhungGio[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)

  // Ngày -> số khung còn trống; ngày có bác sĩ làm nhưng đã kín lịch có giá trị 0
  const soKhung = useMemo(() => new Map((ngayTrong ?? []).map((n) => [n.Ngay, Number(n.SoKhungTrong)])), [ngayTrong])
  const conTrong = (d: Dayjs) => (soKhung.get(d.format('YYYY-MM-DD')) ?? 0) > 0

  useEffect(() => {
    if (vangLai) return
    let huy = false
    setNgayTrong(null)
    api.ngayTrong({ ma_ck: maCk, ma_bs: maBs })
      .then((ds) => {
        if (huy) return
        setNgayTrong(ds)
        const dau = ds.find((n) => Number(n.SoKhungTrong) > 0)
        setNgay(dau ? dayjs(dau.Ngay) : null)
      })
      .catch((e) => !huy && setLoi(e.message))
    return () => { huy = true }
  }, [maCk, maBs, vangLai])

  useEffect(() => {
    if (!ngay) {
      setKhung([])
      return
    }
    let huy = false
    setKhung(null)
    api.khungGio({ ngay: ngay.format('YYYY-MM-DD'), ma_ck: maCk, ma_bs: maBs, vang_lai: vangLai })
      .then((ds) => !huy && setKhung(ds.filter((k) => k.MaKG !== boQuaMaKg)))
      .catch((e) => !huy && setLoi(e.message))
    return () => { huy = true }
  }, [ngay, maCk, maBs, vangLai, boQuaMaKg])

  if (loi) return <Alert type="error" showIcon title={loi} />

  const theoCa = (ca: KhungGio['CaLam']) => (khung ?? []).filter((k) => k.CaLam === ca)
  const nhieuBacSi = !maBs && new Set((khung ?? []).map((k) => k.MaBS)).size > 1

  const lyDoHetCho = () => {
    if (vangLai) return 'Hôm nay không còn khung giờ trống'
    if (ngay && soKhung.get(ngay.format('YYYY-MM-DD')) === 0) return 'Ngày này đã kín lịch'
    if (ngay?.isSame(dayjs(), 'day')) return 'Hôm nay không còn khung giờ nào chưa bắt đầu'
    return 'Ngày này không có lịch khám'
  }

  const danhSachKhung = (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        <ClockCircleOutlined /> {ngay ? thuNgay(ngay) : 'Chọn ngày khám'}
      </Typography.Title>
      {khung === null ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : khung.length === 0 ? (
        <>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={lyDoHetCho()} />
          {khiHetCho?.(ngay)}
        </>
      ) : (
        (['SANG', 'CHIEU'] as const).map((ca) => theoCa(ca).length > 0 && (
          <div key={ca} style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">{ca === 'SANG' ? 'Buổi sáng' : 'Buổi chiều'}</Typography.Text>
            <Flex wrap gap={8} style={{ marginTop: 8 }}>
              {theoCa(ca).map((k) => {
                const chon = value?.MaKG === k.MaKG
                return (
                  <Button key={k.MaKG} type={chon ? 'primary' : 'default'} onClick={() => onChange(chon ? null : k)}
                    style={{ height: 'auto', padding: '6px 12px', minWidth: 76 }}>
                    <Flex vertical align="center" style={{ lineHeight: 1.25 }}>
                      <span style={{ fontWeight: 600 }}>{k.GioBatDau}</span>
                      {nhieuBacSi && (
                        <span style={{ fontSize: 11, opacity: 0.8 }}>{k.BacSi.replace(/^BS\.\s*/, '')}</span>
                      )}
                    </Flex>
                  </Button>
                )
              })}
            </Flex>
          </div>
        ))
      )}
    </div>
  )

  if (vangLai) return danhSachKhung

  if (ngayTrong === null) return <Skeleton active paragraph={{ rows: 6 }} />
  // Có khiHetCho (đăng ký danh sách chờ) thì ngày đã kín vẫn chọn được, để hiện nút đăng ký chờ cho ngày đó.
  // Ngày không có bác sĩ làm (Chủ nhật, ngày chưa xếp ca) thì không chọn được: không có gì để chờ.
  const chonDuoc = (d: Dayjs) => conTrong(d) || (!!khiHetCho && soKhung.get(d.format('YYYY-MM-DD')) === 0)
  if (!ngayTrong.some((n) => Number(n.SoKhungTrong) > 0) && !khiHetCho) {
    return <Empty description="Không còn lịch trống trong 30 ngày tới" />
  }

  return (
    <Row gutter={[24, 16]}>
      <Col xs={24} md={11}>
        <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG }}>
          <Calendar
            fullscreen={false}
            value={ngay ?? dayjs()}
            validRange={[dayjs().startOf('day'), dayjs().add(30, 'day').endOf('day')]}
            disabledDate={(d) => !chonDuoc(d)}
            onSelect={(d, { source }) => {
              if (source === 'date' && chonDuoc(d)) {
                setNgay(d)
                onChange(null)
              }
            }}
            fullCellRender={(d, info) => {
              if (info.type !== 'date') return info.originNode
              const n = soKhung.get(d.format('YYYY-MM-DD'))
              const kin = n === 0
              const chon = ngay?.isSame(d, 'day')
              return (
                <div style={{
                  margin: '0 auto', width: 36, padding: '2px 0', borderRadius: 6, lineHeight: 1.2,
                  background: chon ? token.colorPrimary : undefined,
                  color: chon ? '#fff' : n ? token.colorText : token.colorTextDisabled,
                }}>
                  <div>{d.date()}</div>
                  <div style={{ fontSize: 10, color: chon ? '#fff' : kin ? token.colorError : token.colorSuccess, minHeight: 12 }}>
                    {kin ? 'Kín' : n || ''}
                  </div>
                </div>
              )
            }}
          />
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Số nhỏ dưới mỗi ngày là số khung giờ còn trống, "Kín" là ngày đã hết chỗ. Đặt được mọi khung giờ chưa bắt đầu.
          {khiHetCho && ' Ngày đã kín chỗ có thể đăng ký danh sách chờ.'}
        </Typography.Text>
      </Col>
      <Col xs={24} md={13}>{danhSachKhung}</Col>
    </Row>
  )
}
