import { PaperClipOutlined, ReloadOutlined, SendOutlined, WarningOutlined } from '@ant-design/icons'
import {
  Alert, App, Button, Card, Checkbox, Descriptions, Drawer, Flex, Input, Segmented, Select, Space, Tag, Typography,
  type TableColumnsType,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BangThichUng from '@/components/BangThichUng'
import { useManHinhNho } from '@/hooks/manHinh'
import { api, LoiApi, type DongGopY, type LoaiGopY, type MucDoNghiemTrong, type PhieuGopY, type TrangThaiGopY } from '@/lib/api'
import { CAM_XUC, MUC_DO_NGHIEM_TRONG, SU_KIEN_SO_GOP_Y, TEN_LOAI_GOP_Y, TRANG_THAI_GOP_Y } from '@/lib/hangSo'
import { DongTraoDoi } from '@/pages/benh-nhan/GopYCuaToi'

type BoLocTrangThai = 'CAN_XU_LY' | 'DA_PHAN_HOI' | 'DA_DONG' | 'TAT_CA'
const THEO_BO_LOC: Record<BoLocTrangThai, TrangThaiGopY[] | undefined> = {
  CAN_XU_LY: ['MOI', 'DANG_XU_LY'], DA_PHAN_HOI: ['DA_PHAN_HOI'], DA_DONG: ['DA_DONG'], TAT_CA: undefined,
}

const conLai = (han: string) => {
  const phut = dayjs(han).diff(dayjs(), 'minute')
  const gio = Math.floor(Math.abs(phut) / 60)
  const chu = gio >= 24 ? `${Math.floor(gio / 24)} ngày ${gio % 24} giờ` : gio > 0 ? `${gio} giờ` : `${Math.abs(phut) % 60} phút`
  return phut < 0 ? `Quá hạn ${chu}` : `Còn ${chu}`
}

/** UC12.3: quản trị viên tiếp nhận, ghi chú nội bộ, phản hồi góp ý – khiếu nại; phiếu quá hạn 48 giờ (BR25) nổi bật. */
export default function GopY() {
  const { message } = App.useApp()
  const nho = useManHinhNho()
  const [params, setParams] = useSearchParams()
  const [boLoc, setBoLoc] = useState<BoLocTrangThai>('CAN_XU_LY')
  const [loai, setLoai] = useState<LoaiGopY>()
  const [chuDe, setChuDe] = useState<string>()
  const [mucDo, setMucDo] = useState<MucDoNghiemTrong>()
  const [quaHan, setQuaHan] = useState(false)
  const [tuKhoa, setTuKhoa] = useState('')
  const [dsChuDe, setDsChuDe] = useState<string[]>([])
  const [ds, setDs] = useState<DongGopY[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [xem, setXem] = useState<PhieuGopY | null>(null)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      setDs(await api.dsGopY({ trang_thai: THEO_BO_LOC[boLoc], loai, chu_de: chuDe, muc_do: mucDo, qua_han: quaHan || undefined,
        tu_khoa: tuKhoa.trim() || undefined }))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được danh sách')
    } finally {
      setDangTai(false)
    }
  }, [boLoc, loai, chuDe, mucDo, quaHan, tuKhoa, message])
  useEffect(() => { tai() }, [tai])
  useEffect(() => { api.chuDeGopY().then(setDsChuDe).catch(() => {}) }, [])

  const moXem = useCallback(async (ma: number) => {
    try {
      setXem(await api.phieuGopY(ma))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được phiếu')
    }
  }, [message])

  useEffect(() => {
    const ma = Number(params.get('phieu'))
    if (ma) moXem(ma)
  }, [params, moXem])

  const daDoi = (ma: number) => {
    tai()
    moXem(ma)
    api.soGopYCho().then((r) => window.dispatchEvent(new CustomEvent(SU_KIEN_SO_GOP_Y, { detail: r.so_luong }))).catch(() => {})
  }

  const soQuaHan = ds.filter((g) => Number(g.QuaHan)).length
  const cot: TableColumnsType<DongGopY> = [
    {
      title: 'Phiếu', key: 'phieu', render: (_, g) => (
        <Flex vertical>
          <Flex gap={6} align="center" wrap>
            <Typography.Text strong>{g.MaSoPhieu}</Typography.Text>
            <Tag color={g.Loai === 'KHIEU_NAI' ? 'volcano' : 'geekblue'}>{TEN_LOAI_GOP_Y[g.Loai]}</Tag>
          </Flex>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{g.ChuDe}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Bệnh nhân', key: 'bn', render: (_, g) => (
        <Flex vertical><span>{g.HoTen}</span><Typography.Text type="secondary" style={{ fontSize: 12 }}>{g.SDT}</Typography.Text></Flex>
      ),
    },
    {
      title: 'Nội dung', dataIndex: 'TomTat', responsive: ['lg'], ellipsis: true,
      render: (v: string) => <Typography.Text style={{ fontSize: 13 }}>{v}</Typography.Text>,
    },
    { title: 'Gửi lúc', dataIndex: 'ThoiDiemGui', render: (v: string) => dayjs(v).format('HH:mm DD/MM/YYYY') },
    {
      title: 'Hạn phản hồi', key: 'han', render: (_, g) => g.TrangThai === 'MOI' || g.TrangThai === 'DANG_XU_LY'
        ? <Tag color={Number(g.QuaHan) ? 'red' : dayjs(g.HanPhanHoi).diff(dayjs(), 'hour') < 12 ? 'orange' : 'default'}
            icon={Number(g.QuaHan) ? <WarningOutlined /> : undefined}>{conLai(g.HanPhanHoi)}</Tag>
        : g.ThoiDiemPhanHoi ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Đã phản hồi {dayjs(g.ThoiDiemPhanHoi).format('HH:mm DD/MM')}</Typography.Text> : '—',
    },
    {
      title: 'Trạng thái', dataIndex: 'TrangThai',
      render: (v: TrangThaiGopY) => <Tag color={TRANG_THAI_GOP_Y[v].mau}>{TRANG_THAI_GOP_Y[v].ten}</Tag>,
    },
    {
      title: 'Phân tích', key: 'pt', render: (_, g) => g.MucDoNghiemTrong ? (
        <Space size={4} wrap>
          {g.CamXuc && <Tag color={CAM_XUC[g.CamXuc].mau}>{CAM_XUC[g.CamXuc].ten}</Tag>}
          <Tag color={MUC_DO_NGHIEM_TRONG[g.MucDoNghiemTrong].mau}>Mức {MUC_DO_NGHIEM_TRONG[g.MucDoNghiemTrong].ten.toLowerCase()}</Tag>
        </Space>
      ) : <Typography.Text type="secondary" style={{ fontSize: 12 }}>Chưa phân tích</Typography.Text>,
    },
    {
      key: 'thao_tac', fixed: 'right', render: (_, g) => <Button size="small" onClick={() => moXem(g.MaPhieu)}>Xử lý</Button>,
    },
  ]

  return (
    <Card>
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }} gap={8} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>Góp ý, khiếu nại</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={tai} aria-label="Làm mới" />
      </Flex>
      <Flex gap={8} wrap style={{ marginBottom: 12 }}>
        <Segmented value={boLoc} onChange={(v) => setBoLoc(v as BoLocTrangThai)} options={[
          { value: 'CAN_XU_LY', label: 'Cần xử lý' }, { value: 'DA_PHAN_HOI', label: 'Đã phản hồi' },
          { value: 'DA_DONG', label: 'Đã đóng' }, { value: 'TAT_CA', label: 'Tất cả' },
        ]} />
        <Select allowClear placeholder="Loại" value={loai} onChange={setLoai} style={{ width: 130 }}
          options={(['GOP_Y', 'KHIEU_NAI'] as LoaiGopY[]).map((l) => ({ value: l, label: TEN_LOAI_GOP_Y[l] }))} />
        <Select allowClear placeholder="Chủ đề" value={chuDe} onChange={setChuDe} style={{ width: 180 }}
          options={dsChuDe.map((c) => ({ value: c, label: c }))} />
        <Select allowClear placeholder="Mức nghiêm trọng" value={mucDo} onChange={setMucDo} style={{ width: 170 }}
          options={(['CAO', 'TRUNG_BINH', 'THAP'] as MucDoNghiemTrong[]).map((m) => ({ value: m, label: MUC_DO_NGHIEM_TRONG[m].ten }))} />
        <Input.Search allowClear placeholder="Mã phiếu, tên, SĐT, nội dung" onSearch={setTuKhoa} style={{ width: nho ? '100%' : 260 }} />
        <Checkbox checked={quaHan} onChange={(e) => setQuaHan(e.target.checked)} style={{ alignSelf: 'center' }}>Chỉ phiếu quá hạn</Checkbox>
      </Flex>
      {soQuaHan > 0 && !quaHan && (
        <Alert type="error" showIcon style={{ marginBottom: 12 }}
          title={`${soQuaHan} phiếu đã quá hạn phản hồi ${48} giờ (BR25)`}
          action={<Button size="small" danger onClick={() => setQuaHan(true)}>Xem</Button>} />
      )}
      <BangThichUng<DongGopY> rowKey="MaPhieu" columns={cot} dataSource={ds} loading={dangTai} pagination={{ pageSize: 15 }}
        scroll={{ x: 900 }} locale={{ emptyText: 'Không có phiếu nào' }}
        onRow={(g) => ({ style: Number(g.QuaHan) ? { background: '#FEF3F2' } : undefined })} />

      <Drawer open={!!xem} onClose={() => { setXem(null); if (params.get('phieu')) setParams({}, { replace: true }) }}
        size={nho ? '100%' : 680} title={xem ? `Phiếu ${xem.MaSoPhieu}` : ''} destroyOnHidden>
        {xem && <XuLy p={xem} onDoi={() => daDoi(xem.MaPhieu)} />}
      </Drawer>
    </Card>
  )
}

function XuLy({ p, onDoi }: { p: PhieuGopY; onDoi: () => void }) {
  const { message } = App.useApp()
  const [phanHoi, setPhanHoi] = useState('')
  const [ghiChu, setGhiChu] = useState('')
  const [dang, setDang] = useState<string | null>(null)

  const chay = async (viec: string, fn: () => Promise<unknown>, xong: string) => {
    setDang(viec)
    try {
      await fn()
      message.success(xong)
      onDoi()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không thực hiện được')
    } finally {
      setDang(null)
    }
  }

  const coThePhanHoi = p.TrangThai === 'MOI' || p.TrangThai === 'DANG_XU_LY'
  const tt = TRANG_THAI_GOP_Y[p.TrangThai]
  return (
    <Flex vertical gap={16}>
      {!!Number(p.QuaHan) && (
        <Alert type="error" showIcon title={`${conLai(p.HanPhanHoi)} – hạn phản hồi ${dayjs(p.HanPhanHoi).format('HH:mm DD/MM/YYYY')}`} />
      )}
      <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered items={[
        { label: 'Loại', children: <Tag color={p.Loai === 'KHIEU_NAI' ? 'volcano' : 'geekblue'}>{TEN_LOAI_GOP_Y[p.Loai]}</Tag> },
        { label: 'Trạng thái', children: <Tag color={tt.mau}>{tt.ten}</Tag> },
        { label: 'Chủ đề', children: p.ChuDe },
        { label: 'Gửi lúc', children: dayjs(p.ThoiDiemGui).format('HH:mm DD/MM/YYYY') },
        { label: 'Bệnh nhân', children: <>{p.HoTen}<br /><Typography.Text type="secondary">{p.SDT}{p.EmailBN && ` · ${p.EmailBN}`}</Typography.Text></> },
        {
          label: 'Phân tích', children: p.MucDoNghiemTrong ? <Space size={4} wrap>
            {p.CamXuc && <Tag color={CAM_XUC[p.CamXuc].mau}>{CAM_XUC[p.CamXuc].ten}</Tag>}
            <Tag color={MUC_DO_NGHIEM_TRONG[p.MucDoNghiemTrong].mau}>Mức {MUC_DO_NGHIEM_TRONG[p.MucDoNghiemTrong].ten.toLowerCase()}</Tag>
          </Space> : 'Chưa phân tích',
        },
        ...(p.MaLichHen ? [{
          label: 'Lượt khám', span: 2,
          children: `${p.MaLichHen} · ${dayjs(p.NgayKham).format('DD/MM/YYYY')} · ${p.BacSi}${p.TenCK ? ` (${p.TenCK})` : ''}`,
        }] : []),
      ]} />
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Nội dung</Typography.Text>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{p.NoiDung}</Typography.Paragraph>
      </div>
      {p.Tep.length > 0 && (
        <Flex vertical gap={4}>
          {p.Tep.map((t) => <a key={t.MaTep} href={t.DuongDan} target="_blank" rel="noreferrer"><PaperClipOutlined /> {t.TenTep}</a>)}
        </Flex>
      )}
      {p.TraoDoi.length > 0 && (
        <div>
          <Typography.Title level={5} style={{ marginTop: 0 }}>Trao đổi</Typography.Title>
          <DongTraoDoi ds={p.TraoDoi} />
        </div>
      )}

      {p.TrangThai === 'MOI' && (
        <Button onClick={() => chay('tiep', () => api.tiepNhanGopY(p.MaPhieu), 'Đã tiếp nhận phiếu')} loading={dang === 'tiep'}>
          Tiếp nhận (chuyển Đang xử lý)
        </Button>
      )}
      {coThePhanHoi && (
        <Flex vertical gap={8}>
          <Typography.Text strong>Phản hồi bệnh nhân</Typography.Text>
          <Input.TextArea value={phanHoi} onChange={(e) => setPhanHoi(e.target.value)} autoSize={{ minRows: 3, maxRows: 8 }}
            maxLength={5000} showCount placeholder="Nội dung gửi tới bệnh nhân" />
          <Button type="primary" icon={<SendOutlined />} disabled={!phanHoi.trim()} loading={dang === 'phan-hoi'}
            onClick={() => chay('phan-hoi', () => api.phanHoiGopY(p.MaPhieu, phanHoi.trim()), 'Đã gửi phản hồi')}>
            Gửi phản hồi
          </Button>
        </Flex>
      )}
      <Flex vertical gap={8}>
        <Typography.Text strong>Ghi chú nội bộ <Typography.Text type="secondary" style={{ fontWeight: 400 }}>(bệnh nhân không thấy)</Typography.Text></Typography.Text>
        <Input.TextArea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} autoSize={{ minRows: 2, maxRows: 6 }}
          maxLength={2000} placeholder="VD: chuyển bộ phận lễ tân kiểm tra camera ngày 20/10" />
        <Button disabled={!ghiChu.trim()} loading={dang === 'ghi-chu'}
          onClick={() => chay('ghi-chu', async () => { await api.ghiChuGopY(p.MaPhieu, ghiChu.trim()); setGhiChu('') }, 'Đã lưu ghi chú')}>
          Lưu ghi chú
        </Button>
      </Flex>
    </Flex>
  )
}
