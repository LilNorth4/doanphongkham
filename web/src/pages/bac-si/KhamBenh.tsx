import {
  ArrowLeftOutlined, CheckCircleOutlined, DeleteOutlined, ExperimentOutlined, LikeOutlined, DislikeOutlined, PlusOutlined,
  ReloadOutlined, SaveOutlined, SoundOutlined, WarningOutlined,
} from '@ant-design/icons'
import {
  Alert, App, Button, Card, Checkbox, Col, DatePicker, Descriptions, Empty, Flex, Form, Input, InputNumber, List, Modal,
  Result, Row, Select, Skeleton, Space, Tag, Tooltip, Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import XemLanKham, { BangDonThuoc, DsGhiChu, DsKetQuaCls, ThongTinHoSo } from '@/components/XemLanKham'
import { useManHinhNho } from '@/hooks/manHinh'
import {
  api, LoiApi, type CanhBaoThuoc, type DichVuCls, type LanKham, type LuotKhamChiTiet, type LuuHoSoBenhAn, type ThuocDanhMuc,
} from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { TEN_LOAI_DV, thuNgay, tien, TRANG_THAI_LICH_HEN, tuoi } from '@/lib/hangSo'

interface GiaTriForm {
  mach?: number | null
  huyet_ap?: string
  nhiet_do?: number | null
  can_nang?: number | null
  chieu_cao?: number | null
  trieu_chung?: string
  kham_lam_sang?: string
  ma_icd?: string | null
  chan_doan?: string
  loi_dan?: string
  ngay_tai_kham?: Dayjs | null
  don_thuoc?: {
    ma_thuoc?: number; so_luong?: number; lieu_dung?: string; cach_dung?: string; so_ngay_dung?: number | null
    ly_do_canh_bao?: string
  }[]
}

const so = (v: string | number | null | undefined) => (v == null ? null : Number(v))

/** Ước tính phần bệnh nhân trả cho một dịch vụ CLS theo BHYT của lượt khám (khớp KhamBenhService.chiDinh). */
function phanBenhNhanTra(dv: DichVuCls, lk: LuotKhamChiTiet) {
  const gia = Number(dv.GiaDichVu)
  if (lk.TrangThaiBHYT !== 'HOP_LE' || dv.GiaBHYT == null) return gia
  return Math.max(gia - Math.round((Number(dv.GiaBHYT) * (lk.MucHuong ?? 0)) / 100), 0)
}

/**
 * Bác sĩ khám một lượt (UC8.3-8.11): ghi sinh hiệu, chẩn đoán ICD-10, kê đơn, chỉ định cận lâm sàng, hoàn tất.
 * Hồ sơ đã hoàn tất chỉ xem và bổ sung ghi chú; người giám sát (KHAM.XEM) chỉ xem.
 */
export default function KhamBenh() {
  const { maLk: thamSo } = useParams()
  const maLk = Number(thamSo)
  const navigate = useNavigate()
  const nho = useManHinhNho()
  const { message, modal } = App.useApp()
  const nguoiDung = usePhien().nguoiDung
  const quyen = nguoiDung?.Quyen ?? []
  const [form] = Form.useForm<GiaTriForm>()
  const [lk, setLk] = useState<LuotKhamChiTiet | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const [dsThuoc, setDsThuoc] = useState<ThuocDanhMuc[]>([])
  const [dsIcd, setDsIcd] = useState<{ MaICD: string; TenBenh: string }[]>([])
  const [moChiDinh, setMoChiDinh] = useState(false)
  const [lanTruoc, setLanTruoc] = useState<LanKham | null>(null)
  const [ghiChu, setGhiChu] = useState('')
  const timIcdLan = useRef(0)

  const laBacSiDieuTri = !!lk && quyen.includes('KHAM.THUC_HIEN') && lk.MaBS === nguoiDung?.MaNV
  const duocKeDon = quyen.includes('KHAM.KE_DON')
  const duocChiDinh = quyen.includes('KHAM.CHI_DINH')
  const dangKham = laBacSiDieuTri && lk?.TrangThai === 'DANG_KHAM' && lk.HoSo?.TrangThai === 'NHAP'
  const hoanTat = lk?.HoSo?.TrangThai === 'HOAN_TAT'

  const napForm = useCallback((d: LuotKhamChiTiet) => {
    const hs = d.HoSo
    form.setFieldsValue({
      mach: hs?.Mach ?? null, huyet_ap: hs?.HuyetAp ?? undefined, nhiet_do: so(hs?.NhietDo), can_nang: so(hs?.CanNang),
      chieu_cao: so(hs?.ChieuCao), trieu_chung: hs?.TrieuChung ?? d.TrieuChungSoBo ?? undefined,
      kham_lam_sang: hs?.KhamLamSang ?? undefined, ma_icd: hs?.MaICD ?? null, chan_doan: hs?.ChanDoan ?? undefined,
      loi_dan: hs?.LoiDan ?? undefined, ngay_tai_kham: hs?.NgayTaiKham ? dayjs(hs.NgayTaiKham) : null,
      don_thuoc: hs?.DonThuoc.map((t) => ({
        ma_thuoc: t.MaThuoc, so_luong: t.SoLuong, lieu_dung: t.LieuDung ?? undefined, cach_dung: t.CachDung ?? undefined,
        so_ngay_dung: t.SoNgayDung, ly_do_canh_bao: t.LyDoBoQuaCanhBao ?? undefined,
      })) ?? [],
    })
    if (hs?.MaICD) setDsIcd([{ MaICD: hs.MaICD, TenBenh: hs.TenBenh ?? '' }])
  }, [form])

  const tai = useCallback(async (giuForm = false) => {
    try {
      const d = await api.chiTietKham(maLk)
      setLk(d)
      setLoi(null)
      // Form chỉ hiện khi bác sĩ điều trị đang khám (hồ sơ nháp)
      if (!giuForm && d.TrangThai === 'DANG_KHAM' && d.HoSo?.TrangThai === 'NHAP') napForm(d)
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Không tải được lượt khám')
    }
  }, [maLk, napForm])

  useEffect(() => { tai() }, [tai])
  // Bệnh nhân đang đi làm CLS: tự tải lại để thấy kết quả phòng CLS vừa trả
  const choCls = lk?.TrangThai === 'CHO_CLS'
  useEffect(() => {
    if (!choCls) return
    const id = setInterval(() => tai(), 30_000)
    return () => clearInterval(id)
  }, [choCls, tai])
  useEffect(() => {
    if (dangKham && duocKeDon && dsThuoc.length === 0) api.dsThuoc().then(setDsThuoc).catch(() => {})
  }, [dangKham, duocKeDon, dsThuoc.length])
  useEffect(() => { if (dangKham) api.timIcd().then((d) => setDsIcd((cu) => [...cu, ...d.filter((x) => !cu.some((c) => c.MaICD === x.MaICD))])).catch(() => {}) }, [dangKham])

  const timIcd = (tuKhoa: string) => {
    const lan = ++timIcdLan.current
    api.timIcd(tuKhoa).then((d) => { if (lan === timIcdLan.current) setDsIcd(d) }).catch(() => {})
  }

  const thuocTheoMa = useMemo(() => new Map(dsThuoc.map((t) => [t.MaThuoc, t])), [dsThuoc])

  // BR35: kiểm tra lại mỗi khi danh sách thuốc trong đơn thay đổi (máy chủ đối chiếu dị ứng, hoạt chất)
  const donDangKe = Form.useWatch('don_thuoc', form)
  const maThuocDangKe = (donDangKe ?? []).map((t) => t?.ma_thuoc).filter((m): m is number => !!m).join(',')
  const [canhBao, setCanhBao] = useState<CanhBaoThuoc[]>([])
  const kiemTraLan = useRef(0)
  useEffect(() => {
    const lan = ++kiemTraLan.current
    if (!dangKham || !duocKeDon || !maThuocDangKe) { setCanhBao([]); return }
    api.kiemTraDon(maLk, maThuocDangKe.split(',').map(Number))
      .then((d) => { if (lan === kiemTraLan.current) setCanhBao(d) }).catch(() => {})
  }, [dangKham, duocKeDon, maLk, maThuocDangKe])

  const baoLoi = (e: unknown, macDinh: string) => message.error(e instanceof LoiApi ? e.message : macDinh)

  /** Gửi form lên máy chủ; trả về false nếu dữ liệu chưa hợp lệ hoặc lỗi. */
  const luu = async (imLang = false) => {
    let v: GiaTriForm
    try {
      v = await form.validateFields()
    } catch {
      message.warning('Vui lòng kiểm tra lại các ô đang báo lỗi')
      return false
    }
    const b: LuuHoSoBenhAn = {
      mach: v.mach ?? null, huyet_ap: v.huyet_ap || null, nhiet_do: v.nhiet_do ?? null, can_nang: v.can_nang ?? null,
      chieu_cao: v.chieu_cao ?? null, trieu_chung: v.trieu_chung || null, kham_lam_sang: v.kham_lam_sang || null,
      ma_icd: v.ma_icd || null, chan_doan: v.chan_doan || null, loi_dan: v.loi_dan || null,
      ngay_tai_kham: v.ngay_tai_kham ? v.ngay_tai_kham.format('YYYY-MM-DD') : null,
    }
    if (duocKeDon) {
      b.don_thuoc = (v.don_thuoc ?? []).filter((t) => t.ma_thuoc).map((t) => ({
        ma_thuoc: t.ma_thuoc!, so_luong: t.so_luong!, lieu_dung: t.lieu_dung || null, cach_dung: t.cach_dung || null,
        so_ngay_dung: t.so_ngay_dung ?? null, ly_do_canh_bao: t.ly_do_canh_bao || null,
      }))
    }
    setDangLuu(true)
    try {
      await api.luuHoSoBenhAn(maLk, b)
      if (!imLang) message.success('Đã lưu tạm hồ sơ')
      return true
    } catch (e) {
      baoLoi(e, 'Không lưu được hồ sơ')
      return false
    } finally {
      setDangLuu(false)
    }
  }

  const goiVao = async () => {
    try {
      await api.goiKham(maLk)
      message.success('Đã gọi bệnh nhân vào khám')
      tai()
    } catch (e) {
      baoLoi(e, 'Không gọi được bệnh nhân')
    }
  }

  const hoanTatKham = async () => {
    if (!form.getFieldValue('chan_doan')?.trim()) {
      form.validateFields(['chan_doan']).catch(() => {})
      message.warning('Vui lòng ghi chẩn đoán trước khi hoàn tất')
      return
    }
    if (!(await luu(true))) return
    modal.confirm({
      title: 'Hoàn tất lượt khám?',
      content: 'Sau khi hoàn tất, hồ sơ và đơn thuốc không sửa được nữa, chỉ có thể bổ sung ghi chú.',
      okText: 'Hoàn tất',
      cancelText: 'Xem lại',
      onOk: async () => {
        try {
          await api.hoanTatKham(maLk)
          message.success('Đã hoàn tất lượt khám')
          navigate('/bac-si/lich-kham')
        } catch (e) {
          baoLoi(e, 'Không hoàn tất được lượt khám')
          tai(true)
        }
      },
    })
  }

  const huyPhieu = (maPcd: number, ten: string) => {
    let lyDo = ''
    modal.confirm({
      title: `Hủy chỉ định ${ten}?`,
      content: <Input.TextArea rows={2} placeholder="Lý do hủy" onChange={(e) => { lyDo = e.target.value }} />,
      okText: 'Hủy chỉ định',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        if (!lyDo.trim()) {
          message.warning('Vui lòng nhập lý do hủy')
          throw new Error('thiếu lý do')
        }
        try {
          await api.huyChiDinh(maPcd, lyDo.trim())
          message.success('Đã hủy chỉ định')
          tai(true)
        } catch (e) {
          baoLoi(e, 'Không hủy được chỉ định')
        }
      },
    })
  }

  const guiGhiChu = async () => {
    try {
      await api.ghiChuHoSo(maLk, ghiChu)
      setGhiChu('')
      message.success('Đã bổ sung ghi chú')
      tai()
    } catch (e) {
      baoLoi(e, 'Không lưu được ghi chú')
    }
  }

  const phanHoi = async (p: 'HUU_ICH' | 'CHUA_CHINH_XAC') => {
    try {
      await api.phanHoiTomTat(maLk, p)
      message.success('Cảm ơn phản hồi của bạn')
      tai(true)
    } catch (e) {
      baoLoi(e, 'Không gửi được phản hồi')
    }
  }

  const moLanTruoc = async (maLkCu: number) => {
    try {
      setLanTruoc(await api.lanKhamTruoc(maLk, maLkCu))
    } catch (e) {
      baoLoi(e, 'Không tải được lần khám trước')
    }
  }

  if (loi) {
    return <Result status="warning" title={loi} extra={<Button onClick={() => navigate(-1)}>Quay lại</Button>} />
  }
  if (!lk) return <Card><Skeleton active paragraph={{ rows: 10 }} /></Card>

  const bn = lk.BenhNhan
  const tt = TRANG_THAI_LICH_HEN[lk.TrangThai]
  const tomTat = lk.TomTat?.TrangThai === 'DA_TAO' ? lk.TomTat.NoiDung : null

  return (
    <Flex vertical gap={16}>
      <Card styles={{ body: { padding: nho ? 12 : 16 } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} aria-label="Quay lại" />
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>{bn.HoTen}</Typography.Title>
              <Typography.Text type="secondary">
                {[bn.GioiTinh === 'NAM' ? 'Nam' : bn.GioiTinh === 'NU' ? 'Nữ' : null,
                  tuoi(bn.NgaySinh) != null ? `${tuoi(bn.NgaySinh)} tuổi` : null, `Mã ${lk.MaLichHen}`,
                  lk.SoThuTu ? `STT ${lk.SoThuTu}` : null].filter(Boolean).join(' · ')}
              </Typography.Text>
            </div>
            <Tag color={tt.mau}>{tt.ten}</Tag>
            {lk.TrangThaiBHYT === 'HOP_LE' && <Tag color="green">BHYT {lk.MucHuong}%</Tag>}
            {!laBacSiDieuTri && <Tag>Chỉ xem</Tag>}
          </Space>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => tai(dangKham)} aria-label="Làm mới" />
            {laBacSiDieuTri && (lk.TrangThai === 'DA_CHECK_IN' || lk.TrangThai === 'DA_CO_KET_QUA') && (
              <Button type="primary" icon={<SoundOutlined />} onClick={goiVao}>
                {lk.TrangThai === 'DA_CO_KET_QUA' ? 'Gọi vào đọc kết quả' : 'Gọi vào khám'}
              </Button>
            )}
            {dangKham && (
              <>
                <Button icon={<SaveOutlined />} loading={dangLuu} onClick={() => luu()}>Lưu tạm</Button>
                {duocChiDinh && (
                  <Button icon={<ExperimentOutlined />} onClick={async () => { if (await luu(true)) setMoChiDinh(true) }}>
                    Chỉ định CLS
                  </Button>
                )}
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={hoanTatKham}>Hoàn tất khám</Button>
              </>
            )}
          </Space>
        </Flex>
        {lk.TrangThai === 'CHO_CLS' && (
          <Alert style={{ marginTop: 12 }} type="info" showIcon
            title="Bệnh nhân đang đi làm cận lâm sàng. Khi có đủ kết quả, bệnh nhân quay lại hàng chờ để bạn gọi vào." />
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Flex vertical gap={16}>
            <Card size="small" title="Bệnh nhân">
              {bn.DiUng && <Alert type="error" showIcon icon={<WarningOutlined />} style={{ marginBottom: 12 }}
                title={<><Typography.Text strong>Dị ứng: </Typography.Text>{bn.DiUng}</>} />}
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Ngày sinh">{bn.NgaySinh ? dayjs(bn.NgaySinh).format('DD/MM/YYYY') : '—'}</Descriptions.Item>
                <Descriptions.Item label="SĐT">{bn.SDT ?? '—'}</Descriptions.Item>
                {bn.DiaChi && <Descriptions.Item label="Địa chỉ">{bn.DiaChi}</Descriptions.Item>}
                {bn.NguoiLienHe && <Descriptions.Item label="Người liên hệ">{bn.NguoiLienHe} {bn.SDTNguoiLienHe}</Descriptions.Item>}
                <Descriptions.Item label="Lý do khám">{lk.LyDoKham ?? '—'}</Descriptions.Item>
                {lk.TrieuChungSoBo && <Descriptions.Item label="Triệu chứng khai">{lk.TrieuChungSoBo}</Descriptions.Item>}
              </Descriptions>
            </Card>

            <Card size="small" title="Tóm tắt tiền sử"
              extra={tomTat && laBacSiDieuTri && (lk.TomTat?.PhanHoiBS ? (
                <Tag>{lk.TomTat.PhanHoiBS === 'HUU_ICH' ? 'Đã đánh giá: hữu ích' : 'Đã đánh giá: chưa chính xác'}</Tag>
              ) : (
                <Space size={0}>
                  <Tooltip title="Hữu ích"><Button type="text" size="small" icon={<LikeOutlined />} onClick={() => phanHoi('HUU_ICH')} /></Tooltip>
                  <Tooltip title="Chưa chính xác"><Button type="text" size="small" icon={<DislikeOutlined />} onClick={() => phanHoi('CHUA_CHINH_XAC')} /></Tooltip>
                </Space>
              ))}>
              {lk.TomTat?.TrangThai === 'KHAM_LAN_DAU' ? <Typography.Text type="secondary">Bệnh nhân khám lần đầu</Typography.Text>
                : !tomTat ? <Typography.Text type="secondary">Chưa có tóm tắt</Typography.Text> : (
                  <Flex vertical gap={8} style={{ fontSize: 13 }}>
                    <Typography.Text type="warning" style={{ fontSize: 12 }}>{tomTat.nhan}</Typography.Text>
                    {tomTat.benh_da_chan_doan.length > 0 && (
                      <div>
                        <Typography.Text strong>Bệnh đã chẩn đoán</Typography.Text>
                        {tomTat.benh_da_chan_doan.map((b, i) => (
                          <div key={i}>{b.ngay}: {b.icd && <Tag style={{ marginInlineEnd: 4 }}>{b.icd}</Tag>}{b.chan_doan}</div>
                        ))}
                      </div>
                    )}
                    {tomTat.thuoc_don_gan_nhat.thuoc.length > 0 && (
                      <div>
                        <Typography.Text strong>Thuốc đơn gần nhất ({tomTat.thuoc_don_gan_nhat.ngay})</Typography.Text>
                        {tomTat.thuoc_don_gan_nhat.thuoc.map((t, i) => <div key={i}>• {t}</div>)}
                      </div>
                    )}
                    {tomTat.chi_so_bat_thuong.length > 0 && (
                      <div>
                        <Typography.Text strong>Chỉ số bất thường</Typography.Text>
                        {tomTat.chi_so_bat_thuong.map((c, i) => (
                          <div key={i}>{c.ngay}: {c.chi_so} {c.gia_tri} {c.don_vi ?? ''}{' '}
                            <Tag color={c.danh_gia === 'CAO' ? 'red' : 'orange'}>{c.danh_gia === 'CAO' ? 'Cao' : 'Thấp'}</Tag>
                          </div>
                        ))}
                      </div>
                    )}
                    {tomTat.loi_dan_lan_truoc.loi_dan && (
                      <div><Typography.Text strong>Lời dặn lần trước: </Typography.Text>{tomTat.loi_dan_lan_truoc.loi_dan}</div>
                    )}
                  </Flex>
                )}
            </Card>

            <Card size="small" title={`Lần khám trước (${lk.LichSu.length})`}>
              {lk.LichSu.length === 0 ? <Typography.Text type="secondary">Chưa có lần khám nào</Typography.Text> : (
                <List size="small" dataSource={lk.LichSu} renderItem={(l) => (
                  <List.Item style={{ cursor: laBacSiDieuTri ? 'pointer' : undefined }}
                    onClick={laBacSiDieuTri ? () => moLanTruoc(l.MaLK) : undefined}>
                    <div>
                      <Typography.Text strong>{dayjs(l.NgayKham).format('DD/MM/YYYY')}</Typography.Text>{' '}
                      {l.MaICD && <Tag>{l.MaICD}</Tag>}
                      <div>{l.ChanDoan}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{l.BacSi}{l.TenCK && ` · ${l.TenCK}`}</Typography.Text>
                    </div>
                  </List.Item>
                )} />
              )}
            </Card>
          </Flex>
        </Col>

        <Col xs={24} lg={16}>
          <Flex vertical gap={16}>
            {!lk.HoSo ? (
              <Card><Empty description={laBacSiDieuTri ? 'Gọi bệnh nhân vào khám để bắt đầu ghi hồ sơ' : 'Chưa có hồ sơ bệnh án'} /></Card>
            ) : dangKham ? (
              <Form form={form} layout="vertical" disabled={dangLuu} requiredMark={false}>
                <Card size="small" title="Sinh hiệu" style={{ marginBottom: 16 }}>
                  <Row gutter={12}>
                    <Col xs={12} md={5}><Form.Item name="mach" label="Mạch (lần/phút)"><InputNumber min={20} max={250} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={12} md={5}>
                      <Form.Item name="huyet_ap" label="Huyết áp (mmHg)"
                        rules={[{ pattern: /^\d{2,3}\/\d{2,3}$/, message: 'VD 120/80' }]}>
                        <Input placeholder="120/80" />
                      </Form.Item>
                    </Col>
                    <Col xs={8} md={5}><Form.Item name="nhiet_do" label="Nhiệt độ (°C)"><InputNumber min={34} max={43} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={8} md={4}><Form.Item name="can_nang" label="Cân nặng (kg)"><InputNumber min={0.5} max={300} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col xs={8} md={5}><Form.Item name="chieu_cao" label="Chiều cao (cm)"><InputNumber min={30} max={250} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>
                  </Row>
                </Card>

                <Card size="small" title="Khám và chẩn đoán" style={{ marginBottom: 16 }}>
                  <Form.Item name="trieu_chung" label="Triệu chứng"><Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} /></Form.Item>
                  <Form.Item name="kham_lam_sang" label="Khám lâm sàng"><Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} /></Form.Item>
                  <Row gutter={12}>
                    <Col xs={24} md={10}>
                      <Form.Item name="ma_icd" label="Mã ICD-10">
                        <Select showSearch allowClear filterOption={false} onSearch={timIcd} placeholder="Tìm theo mã hoặc tên bệnh"
                          options={dsIcd.map((i) => ({ value: i.MaICD, label: `${i.MaICD} – ${i.TenBenh}` }))}
                          onChange={(ma) => {
                            const benh = dsIcd.find((i) => i.MaICD === ma)
                            if (benh && !form.getFieldValue('chan_doan')) form.setFieldValue('chan_doan', benh.TenBenh)
                          }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={14}>
                      <Form.Item name="chan_doan" label="Chẩn đoán"><Input placeholder="Bắt buộc khi chỉ định CLS và hoàn tất" /></Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="loi_dan" label="Lời dặn"><Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} /></Form.Item>
                  <Form.Item name="ngay_tai_kham" label="Hẹn tái khám" style={{ marginBottom: 0 }}>
                    <DatePicker format="DD/MM/YYYY" disabledDate={(d) => !d.isAfter(dayjs(), 'day')} style={{ width: nho ? '100%' : 200 }} />
                  </Form.Item>
                </Card>

                {duocKeDon && (
                  <Card size="small" title="Đơn thuốc">
                    <Form.List name="don_thuoc">
                      {(dong, { add, remove }) => (
                        <>
                          {dong.map(({ key, name }) => {
                            const maThuoc = donDangKe?.[name]?.ma_thuoc
                            const cbDong = maThuoc ? canhBao.filter((c) => c.ma_thuoc === maThuoc) : []
                            const diUng = cbDong.find((c) => c.muc === 'CAO')
                            return (
                              <Row key={key} gutter={8} align="top" style={{ borderBottom: '1px dashed #f0f0f0', marginBottom: 8 }}>
                                <Col xs={24} md={8}>
                                  <Form.Item name={[name, 'ma_thuoc']} rules={[{ required: true, message: 'Chọn thuốc' }]} style={{ marginBottom: 8 }}>
                                    <Select showSearch optionFilterProp="label" placeholder="Chọn thuốc"
                                      options={dsThuoc.map((x) => ({
                                        value: x.MaThuoc,
                                        label: `${x.TenThuoc}${x.HamLuong ? ` ${x.HamLuong}` : ''}${x.HoatChat ? ` (${x.HoatChat})` : ''}`,
                                      }))} />
                                  </Form.Item>
                                </Col>
                                <Col xs={12} md={4}>
                                  <Form.Item noStyle shouldUpdate={(a: GiaTriForm, b: GiaTriForm) =>
                                    a.don_thuoc?.[name]?.ma_thuoc !== b.don_thuoc?.[name]?.ma_thuoc}>
                                    {() => (
                                      <Form.Item name={[name, 'so_luong']} rules={[{ required: true, message: 'Số lượng' }]} style={{ marginBottom: 8 }}>
                                        <InputNumber min={1} max={1000} placeholder="SL" style={{ width: '100%' }}
                                          suffix={thuocTheoMa.get(form.getFieldValue(['don_thuoc', name, 'ma_thuoc']))?.DonViTinh} />
                                      </Form.Item>
                                    )}
                                  </Form.Item>
                                </Col>
                                <Col xs={12} md={4}>
                                  <Form.Item name={[name, 'so_ngay_dung']} style={{ marginBottom: 8 }}>
                                    <InputNumber min={1} max={90} placeholder="Số ngày" style={{ width: '100%' }} />
                                  </Form.Item>
                                </Col>
                                <Col xs={10} md={3}>
                                  <Form.Item name={[name, 'lieu_dung']} style={{ marginBottom: 8 }}><Input placeholder="1 viên/lần" /></Form.Item>
                                </Col>
                                <Col xs={11} md={4}>
                                  <Form.Item name={[name, 'cach_dung']} style={{ marginBottom: 8 }}><Input placeholder="Uống sau ăn, sáng-tối" /></Form.Item>
                                </Col>
                                <Col xs={3} md={1}>
                                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} aria-label="Xóa thuốc" />
                                </Col>
                                {cbDong.length > 0 && (
                                  <Col xs={24} style={{ marginBottom: 8 }}>
                                    {/* BR35: trùng dị ứng phải nhập lý do mới lưu được; trùng hoạt chất chỉ nhắc */}
                                    {diUng && (
                                      <Alert type="error" showIcon icon={<WarningOutlined />} style={{ marginBottom: 8 }}
                                        title={<><Typography.Text strong>Cảnh báo dị ứng: </Typography.Text>{diUng.noi_dung}</>}
                                        description={
                                          <Form.Item name={[name, 'ly_do_canh_bao']} style={{ marginBottom: 0, marginTop: 8 }}
                                            rules={[{ required: true, whitespace: true, message: 'Nhập lý do tiếp tục kê hoặc chọn thuốc khác' }]}>
                                            <Input maxLength={255} placeholder="Lý do vẫn kê thuốc này (VD: đã test dị ứng âm tính)" />
                                          </Form.Item>
                                        } />
                                    )}
                                    {cbDong.filter((c) => c.muc === 'THUONG').map((c) => (
                                      <Alert key={c.noi_dung} type="warning" showIcon style={{ marginBottom: 8 }} title={c.noi_dung} />
                                    ))}
                                  </Col>
                                )}
                              </Row>
                            )
                          })}
                          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ so_luong: 1 })} block>Thêm thuốc</Button>
                        </>
                      )}
                    </Form.List>
                  </Card>
                )}
              </Form>
            ) : (
              <Card size="small" title={hoanTat ? `Hồ sơ bệnh án · hoàn tất ${dayjs(lk.HoSo.NgayHoanTat).format('HH:mm DD/MM/YYYY')}` : 'Hồ sơ bệnh án (bản nháp)'}>
                <ThongTinHoSo hs={lk.HoSo} />
                <Typography.Title level={5} style={{ marginTop: 16 }}>Đơn thuốc</Typography.Title>
                <BangDonThuoc don={lk.HoSo.DonThuoc} />
              </Card>
            )}

            {lk.ChiDinh.length > 0 && (
              <Card size="small" title="Chỉ định cận lâm sàng">
                <DsKetQuaCls ds={lk.ChiDinh} />
                {laBacSiDieuTri && !hoanTat && duocChiDinh && lk.ChiDinh.some((p) => p.TrangThai === 'CHO_THANH_TOAN' || p.TrangThai === 'CHO_THUC_HIEN') && (
                  <Flex gap={8} wrap style={{ marginTop: 12 }}>
                    {lk.ChiDinh.filter((p) => p.TrangThai === 'CHO_THANH_TOAN' || p.TrangThai === 'CHO_THUC_HIEN').map((p) => (
                      <Button key={p.MaPCD} size="small" danger onClick={() => huyPhieu(p.MaPCD, p.TenDV)}>Hủy {p.TenDV}</Button>
                    ))}
                  </Flex>
                )}
              </Card>
            )}

            {hoanTat && lk.HoSo && (
              <Card size="small" title="Ghi chú bổ sung">
                {lk.HoSo.GhiChu.length > 0 ? <DsGhiChu ds={lk.HoSo.GhiChu} /> : <Typography.Text type="secondary">Chưa có ghi chú</Typography.Text>}
                {laBacSiDieuTri && (
                  <Flex vertical gap={8} style={{ marginTop: 12 }}>
                    <Input.TextArea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)}
                      placeholder="Bổ sung thông tin sau khi hoàn tất (hồ sơ gốc giữ nguyên)" />
                    <Button type="primary" disabled={!ghiChu.trim()} onClick={guiGhiChu} style={{ alignSelf: 'flex-end' }}>Thêm ghi chú</Button>
                  </Flex>
                )}
              </Card>
            )}
          </Flex>
        </Col>
      </Row>

      {moChiDinh && (
        <ChiDinhCls lk={lk} onDong={() => setMoChiDinh(false)} onXong={() => { setMoChiDinh(false); tai() }} />
      )}
      <Modal open={!!lanTruoc} onCancel={() => setLanTruoc(null)} footer={null} width={800}
        title={lanTruoc ? `Lần khám ${thuNgay(lanTruoc.NgayKham)}` : ''}>
        {lanTruoc && <XemLanKham lk={lanTruoc} />}
      </Modal>
    </Flex>
  )
}

/** Hộp chọn dịch vụ cận lâm sàng, hiện giá và phần bệnh nhân trả dự kiến. */
function ChiDinhCls({ lk, onDong, onXong }: { lk: LuotKhamChiTiet; onDong: () => void; onXong: () => void }) {
  const { message } = App.useApp()
  const [ds, setDs] = useState<DichVuCls[] | null>(null)
  const [chon, setChon] = useState<number[]>([])
  const [yeuCau, setYeuCau] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const daChiDinh = new Set(lk.ChiDinh.filter((p) => p.TrangThai !== 'DA_HUY').map((p) => p.MaDV))

  useEffect(() => { api.dsDichVuCls().then(setDs).catch(() => setDs([])) }, [])

  const tong = (ds ?? []).filter((d) => chon.includes(d.MaDV)).reduce((s, d) => s + phanBenhNhanTra(d, lk), 0)

  const gui = async () => {
    setDangGui(true)
    try {
      await api.chiDinhCls(lk.MaLK, chon, yeuCau.trim() || undefined)
      message.success('Đã chỉ định cận lâm sàng, bệnh nhân chuyển sang chờ CLS')
      onXong()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không chỉ định được')
    } finally {
      setDangGui(false)
    }
  }

  const nhom = (['XET_NGHIEM', 'CDHA', 'NOI_SOI'] as const).map((loai) => ({ loai, ds: (ds ?? []).filter((d) => d.LoaiDV === loai) }))

  return (
    <Modal open title="Chỉ định cận lâm sàng" onCancel={onDong} width={680} okText={`Chỉ định (${chon.length})`}
      okButtonProps={{ disabled: chon.length === 0, loading: dangGui }} onOk={gui} cancelText="Đóng">
      {!ds ? <Skeleton active /> : (
        <Checkbox.Group value={chon} onChange={(v) => setChon(v as number[])} style={{ width: '100%' }}>
          <Flex vertical gap={12} style={{ width: '100%' }}>
            {nhom.filter((n) => n.ds.length).map((n) => (
              <div key={n.loai}>
                <Typography.Text strong>{TEN_LOAI_DV[n.loai]}</Typography.Text>
                {n.ds.map((d) => (
                  <Flex key={d.MaDV} justify="space-between" gap={8} style={{ padding: '4px 0' }}>
                    <Checkbox value={d.MaDV} disabled={daChiDinh.has(d.MaDV)}>
                      {d.TenDV}
                      {!!Number(d.YeuCauNhinAn) && <Tag color="orange" style={{ marginInlineStart: 6 }}>Nhịn ăn</Tag>}
                      {daChiDinh.has(d.MaDV) && <Tag style={{ marginInlineStart: 6 }}>Đã chỉ định</Tag>}
                      <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Phòng {d.MaSoPhong}{d.ThoiGianTraKetQua ? ` · trả kết quả sau khoảng ${d.ThoiGianTraKetQua} phút` : ''}
                      </Typography.Text></div>
                    </Checkbox>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div>{tien(d.GiaDichVu)}</div>
                      {lk.TrangThaiBHYT === 'HOP_LE' && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {d.GiaBHYT == null ? 'Ngoài BHYT' : `BN trả ${tien(phanBenhNhanTra(d, lk))}`}
                        </Typography.Text>
                      )}
                    </div>
                  </Flex>
                ))}
              </div>
            ))}
          </Flex>
        </Checkbox.Group>
      )}
      <Input.TextArea rows={2} style={{ marginTop: 12 }} value={yeuCau} onChange={(e) => setYeuCau(e.target.value)}
        placeholder="Yêu cầu cho phòng cận lâm sàng (không bắt buộc)" />
      {chon.length > 0 && (
        <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
          Bệnh nhân trả dự kiến: <Typography.Text strong>{tien(tong)}</Typography.Text>
        </Typography.Paragraph>
      )}
    </Modal>
  )
}
