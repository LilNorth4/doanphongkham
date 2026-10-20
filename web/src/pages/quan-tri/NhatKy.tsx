import { DownloadOutlined, FileSearchOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import {
  Alert, App, Button, Card, Col, DatePicker, Flex, Input, Row, Select, Switch, Tabs, Tag, Tooltip, Typography,
  type TableProps,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import BangThichUng from '@/components/BangThichUng'
import { api, LoiApi, type NhatKyThaoTac, type NhatKyTruyCap } from '@/lib/api'
import { MAU_VAI_TRO, taiCsv, TEN_HANH_DONG, TEN_THAO_TAC_HO_SO, TEN_VAI_TRO } from '@/lib/hangSo'

type Khoang = [Dayjs, Dayjs]
const MAC_DINH: Khoang = [dayjs().subtract(29, 'day'), dayjs()]
const NHANH: { label: string; value: Khoang }[] = [
  { label: 'Hôm nay', value: [dayjs(), dayjs()] },
  { label: '7 ngày qua', value: [dayjs().subtract(6, 'day'), dayjs()] },
  { label: '30 ngày qua', value: MAC_DINH },
  { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] },
]
const tg = (t: string) => dayjs(t).format('HH:mm:ss DD/MM/YYYY')
const TEN_DOI_TUONG: Record<string, string> = {
  TaiKhoan: 'Tài khoản', VaiTro: 'Vai trò', HoaDon: 'Hóa đơn', LuotKham: 'Lượt khám', BenhNhan: 'Bệnh nhân',
}
const doiTuong = (r: NhatKyThaoTac) =>
  r.TenDoiTuong ?? (r.MaDoiTuong ? `${TEN_DOI_TUONG[r.DoiTuong ?? ''] ?? r.DoiTuong ?? ''} ${r.MaDoiTuong}` : '—')

function useNhatKy<T>(tai: (loc: { tu_ngay: string; den_ngay: string }) => Promise<T[]>) {
  const { message } = App.useApp()
  const [khoang, setKhoang] = useState<Khoang>(MAC_DINH)
  const [ds, setDs] = useState<T[]>([])
  const [dangTai, setDangTai] = useState(false)
  const chay = useCallback(async () => {
    setDangTai(true)
    try {
      setDs(await tai({ tu_ngay: khoang[0].format('YYYY-MM-DD'), den_ngay: khoang[1].format('YYYY-MM-DD') }))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được nhật ký')
    } finally {
      setDangTai(false)
    }
  }, [tai, khoang, message])
  useEffect(() => { chay() }, [chay])
  return { khoang, setKhoang, ds, dangTai, chay }
}

function ThanhLoc({ khoang, setKhoang, chay, dangTai, children, onXuat }: {
  khoang: Khoang; setKhoang: (k: Khoang) => void; chay: () => void; dangTai: boolean
  children?: React.ReactNode; onXuat: () => void
}) {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
      <Col xs={24} md={8}>
        <DatePicker.RangePicker value={khoang} format="DD/MM/YYYY" allowClear={false} presets={NHANH}
          style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs(), 'day')}
          onChange={(v) => v && v[0] && v[1] && setKhoang([v[0], v[1]])} />
      </Col>
      {children}
      <Col flex="auto">
        <Flex justify="flex-end" gap={8}>
          <Button icon={<ReloadOutlined />} onClick={chay} loading={dangTai}>Làm mới</Button>
          <Button icon={<DownloadOutlined />} onClick={onXuat}>Xuất CSV</Button>
        </Flex>
      </Col>
    </Row>
  )
}

function TenNguoi({ ten, vaiTro }: { ten: string | null; vaiTro: keyof typeof TEN_VAI_TRO | null }) {
  if (!ten) return <Typography.Text type="secondary" italic>Hệ thống</Typography.Text>
  return (
    <div>
      {ten}
      {vaiTro && <div><Tag color={MAU_VAI_TRO[vaiTro]} style={{ fontSize: 11, lineHeight: '18px' }}>{TEN_VAI_TRO[vaiTro]}</Tag></div>}
    </div>
  )
}

function TabThaoTac() {
  const [hanhDong, setHanhDong] = useState<string>()
  const [tuKhoa, setTuKhoa] = useState('')
  const tai = useCallback((loc: { tu_ngay: string; den_ngay: string }) =>
    api.nhatKyThaoTac({ ...loc, hanh_dong: hanhDong, tu_khoa: tuKhoa || undefined }), [hanhDong, tuKhoa])
  const { khoang, setKhoang, ds, dangTai, chay } = useNhatKy(tai)

  const cot: TableProps<NhatKyThaoTac>['columns'] = [
    { title: 'Thời gian', dataIndex: 'ThoiGian', width: 160, render: tg },
    { title: 'Người thực hiện', key: 'nguoi', width: 200, render: (_, r) => <TenNguoi ten={r.NguoiThucHien} vaiTro={r.VaiTroNguoiThucHien} /> },
    {
      title: 'Hành động', dataIndex: 'HanhDong', width: 170,
      render: (h: string) => <Tag color={TEN_HANH_DONG[h]?.mau}>{TEN_HANH_DONG[h]?.ten ?? h}</Tag>,
    },
    {
      title: 'Đối tượng', key: 'dt', width: 200,
      render: (_, r) => doiTuong(r),
    },
    { title: 'Chi tiết', dataIndex: 'ChiTiet', render: (c) => c ?? <Typography.Text type="secondary">—</Typography.Text> },
  ]

  return (
    <>
      <ThanhLoc khoang={khoang} setKhoang={setKhoang} chay={chay} dangTai={dangTai}
        onXuat={() => taiCsv(`nhat-ky-thao-tac-${dayjs().format('YYYYMMDD')}.csv`, [
          { ten: 'Thời gian', lay: (r: NhatKyThaoTac) => tg(r.ThoiGian) },
          { ten: 'Người thực hiện', lay: (r) => r.NguoiThucHien ?? 'Hệ thống' },
          { ten: 'Hành động', lay: (r) => TEN_HANH_DONG[r.HanhDong]?.ten ?? r.HanhDong },
          { ten: 'Đối tượng', lay: doiTuong },
          { ten: 'Chi tiết', lay: (r) => r.ChiTiet },
        ], ds)}>
        <Col xs={12} md={5}>
          <Select allowClear placeholder="Mọi hành động" style={{ width: '100%' }} value={hanhDong} onChange={setHanhDong}
            options={Object.entries(TEN_HANH_DONG).map(([value, h]) => ({ value, label: h.ten }))} />
        </Col>
        <Col xs={12} md={5}>
          <Input.Search allowClear placeholder="Tìm người, nội dung" onSearch={(v) => setTuKhoa(v.trim())} />
        </Col>
      </ThanhLoc>
      <BangThichUng soCotTieuDe={2} rowKey="MaNK" size="small" columns={cot} dataSource={ds} loading={dangTai} scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, showTotal: (n) => `${n} bản ghi`, showSizeChanger: false }} />
    </>
  )
}

function TabTruyCap() {
  const [thaoTac, setThaoTac] = useState<string>()
  const [tuKhoa, setTuKhoa] = useState('')
  const [ngoaiDieuTri, setNgoaiDieuTri] = useState(false)
  const tai = useCallback((loc: { tu_ngay: string; den_ngay: string }) =>
    api.nhatKyTruyCap({ ...loc, thao_tac: thaoTac, tu_khoa: tuKhoa || undefined, ngoai_dieu_tri: ngoaiDieuTri }),
  [thaoTac, tuKhoa, ngoaiDieuTri])
  const { khoang, setKhoang, ds, dangTai, chay } = useNhatKy(tai)

  const quanHe = (r: NhatKyTruyCap) => r.LaBacSiDieuTri ? <Tag color="green">Bác sĩ điều trị</Tag>
    : r.LaChinhBenhNhan ? <Tag color="blue">Chính bệnh nhân</Tag>
      : <Tooltip title="Người truy cập không phải bác sĩ điều trị hay chính bệnh nhân, cần rà soát mục đích">
        <Tag color="orange" icon={<WarningOutlined />}>Ngoài điều trị</Tag>
      </Tooltip>

  const cot: TableProps<NhatKyTruyCap>['columns'] = [
    { title: 'Thời gian', dataIndex: 'ThoiGian', width: 160, render: tg },
    { title: 'Người truy cập', key: 'nguoi', width: 200, render: (_, r) => <TenNguoi ten={r.NguoiTruyCap} vaiTro={r.VaiTro} /> },
    { title: 'Thao tác', dataIndex: 'ThaoTac', width: 110, render: (t: string) => <Tag>{TEN_THAO_TAC_HO_SO[t] ?? t}</Tag> },
    {
      title: 'Hồ sơ bệnh án', key: 'hs',
      render: (_, r) => (
        <div>
          <Typography.Text strong>{r.BenhNhan}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Lượt khám {r.MaLichHen} · {dayjs(r.NgayKham).format('DD/MM/YYYY')} · {r.BacSiDieuTri}
          </Typography.Text></div>
        </div>
      ),
    },
    { title: 'Quan hệ', key: 'qh', width: 150, render: (_, r) => quanHe(r) },
  ]

  return (
    <>
      <ThanhLoc khoang={khoang} setKhoang={setKhoang} chay={chay} dangTai={dangTai}
        onXuat={() => taiCsv(`nhat-ky-truy-cap-ho-so-${dayjs().format('YYYYMMDD')}.csv`, [
          { ten: 'Thời gian', lay: (r: NhatKyTruyCap) => tg(r.ThoiGian) },
          { ten: 'Người truy cập', lay: (r) => r.NguoiTruyCap },
          { ten: 'Vai trò', lay: (r) => TEN_VAI_TRO[r.VaiTro] },
          { ten: 'Thao tác', lay: (r) => TEN_THAO_TAC_HO_SO[r.ThaoTac] ?? r.ThaoTac },
          { ten: 'Bệnh nhân', lay: (r) => r.BenhNhan },
          { ten: 'Lượt khám', lay: (r) => r.MaLichHen },
          { ten: 'Bác sĩ điều trị', lay: (r) => r.BacSiDieuTri },
          { ten: 'Quan hệ', lay: (r) => r.LaBacSiDieuTri ? 'Bác sĩ điều trị' : r.LaChinhBenhNhan ? 'Chính bệnh nhân' : 'Ngoài điều trị' },
        ], ds)}>
        <Col xs={12} md={4}>
          <Select allowClear placeholder="Mọi thao tác" style={{ width: '100%' }} value={thaoTac} onChange={setThaoTac}
            options={Object.entries(TEN_THAO_TAC_HO_SO).map(([value, label]) => ({ value, label }))} />
        </Col>
        <Col xs={12} md={5}>
          <Input.Search allowClear placeholder="Tìm người, bệnh nhân, mã" onSearch={(v) => setTuKhoa(v.trim())} />
        </Col>
        <Col xs={24} md={6}>
          <Flex align="center" gap={8} style={{ height: 32 }}>
            <Switch checked={ngoaiDieuTri} onChange={setNgoaiDieuTri} />
            <span>Chỉ truy cập ngoài điều trị</span>
          </Flex>
        </Col>
      </ThanhLoc>
      {ngoaiDieuTri && ds.length > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }}
          title={`${ds.length} lần truy cập hồ sơ bởi người không phải bác sĩ điều trị hay chính bệnh nhân`} />
      )}
      <BangThichUng soCotTieuDe={2} rowKey="MaNK" size="small" columns={cot} dataSource={ds} loading={dangTai} scroll={{ x: 'max-content' }}
        locale={{ emptyText: ngoaiDieuTri ? 'Không có lần truy cập ngoài điều trị nào trong khoảng thời gian này' : undefined }}
        pagination={{ pageSize: 20, showTotal: (n) => `${n} bản ghi`, showSizeChanger: false }} />
    </>
  )
}

/** UC2.8: nhật ký thao tác quản trị và nhật ký truy cập hồ sơ bệnh án. */
export default function NhatKy() {
  return (
    <Card>
      <Typography.Title level={4} style={{ marginTop: 0 }}><FileSearchOutlined /> Nhật ký hệ thống</Typography.Title>
      <Tabs items={[
        { key: 'thao-tac', label: 'Thao tác quản trị', children: <TabThaoTac /> },
        { key: 'truy-cap', label: 'Truy cập hồ sơ bệnh án', children: <TabTruyCap /> },
      ]} />
    </Card>
  )
}
