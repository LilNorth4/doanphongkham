import { DownloadOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  App, Button, Card, Col, DatePicker, Empty, Flex, List, Row, Segmented, Select, Skeleton, Space, Statistic, Table, Tabs, Tag,
  Typography, type TableColumnsType,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BieuDoCot from '@/components/BieuDoCot'
import { api, LoiApi, type BacSi, type ChuyenKhoa, type DongThongKe, type KenhDat, type KetQuaThongKe, type LoaiThongKe, type TongQuan } from '@/lib/api'
import { taiCsv, TEN_HINH_THUC, TEN_KENH, tien } from '@/lib/hangSo'
import { inTrang, thoat } from '@/lib/in'

type DinhDang = 'so' | 'tien' | 'phantram' | 'phut'
interface CotSo { khoa: string; ten: string; kieu: DinhDang }

const dinh = (v: unknown, kieu: DinhDang) => {
  const n = Number(v ?? 0)
  if (kieu === 'tien') return tien(n)
  if (kieu === 'phantram') return `${n.toLocaleString('vi-VN')}%`
  if (kieu === 'phut') return v == null ? '—' : `${n.toLocaleString('vi-VN')} phút`
  return n.toLocaleString('vi-VN')
}

/** Cột số liệu của từng loại thống kê (khớp ThongKeService). Cột đầu tiên là mặc định trên biểu đồ. */
const COT: Record<LoaiThongKe, CotSo[]> = {
  LUOT_KHAM: [
    { khoa: 'TongLich', ten: 'Tổng lịch', kieu: 'so' }, { khoa: 'HoanThanh', ten: 'Hoàn thành', kieu: 'so' },
    { khoa: 'DangXuLy', ten: 'Đang xử lý', kieu: 'so' }, { khoa: 'ChuaDen', ten: 'Chưa đến', kieu: 'so' },
    { khoa: 'DaHuy', ten: 'Đã hủy', kieu: 'so' }, { khoa: 'VangMat', ten: 'Vắng mặt', kieu: 'so' }, { khoa: 'CoBHYT', ten: 'Có BHYT', kieu: 'so' },
  ],
  DOANH_THU: [
    { khoa: 'Thuan', ten: 'Doanh thu thuần', kieu: 'tien' }, { khoa: 'TamThu', ten: 'Tạm thu CLS', kieu: 'tien' },
    { khoa: 'HoaDon', ten: 'Thu hóa đơn', kieu: 'tien' }, { khoa: 'HoanTien', ten: 'Đã hoàn', kieu: 'tien' },
  ],
  HUY_VANG: [
    { khoa: 'TiLeHuy', ten: 'Tỉ lệ hủy', kieu: 'phantram' }, { khoa: 'TiLeVang', ten: 'Tỉ lệ vắng', kieu: 'phantram' },
    { khoa: 'TongLich', ten: 'Tổng lịch', kieu: 'so' }, { khoa: 'DaHuy', ten: 'Đã hủy', kieu: 'so' }, { khoa: 'VangMat', ten: 'Vắng mặt', kieu: 'so' },
  ],
  HIEU_SUAT: [
    { khoa: 'HoanThanh', ten: 'Lượt hoàn thành', kieu: 'so' }, { khoa: 'TongLich', ten: 'Tổng lịch', kieu: 'so' },
    { khoa: 'VangMat', ten: 'Vắng mặt', kieu: 'so' }, { khoa: 'DaHuy', ten: 'Đã hủy', kieu: 'so' },
    { khoa: 'PhutKhamTB', ten: 'Phút khám TB', kieu: 'phut' }, { khoa: 'DiemDanhGiaTB', ten: 'Điểm đánh giá TB', kieu: 'so' },
    { khoa: 'SoDanhGia', ten: 'Số đánh giá', kieu: 'so' }, { khoa: 'DoanhThu', ten: 'Doanh thu', kieu: 'tien' },
  ],
  THOI_GIAN_CHO: [
    { khoa: 'PhutChoTB', ten: 'Chờ trung bình', kieu: 'phut' }, { khoa: 'SoLuot', ten: 'Số lượt', kieu: 'so' },
    { khoa: 'PhutChoLauNhat', ten: 'Chờ lâu nhất', kieu: 'phut' },
  ],
}

const TEN_LOAI: Record<LoaiThongKe, string> = {
  LUOT_KHAM: 'Lượt khám', DOANH_THU: 'Doanh thu & hoàn tiền', HUY_VANG: 'Hủy & vắng mặt', HIEU_SUAT: 'Hiệu suất bác sĩ',
  THOI_GIAN_CHO: 'Thời gian chờ',
}

/** Bảng nhóm phụ của từng loại: [khóa trong kết quả, tên cột nhóm, cách đọc tên nhóm]. */
const NHOM: Partial<Record<LoaiThongKe, [keyof KetQuaThongKe, string, (v: unknown) => string][]>> = {
  LUOT_KHAM: [['TheoChuyenKhoa', 'Chuyên khoa', String], ['TheoKenh', 'Kênh đặt', (v) => TEN_KENH[v as KenhDat] ?? String(v)]],
  DOANH_THU: [['TheoHinhThuc', 'Hình thức', (v) => (v ? TEN_HINH_THUC[v as 'TIEN_MAT'] ?? String(v) : '—')]],
  HUY_VANG: [['TheoKenh', 'Kênh đặt', (v) => TEN_KENH[v as KenhDat] ?? String(v)]],
  THOI_GIAN_CHO: [['TheoBacSi', 'Bác sĩ', String]],
}

const NHANH: { ten: string; tu: () => Dayjs }[] = [
  { ten: 'Hôm nay', tu: () => dayjs() },
  { ten: 'Tuần này', tu: () => dayjs().subtract((dayjs().day() + 6) % 7, 'day') },
  { ten: 'Tháng này', tu: () => dayjs().startOf('month') },
  { ten: 'Năm nay', tu: () => dayjs().startOf('year') },
]

/** UC13.1 dashboard tổng quan + UC13.2 thống kê theo tiêu chí, xuất Excel (CSV) hoặc in / lưu PDF. */
export default function ThongKe() {
  return (
    <Flex vertical gap={16}>
      <TongQuanNgay />
      <ThongKeTheoTieuChi />
    </Flex>
  )
}

function TongQuanNgay() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [d, setD] = useState<TongQuan | null>(null)
  const tai = useCallback(() => api.tongQuan().then(setD).catch((e) => message.error(e instanceof LoiApi ? e.message : 'Không tải được tổng quan')), [message])
  useEffect(() => { tai() }, [tai])
  if (!d) return <Card><Skeleton active /></Card>
  const tiLe = (a: number) => (d.LuotKham.LichThang ? `${Math.round((a / d.LuotKham.LichThang) * 1000) / 10}%` : '0%')
  const viec = [
    { ten: 'Hóa đơn chưa thanh toán', so: d.CanXuLy.HoaDonChuaThu, den: '/le-tan/thanh-toan' },
    { ten: 'Phiếu hoàn tiền chờ duyệt', so: d.CanXuLy.HoanChoDuyet, den: '/hoan-tien' },
    { ten: 'Phiếu hoàn tiền chờ chi', so: d.CanXuLy.HoanChoChi, den: '/hoan-tien' },
    { ten: 'Giao dịch MoMo chưa đối soát (quá 15 phút)', so: d.CanXuLy.MoMoChuaDoiSoat },
    { ten: 'Góp ý quá hạn phản hồi', so: d.CanXuLy.GopYQuaHan },
  ]
  return (
    <Card title={`Tổng quan · ${dayjs(d.Ngay).format('DD/MM/YYYY')}`} extra={<Button icon={<ReloadOutlined />} onClick={tai} aria-label="Làm mới" />}>
      <Row gutter={[12, 12]}>
        {[
          { ten: 'Lượt khám hôm nay', gt: d.LuotKham.HomNay, phu: `${d.LuotKham.HoanThanhHomNay} đã hoàn thành` },
          { ten: 'Doanh thu thuần hôm nay', gt: tien(d.DoanhThuHomNay.Thuan), phu: `Đã hoàn ${tien(d.DoanhThuHomNay.HoanTien)}` },
          { ten: 'Doanh thu thuần tháng', gt: tien(d.DoanhThuThang.Thuan), phu: `${d.LuotKham.Thang} lượt khám trong tháng` },
          { ten: 'Hủy / vắng mặt tháng', gt: `${tiLe(d.LuotKham.HuyThang)} / ${tiLe(d.LuotKham.VangThang)}`, phu: `${d.LuotKham.LichThang} lịch hẹn` },
        ].map((t) => (
          <Col xs={12} lg={6} key={t.ten}>
            <Card size="small">
              <Statistic title={t.ten} value={t.gt} styles={{ content: { fontSize: 22, fontWeight: 600 } }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.phu}</Typography.Text>
            </Card>
          </Col>
        ))}
        <Col xs={24} lg={14}>
          <Card size="small" title="Bệnh nhân đã đến khám · 7 ngày gần nhất">
            <BieuDoCot tieuDe="Bệnh nhân đã đến khám 7 ngày gần nhất" cao={200}
              duLieu={d.BayNgay.map((r) => ({ nhan: dayjs(r.Ngay).format('DD/MM'), giaTri: r.DaDen,
                chuThich: `${dayjs(r.Ngay).format('dd DD/MM')}: ${r.HoanThanh} hoàn thành, ${r.HuyVang} hủy/vắng` }))} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" title="Cần xử lý">
            <List size="small" dataSource={viec} renderItem={(v) => (
              <List.Item style={{ cursor: v.den ? 'pointer' : undefined }} onClick={() => v.den && navigate(v.den)}
                extra={<Tag color={v.so > 0 ? 'orange' : 'default'}>{v.so}</Tag>}>{v.ten}</List.Item>
            )} />
          </Card>
          <Card size="small" title="Lịch mới theo kênh (ngày / tháng)" style={{ marginTop: 12 }}>
            {d.LichMoiTheoKenh.length === 0 ? <Typography.Text type="secondary">Chưa có lịch mới</Typography.Text> : (
              <Flex vertical gap={4}>
                {d.LichMoiTheoKenh.map((k) => (
                  <Flex key={k.KenhDat} justify="space-between"><span>{TEN_KENH[k.KenhDat]}</span><span>{k.HomNay} / {k.Thang}</span></Flex>
                ))}
              </Flex>
            )}
          </Card>
        </Col>
      </Row>
    </Card>
  )
}

function ThongKeTheoTieuChi() {
  const { message } = App.useApp()
  const [loai, setLoai] = useState<LoaiThongKe>('LUOT_KHAM')
  const [khoang, setKhoang] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()])
  const [maCk, setMaCk] = useState<number>()
  const [maBs, setMaBs] = useState<number>()
  const [kenh, setKenh] = useState<KenhDat>()
  const [chiSo, setChiSo] = useState<string>(COT.LUOT_KHAM[0].khoa)
  const [kq, setKq] = useState<KetQuaThongKe | null>(null)
  const [dangTai, setDangTai] = useState(false)
  const [dsCk, setDsCk] = useState<ChuyenKhoa[]>([])
  const [dsBs, setDsBs] = useState<BacSi[]>([])

  useEffect(() => {
    api.dsChuyenKhoa().then(setDsCk).catch(() => {})
    api.dsBacSi().then(setDsBs).catch(() => {})
  }, [])

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      setKq(await api.thongKe(loai, {
        tu_ngay: khoang[0].format('YYYY-MM-DD'), den_ngay: khoang[1].format('YYYY-MM-DD'), ma_ck: maCk, ma_bs: maBs, kenh,
      }))
    } catch (e) {
      setKq(null)
      message.error(e instanceof LoiApi ? e.message : 'Không tải được thống kê')
    } finally {
      setDangTai(false)
    }
  }, [loai, khoang, maCk, maBs, kenh, message])
  useEffect(() => { tai() }, [tai])

  const cot = COT[loai]
  const theoBacSi = loai === 'HIEU_SUAT'
  const dongChinh: DongThongKe[] = (theoBacSi ? kq?.TheoBacSi : kq?.TheoNgay) ?? []
  const coDuLieu = theoBacSi ? dongChinh.length > 0 : dongChinh.some((r) => cot.some((c) => Number(r[c.khoa] ?? 0) !== 0))
  const cotChon = cot.find((c) => c.khoa === chiSo) ?? cot[0]

  const cotBang: TableColumnsType<DongThongKe> = useMemo(() => [
    theoBacSi
      ? { title: 'Bác sĩ', key: 'bs', fixed: 'left', render: (_, r) => <div>{r.BacSi}<div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.TenCK}</Typography.Text></div></div> }
      : { title: 'Ngày', dataIndex: 'Ngay', fixed: 'left', render: (n: string) => dayjs(n).format('dd DD/MM') },
    ...cot.map((c) => ({ title: c.ten, key: c.khoa, align: 'right' as const, render: (_: unknown, r: DongThongKe) => dinh(r[c.khoa], c.kieu) })),
  ], [cot, theoBacSi])

  const tenTep = `thong-ke-${loai.toLowerCase()}-${khoang[0].format('YYYYMMDD')}-${khoang[1].format('YYYYMMDD')}`
  const xuatCsv = () => taiCsv(`${tenTep}.csv`, [
    theoBacSi ? { ten: 'Bác sĩ', lay: (r: DongThongKe) => r.BacSi } : { ten: 'Ngày', lay: (r: DongThongKe) => dayjs(String(r.Ngay)).format('DD/MM/YYYY') },
    ...cot.map((c) => ({ ten: c.ten, lay: (r: DongThongKe) => r[c.khoa] ?? '' })),
  ], dongChinh)
  const inPdf = () => inTrang(tenTep, `<h1>Thống kê ${thoat(TEN_LOAI[loai].toLowerCase())}</h1>
<div class="giua">${khoang[0].format('DD/MM/YYYY')} – ${khoang[1].format('DD/MM/YYYY')}</div>
<table><thead><tr><th>${theoBacSi ? 'Bác sĩ' : 'Ngày'}</th>${cot.map((c) => `<th class="so">${thoat(c.ten)}</th>`).join('')}</tr></thead><tbody>
${dongChinh.map((r) => `<tr><td>${thoat(theoBacSi ? String(r.BacSi) : dayjs(String(r.Ngay)).format('DD/MM/YYYY'))}</td>${cot.map((c) => `<td class="so">${thoat(dinh(r[c.khoa], c.kieu))}</td>`).join('')}</tr>`).join('')}
${kq?.TongHop ? `<tr class="tong"><td>Tổng</td>${cot.map((c) => `<td class="so">${thoat(dinh(kq.TongHop![c.khoa], c.kieu))}</td>`).join('')}</tr>` : ''}
</tbody></table>`)

  return (
    <Card title="Thống kê và báo cáo">
      <Tabs activeKey={loai} onChange={(k) => { setLoai(k as LoaiThongKe); setChiSo(COT[k as LoaiThongKe][0].khoa) }}
        items={(Object.keys(TEN_LOAI) as LoaiThongKe[]).map((k) => ({ key: k, label: TEN_LOAI[k] }))} />
      {/* Bộ lọc một hàng trên biểu đồ */}
      <Flex gap={8} wrap align="center" style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker value={khoang} format="DD/MM/YYYY" allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), 'day')}
          onChange={(v) => v?.[0] && v[1] && setKhoang([v[0], v[1]])} />
        <Space.Compact>
          {NHANH.map((n) => <Button key={n.ten} onClick={() => setKhoang([n.tu(), dayjs()])}>{n.ten}</Button>)}
        </Space.Compact>
        <Select allowClear placeholder="Chuyên khoa" style={{ width: 160 }} value={maCk} onChange={setMaCk}
          options={dsCk.map((c) => ({ value: c.MaCK, label: c.TenCK }))} />
        <Select allowClear showSearch optionFilterProp="label" placeholder="Bác sĩ" style={{ width: 200 }} value={maBs} onChange={setMaBs}
          options={dsBs.filter((b) => !maCk || b.MaCK === maCk).map((b) => ({ value: b.MaBS, label: b.HoTen }))} />
        <Select allowClear placeholder="Kênh đặt" style={{ width: 140 }} value={kenh} onChange={setKenh}
          options={(Object.keys(TEN_KENH) as KenhDat[]).map((k) => ({ value: k, label: TEN_KENH[k] }))} />
        <Space style={{ marginInlineStart: 'auto' }}>
          <Button icon={<DownloadOutlined />} disabled={!coDuLieu} onClick={xuatCsv}>Xuất Excel</Button>
          <Button icon={<PrinterOutlined />} disabled={!coDuLieu} onClick={inPdf}>In / PDF</Button>
        </Space>
      </Flex>

      {dangTai && !kq ? <Skeleton active /> : !kq || !coDuLieu ? <Empty description="Không có dữ liệu trong khoảng thời gian đã chọn" /> : (
        <Flex vertical gap={16}>
          {kq.TongHop && (
            <Row gutter={[12, 12]}>
              {cot.slice(0, 4).map((c) => (
                <Col xs={12} md={6} key={c.khoa}>
                  <Card size="small"><Statistic title={c.ten} value={dinh(kq.TongHop![c.khoa], c.kieu)} styles={{ content: { fontSize: 20, fontWeight: 600 } }} /></Card>
                </Col>
              ))}
            </Row>
          )}
          <Card size="small" title={
            <Flex justify="space-between" align="center" wrap gap={8}>
              <span>{cotChon.ten} {theoBacSi ? 'theo bác sĩ' : 'theo ngày'}</span>
              <Segmented size="small" value={cotChon.khoa} onChange={(v) => setChiSo(String(v))}
                options={cot.slice(0, 5).map((c) => ({ value: c.khoa, label: c.ten }))} />
            </Flex>
          }>
            <BieuDoCot tieuDe={`${cotChon.ten} ${theoBacSi ? 'theo bác sĩ' : 'theo ngày'}`} dinhDang={(v) => dinh(v, cotChon.kieu)}
              duLieu={dongChinh.map((r) => ({
                nhan: theoBacSi ? String(r.BacSi).replace(/^BS\.\s*/, '').split(' ').slice(-1)[0] : dayjs(String(r.Ngay)).format('DD/MM'),
                giaTri: Number(r[cotChon.khoa] ?? 0),
                chuThich: theoBacSi ? String(r.BacSi) : dayjs(String(r.Ngay)).format('dddd DD/MM/YYYY'),
              }))} />
          </Card>
          <Table size="small" rowKey={(r) => String(theoBacSi ? r.MaBS : r.Ngay)} columns={cotBang} dataSource={dongChinh}
            pagination={dongChinh.length > 31 ? { pageSize: 31 } : false} scroll={{ x: 'max-content' }}
            summary={() => kq.TongHop ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><Typography.Text strong>Tổng</Typography.Text></Table.Summary.Cell>
                {cot.map((c, i) => <Table.Summary.Cell key={c.khoa} index={i + 1} align="right"><Typography.Text strong>{dinh(kq.TongHop![c.khoa], c.kieu)}</Typography.Text></Table.Summary.Cell>)}
              </Table.Summary.Row>
            ) : null} />
          {(NHOM[loai] ?? []).map(([khoa, ten, docTen]) => {
            const ds = (kq[khoa] as DongThongKe[] | undefined) ?? []
            return ds.length > 0 && (
              <Card size="small" key={String(khoa)} title={`Theo ${ten.toLowerCase()}`}>
                <Table size="small" pagination={false} rowKey={(r) => String(r.Nhom)} dataSource={ds} scroll={{ x: 'max-content' }}
                  columns={[{ title: ten, key: 'n', render: (_, r) => docTen(r.Nhom) },
                    ...cot.map((c) => ({ title: c.ten, key: c.khoa, align: 'right' as const, render: (_: unknown, r: DongThongKe) => dinh(r[c.khoa], c.kieu) }))]} />
              </Card>
            )
          })}
        </Flex>
      )}
    </Card>
  )
}
