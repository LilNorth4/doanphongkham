import { BulbOutlined, DownloadOutlined, ExperimentOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  Alert, App, Button, Card, Col, DatePicker, Drawer, Empty, Flex, List, Row, Segmented, Select, Skeleton, Space, Statistic, Table,
  Typography, type TableColumnsType,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import BieuDoCot, { MAU_COT } from '@/components/BieuDoCot'
import { useManHinhNho } from '@/hooks/manHinh'
import { api, LoiApi, type BacSi, type BaoCaoDanhGia as BaoCao, type CamXuc, type ChuyenKhoa, type DanhGia } from '@/lib/api'
import { CAM_XUC, taiCsv, TEN_CHU_DE_DANH_GIA, TIEU_CHI_DANH_GIA } from '@/lib/hangSo'
import { XemDanhGia } from '@/pages/benh-nhan/DanhGiaCuaToi'

/** Màu ngữ nghĩa cho phần tiêu cực (đỏ lỗi của giao diện); phần tích cực dùng màu cột chung. */
const MAU_TIEU_CUC = '#D92D20'
const so2 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 2 }))
const phanTram = (a: number, b: number) => (b ? Math.round((a * 100) / b) : 0)

const NHANH: { ten: string; tu: () => Dayjs }[] = [
  { ten: 'Tháng này', tu: () => dayjs().startOf('month') },
  { ten: '3 tháng', tu: () => dayjs().subtract(3, 'month').startOf('month') },
  { ten: 'Năm nay', tu: () => dayjs().startOf('year') },
]

/**
 * UC13.3: báo cáo phân tích đánh giá: điểm trung bình bác sĩ và 6 tiêu chí, tỉ lệ cảm xúc, xu hướng theo tháng,
 * chủ đề được nhắc tới (tích cực / tiêu cực) và đoạn tổng hợp tự động; chọn chủ đề để xem các đánh giá liên quan.
 */
export default function BaoCaoDanhGia() {
  const { message } = App.useApp()
  const nho = useManHinhNho()
  const [khoang, setKhoang] = useState<[Dayjs, Dayjs]>([dayjs().subtract(3, 'month').startOf('month'), dayjs()])
  const [maCk, setMaCk] = useState<number>()
  const [maBs, setMaBs] = useState<number>()
  const [dsCk, setDsCk] = useState<ChuyenKhoa[]>([])
  const [dsBs, setDsBs] = useState<BacSi[]>([])
  const [kq, setKq] = useState<BaoCao | null>(null)
  const [dangTai, setDangTai] = useState(false)
  const [dangPhanTich, setDangPhanTich] = useState(false)
  const [xem, setXem] = useState<{ tieuDe: string; chu_de?: string; cam_xuc?: CamXuc } | null>(null)

  useEffect(() => {
    api.dsChuyenKhoa().then(setDsCk).catch(() => {})
    api.dsBacSi().then(setDsBs).catch(() => {})
  }, [])

  const loc = { tu_ngay: khoang[0].format('YYYY-MM-DD'), den_ngay: khoang[1].format('YYYY-MM-DD'), ma_ck: maCk, ma_bs: maBs }
  const khoaLoc = JSON.stringify(loc)
  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      setKq(await api.baoCaoDanhGia(JSON.parse(khoaLoc)))
    } catch (e) {
      setKq(null)
      message.error(e instanceof LoiApi ? e.message : 'Không tải được báo cáo')
    } finally {
      setDangTai(false)
    }
  }, [khoaLoc, message])
  useEffect(() => { tai() }, [tai])

  const phanTich = async () => {
    setDangPhanTich(true)
    try {
      const r = await api.phanTichDanhGia()
      message.success(r.so_luong ? `Đã phân tích ${r.so_luong} đánh giá, góp ý` : 'Không còn nội dung chờ phân tích')
      tai()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không phân tích được')
    } finally {
      setDangPhanTich(false)
    }
  }

  const t = kq?.TongQuan
  const tong = Number(t?.SoDanhGia ?? 0)
  const tieuChi = t ? [
    { ten: 'Bác sĩ', diem: t.DiemBacSi },
    ...TIEU_CHI_DANH_GIA.map((c) => ({ ten: c.ten, diem: t[c.cot] ?? null })),
  ] : []
  const maxChuDe = Math.max(1, ...(kq?.ChuDe ?? []).map((c) => Number(c.TichCuc) + Number(c.TrungTinh) + Number(c.TieuCuc)))

  const cotBacSi: TableColumnsType<BaoCao['BacSi'][number]> = [
    { title: 'Bác sĩ', key: 'bs', render: (_, r) => <div>{r.HoTen}<div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.TenCK}</Typography.Text></div></div> },
    { title: 'Số đánh giá', dataIndex: 'SoDanhGia', align: 'right' },
    { title: 'Điểm TB', dataIndex: 'DiemBacSi', align: 'right', render: (v) => `${so2(v)} ★` },
    { title: 'Tiêu cực', dataIndex: 'TieuCuc', align: 'right' },
  ]

  const xuatCsv = () => kq && taiCsv(`bao-cao-danh-gia-${khoang[0].format('YYYYMMDD')}-${khoang[1].format('YYYYMMDD')}.csv`, [
    { ten: 'Bác sĩ', lay: (r: BaoCao['BacSi'][number]) => r.HoTen },
    { ten: 'Chuyên khoa', lay: (r) => r.TenCK ?? '' },
    { ten: 'Số đánh giá', lay: (r) => r.SoDanhGia },
    { ten: 'Điểm trung bình', lay: (r) => r.DiemBacSi ?? '' },
    { ten: 'Đánh giá tiêu cực', lay: (r) => r.TieuCuc },
  ], kq.BacSi)

  return (
    <Flex vertical gap={16}>
      <Card>
        <Flex justify="space-between" align="center" gap={8} wrap style={{ marginBottom: 12 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Báo cáo đánh giá</Typography.Title>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={xuatCsv} disabled={!kq?.BacSi.length}>Xuất CSV</Button>
            <Button icon={<ReloadOutlined />} onClick={tai} aria-label="Làm mới" />
          </Space>
        </Flex>
        <Flex gap={8} wrap align="center">
          <DatePicker.RangePicker value={khoang} format="DD/MM/YYYY" allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), 'day')}
            onChange={(v) => v?.[0] && v[1] && setKhoang([v[0], v[1]])} style={nho ? { width: '100%' } : undefined} />
          <Segmented options={NHANH.map((n) => n.ten)} value={NHANH.find((n) => n.tu().isSame(khoang[0], 'day'))?.ten ?? ''}
            onChange={(v) => setKhoang([NHANH.find((n) => n.ten === v)!.tu(), dayjs()])} />
          <Select allowClear placeholder="Chuyên khoa" style={{ width: 160 }} value={maCk} onChange={(v) => { setMaCk(v); setMaBs(undefined) }}
            options={dsCk.map((c) => ({ value: c.MaCK, label: c.TenCK }))} />
          <Select allowClear showSearch optionFilterProp="label" placeholder="Bác sĩ" style={{ width: 200 }} value={maBs} onChange={setMaBs}
            options={dsBs.filter((b) => !maCk || b.MaCK === maCk).map((b) => ({ value: b.MaBS, label: b.HoTen }))} />
        </Flex>
      </Card>

      {!kq ? <Card><Skeleton active /></Card> : tong === 0 ? (
        <Card><Empty description="Chưa có đánh giá nào trong khoảng thời gian này" /></Card>
      ) : (
        <>
          {t!.ChuaPhanTich > 0 && (
            <Alert type="info" showIcon title={`${t!.ChuaPhanTich} đánh giá chưa được phân tích cảm xúc, chủ đề (tác vụ chạy mỗi giờ)`}
              action={<Button size="small" icon={<ExperimentOutlined />} loading={dangPhanTich} onClick={phanTich}>Phân tích ngay</Button>} />
          )}
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><Card><Statistic title="Số đánh giá" value={tong} loading={dangTai} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Điểm bác sĩ TB" value={so2(t!.DiemBacSi)} suffix="/ 5" /></Card></Col>
            <Col xs={12} md={6}>
              <Card hoverable onClick={() => setXem({ tieuDe: 'Đánh giá tích cực', cam_xuc: 'TICH_CUC' })}>
                <Statistic title="Tích cực" value={phanTram(t!.TichCuc, tong)} suffix="%" />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t!.TichCuc} đánh giá · trung tính {t!.TrungTinh}</Typography.Text>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card hoverable onClick={() => setXem({ tieuDe: 'Đánh giá tiêu cực', cam_xuc: 'TIEU_CUC' })}>
                <Statistic title="Tiêu cực" value={phanTram(t!.TieuCuc, tong)} suffix="%"
                  styles={{ content: t!.TieuCuc ? { color: MAU_TIEU_CUC } : undefined }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t!.TieuCuc} đánh giá</Typography.Text>
              </Card>
            </Col>
          </Row>

          <Card title={<><BulbOutlined /> Tổng hợp điểm mạnh và vấn đề cần cải thiện</>}>
            {kq.TongHop.CoTongHop ? (
              <Flex vertical gap={12}>
                <Typography.Text>{kq.TongHop.MoDau}</Typography.Text>
                <Row gutter={[24, 12]}>
                  <Col xs={24} md={12}>
                    <Typography.Text strong style={{ color: MAU_COT }}>Điểm mạnh</Typography.Text>
                    {kq.TongHop.DiemManh.length ? <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>{kq.TongHop.DiemManh.map((d) => <li key={d}>{d}</li>)}</ul>
                      : <div><Typography.Text type="secondary">Chưa có tiêu chí nổi bật (≥ 4 sao)</Typography.Text></div>}
                  </Col>
                  <Col xs={24} md={12}>
                    <Typography.Text strong style={{ color: MAU_TIEU_CUC }}>Cần cải thiện</Typography.Text>
                    {kq.TongHop.CanCaiThien.length ? <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>{kq.TongHop.CanCaiThien.map((d) => <li key={d}>{d}</li>)}</ul>
                      : <div><Typography.Text type="secondary">Không có tiêu chí dưới 3,5 sao hay chủ đề bị phàn nàn</Typography.Text></div>}
                  </Col>
                </Row>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Tổng hợp tự động từ điểm số và kết quả phân tích theo từ khóa trong kỳ.
                </Typography.Text>
              </Flex>
            ) : <Typography.Text type="secondary">{kq.TongHop.LyDo}. Bảng số liệu bên dưới vẫn đầy đủ.</Typography.Text>}
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Điểm trung bình theo tiêu chí" style={{ height: '100%' }}>
                <Flex vertical gap={10}>
                  {tieuChi.map((c) => (
                    <div key={c.ten}>
                      <Flex justify="space-between"><span>{c.ten}</span><Typography.Text strong>{so2(c.diem)}</Typography.Text></Flex>
                      <div style={{ height: 8, background: '#EEF2F1', borderRadius: 4 }} aria-hidden>
                        <div style={{ width: `${(Number(c.diem ?? 0) / 5) * 100}%`, height: 8, background: MAU_COT, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </Flex>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Chủ đề được nhắc đến" style={{ height: '100%' }}>
                <Space size={12} style={{ fontSize: 12, marginBottom: 12 }}>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: MAU_COT, borderRadius: 2 }} /> Tích cực</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: MAU_TIEU_CUC, borderRadius: 2 }} /> Tiêu cực</span>
                </Space>
                {kq.ChuDe.length === 0 ? <Empty description="Chưa có chủ đề (đánh giá chưa phân tích hoặc không có nhận xét)" /> : (
                  <Flex vertical gap={12}>
                    {kq.ChuDe.map((c) => {
                      const tc = Number(c.TichCuc), tt = Number(c.TrungTinh), tieu = Number(c.TieuCuc)
                      return (
                        <div key={c.ChuDe} style={{ cursor: 'pointer' }} role="button" tabIndex={0}
                          onClick={() => setXem({ tieuDe: `Chủ đề: ${TEN_CHU_DE_DANH_GIA[c.ChuDe] ?? c.ChuDe}`, chu_de: c.ChuDe })}
                          onKeyDown={(e) => e.key === 'Enter' && setXem({ tieuDe: `Chủ đề: ${TEN_CHU_DE_DANH_GIA[c.ChuDe] ?? c.ChuDe}`, chu_de: c.ChuDe })}>
                          <Flex justify="space-between">
                            <Typography.Link>{TEN_CHU_DE_DANH_GIA[c.ChuDe] ?? c.ChuDe}</Typography.Link>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{tc} tích cực · {tieu} tiêu cực{tt ? ` · ${tt} trung tính` : ''}</Typography.Text>
                          </Flex>
                          <Flex style={{ height: 8, background: '#EEF2F1', borderRadius: 4, overflow: 'hidden' }} aria-hidden>
                            <div style={{ width: `${(tc / maxChuDe) * 100}%`, background: MAU_COT }} />
                            <div style={{ width: `${(tieu / maxChuDe) * 100}%`, background: MAU_TIEU_CUC, marginLeft: tc && tieu ? 2 : 0 }} />
                          </Flex>
                        </div>
                      )
                    })}
                  </Flex>
                )}
              </Card>
            </Col>
          </Row>

          <Card title="Xu hướng theo tháng">
            <BieuDoCot tieuDe="Số đánh giá theo tháng" duLieu={kq.TheoThang.map((m) => ({
              nhan: dayjs(`${m.Thang}-01`).format('MM/YYYY'), giaTri: Number(m.SoDanhGia),
              chuThich: `Bác sĩ ${so2(m.DiemBacSi)}★ · dịch vụ ${so2(m.DiemDichVu)}★ · ${phanTram(m.TichCuc, m.SoDanhGia)}% tích cực`,
            }))} />
            <Table size="small" rowKey="Thang" pagination={false} style={{ marginTop: 12 }} scroll={{ x: 520 }} dataSource={kq.TheoThang}
              columns={[
                { title: 'Tháng', dataIndex: 'Thang', render: (v: string) => dayjs(`${v}-01`).format('MM/YYYY') },
                { title: 'Số đánh giá', dataIndex: 'SoDanhGia', align: 'right' },
                { title: 'Điểm bác sĩ', dataIndex: 'DiemBacSi', align: 'right', render: so2 },
                { title: 'Điểm dịch vụ', dataIndex: 'DiemDichVu', align: 'right', render: so2 },
                { title: '% tích cực', key: 'tc', align: 'right', render: (_, m) => `${phanTram(m.TichCuc, m.SoDanhGia)}%` },
                { title: '% tiêu cực', key: 'tieu', align: 'right', render: (_, m) => `${phanTram(m.TieuCuc, m.SoDanhGia)}%` },
              ]} />
          </Card>

          <Card title="Theo bác sĩ">
            <Table size="small" rowKey="MaNV" columns={cotBacSi} dataSource={kq.BacSi} pagination={{ pageSize: 10, hideOnSinglePage: true }}
              scroll={{ x: 480 }} />
          </Card>
        </>
      )}

      <Drawer open={!!xem} onClose={() => setXem(null)} size={nho ? '100%' : 620} title={xem?.tieuDe} destroyOnHidden>
        {xem && <DsDanhGia loc={{ ...loc, chu_de: xem.chu_de, cam_xuc: xem.cam_xuc }} />}
      </Drawer>
    </Flex>
  )
}

function DsDanhGia({ loc }: { loc: Parameters<typeof api.dsDanhGia>[0] }) {
  const { message } = App.useApp()
  const [ds, setDs] = useState<DanhGia[] | null>(null)
  const khoa = JSON.stringify(loc)
  useEffect(() => {
    api.dsDanhGia(JSON.parse(khoa)).then(setDs).catch((e) => message.error(e instanceof LoiApi ? e.message : 'Không tải được'))
  }, [khoa, message])
  if (!ds) return <Skeleton active />
  if (!ds.length) return <Empty description="Không có đánh giá" />
  return (
    <List dataSource={ds} renderItem={(d) => (
      <List.Item style={{ display: 'block' }}>
        <XemDanhGia d={d} hienBenhNhan />
        <Space size={4} wrap style={{ marginTop: 6 }}>
          {d.CamXuc && <Typography.Text type={d.CamXuc === 'TIEU_CUC' ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
            {CAM_XUC[d.CamXuc].ten}</Typography.Text>}
          {(d.ChuDe ?? []).map((c) => <Typography.Text key={c} type="secondary" style={{ fontSize: 12 }}>· {TEN_CHU_DE_DANH_GIA[c] ?? c}</Typography.Text>)}
        </Space>
      </List.Item>
    )} />
  )
}
