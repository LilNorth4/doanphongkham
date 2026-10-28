import { MessageOutlined, PhoneOutlined, SearchOutlined, ShopOutlined, UserAddOutlined } from '@ant-design/icons'
import {
  Alert, App, Button, Card, Col, Descriptions, Empty, Flex, Form, Input, Radio, Result, Row, Segmented,
  Select, Space, Steps, Tag, Typography, theme,
} from 'antd'
import ONhapNgay from '@/components/ONhapNgay'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKieuBuoc } from '@/hooks/manHinh'
import { api, LoiApi, type BacSi, type BenhNhan, type ChuyenKhoa, type KhungGio } from '@/lib/api'
import ChonKhungGio from '@/components/ChonKhungGio'
import { CacTruongThe, NutTheBhyt, theGuiApi, type GiaTriThe } from '@/components/TheBhyt'
import { chuanHoaSdt, quyTac, thuNgay, tuoi } from '@/lib/hangSo'

type Kenh = 'DIEN_THOAI' | 'TIN_NHAN' | 'TAI_QUAY'
const KENH: { value: Kenh; label: string; icon: React.ReactNode; moTa: string }[] = [
  { value: 'DIEN_THOAI', label: 'Điện thoại', icon: <PhoneOutlined />, moTa: 'Bệnh nhân gọi tổng đài đặt lịch' },
  { value: 'TIN_NHAN', label: 'Tin nhắn', icon: <MessageOutlined />, moTa: 'Đặt qua Zalo / Messenger' },
  { value: 'TAI_QUAY', label: 'Vãng lai tại quầy', icon: <ShopOutlined />, moTa: 'Khám ngay trong hôm nay' },
]

interface HoSoMoi {
  ho_ten: string
  sdt: string
  ngay_sinh?: Dayjs
  gioi_tinh?: 'NAM' | 'NU'
  cccd?: string
  dia_chi?: string
  nguoi_lien_he?: string
  sdt_nguoi_lien_he?: string
  /** Lễ tân nhập thẻ BHYT ngay lúc đăng ký hồ sơ (không bắt buộc) */
  the_bhyt?: GiaTriThe
}

/** UC7.7 vãng lai, UC7.8 tìm/tạo hồ sơ, UC7.13 điện thoại, UC7.14 tin nhắn: lễ tân đặt lịch hộ, xác nhận ngay (BR23). */
export default function DatLichHo() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [buoc, setBuoc] = useState(0)
  const kieuBuoc = useKieuBuoc()
  const [cachTim, setCachTim] = useState<'sdt' | 'cccd'>('sdt')
  const [ketQuaTim, setKetQuaTim] = useState<BenhNhan[] | null>(null)
  const [dangTim, setDangTim] = useState(false)
  const [taoMoi, setTaoMoi] = useState(false)
  const [bn, setBn] = useState<BenhNhan | null>(null)
  const [kenh, setKenh] = useState<Kenh>('DIEN_THOAI')
  const [dsCk, setDsCk] = useState<ChuyenKhoa[]>([])
  const [dsBs, setDsBs] = useState<BacSi[]>([])
  const [maCk, setMaCk] = useState<number>()
  const [maBs, setMaBs] = useState<number>()
  const [kg, setKg] = useState<KhungGio | null>(null)
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const [xong, setXong] = useState<{ ma_lk: number } | null>(null)
  const [formTim] = Form.useForm<{ gia_tri: string }>()
  const [formMoi] = Form.useForm<HoSoMoi>()
  const [formLyDo] = Form.useForm<{ ly_do?: string; trieu_chung?: string }>()

  useEffect(() => { api.dsChuyenKhoa().then(setDsCk).catch(() => {}) }, [])
  useEffect(() => {
    setMaBs(undefined)
    setKg(null)
    if (maCk) api.dsBacSi(maCk).then(setDsBs).catch(() => {})
  }, [maCk])

  const tim = async ({ gia_tri }: { gia_tri: string }) => {
    setDangTim(true)
    setLoi(null)
    try {
      const ds = await api.timBenhNhan(cachTim === 'sdt' ? { sdt: chuanHoaSdt(gia_tri) } : { cccd: gia_tri.trim() })
      setKetQuaTim(ds)
      setTaoMoi(ds.length === 0)
      if (ds.length === 0 && cachTim === 'sdt') formMoi.setFieldValue('sdt', chuanHoaSdt(gia_tri))
      if (ds.length === 0 && cachTim === 'cccd') formMoi.setFieldValue('cccd', gia_tri.trim())
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Tìm kiếm thất bại')
    } finally {
      setDangTim(false)
    }
  }

  const taoHoSo = async (v: HoSoMoi) => {
    setDangGui(true)
    setLoi(null)
    try {
      const b = {
        ho_ten: v.ho_ten.trim(), sdt: chuanHoaSdt(v.sdt), ngay_sinh: v.ngay_sinh?.format('YYYY-MM-DD'),
        gioi_tinh: v.gioi_tinh, cccd: v.cccd?.trim() || undefined, dia_chi: v.dia_chi?.trim() || undefined,
        nguoi_lien_he: v.nguoi_lien_he?.trim() || undefined, sdt_nguoi_lien_he: v.sdt_nguoi_lien_he?.trim() || undefined,
        the_bhyt: theGuiApi(v.the_bhyt),
      }
      const { ma_bn } = await api.themBenhNhan(b)
      message.success(b.the_bhyt ? 'Đã tạo hồ sơ bệnh nhân và lưu thẻ BHYT' : 'Đã tạo hồ sơ bệnh nhân')
      setBn({ MaBN: ma_bn, MaTK: null, HoTen: b.ho_ten, NgaySinh: b.ngay_sinh ?? null, GioiTinh: b.gioi_tinh ?? null,
        SDT: b.sdt, CCCD: b.cccd ?? null, Email: null, DiaChi: b.dia_chi ?? null, NguoiLienHe: b.nguoi_lien_he ?? null,
        SDTNguoiLienHe: b.sdt_nguoi_lien_he ?? null, DiUng: null })
      setBuoc(1)
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Tạo hồ sơ thất bại')
    } finally {
      setDangGui(false)
    }
  }

  const datLich = async (v: { ly_do?: string; trieu_chung?: string }) => {
    if (!bn || !kg) return
    setDangGui(true)
    setLoi(null)
    try {
      setXong(await api.datLichHo({ ma_bn: bn.MaBN, ma_kg: kg.MaKG, kenh, ly_do: v.ly_do?.trim(), trieu_chung: v.trieu_chung?.trim() }))
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Đặt lịch thất bại')
      if (e instanceof LoiApi && e.message.includes('không còn trống')) {
        setKg(null)
        setBuoc(1)
      }
    } finally {
      setDangGui(false)
    }
  }

  const lamLai = () => {
    setXong(null); setBuoc(0); setBn(null); setKg(null); setKetQuaTim(null); setTaoMoi(false)
    formTim.resetFields(); formMoi.resetFields(); formLyDo.resetFields()
  }

  if (xong && bn && kg) {
    return (
      <Card>
        <Result status="success" title="Đã đặt lịch và xác nhận"
          subTitle={`${bn.HoTen} · ${kg.GioBatDau} ${thuNgay(kg.NgayKham)} · ${kg.BacSi} · phòng ${kg.MaSoPhong}`}
          extra={[
            kenh === 'TAI_QUAY' && (
              <Button type="primary" key="ci" onClick={() => navigate('/le-tan/lich-hen?tab=ngay')}>Đến danh sách để check-in</Button>
            ),
            <Button key="moi" type={kenh === 'TAI_QUAY' ? 'default' : 'primary'} onClick={lamLai}>Đặt lịch khác</Button>,
          ]} />
      </Card>
    )
  }

  return (
    <Card>
      <Typography.Title level={4} style={{ marginTop: 0 }}>Đặt lịch hộ bệnh nhân</Typography.Title>
      <Steps current={buoc} size="small" style={{ margin: '8px 0 24px' }} {...kieuBuoc}
        items={[{ title: 'Bệnh nhân' }, { title: 'Kênh & khung giờ' }, { title: 'Xác nhận' }]} />
      {loi && <Alert type="error" showIcon title={loi} style={{ marginBottom: 16 }} closable={{ onClose: () => setLoi(null) }} />}

      {buoc === 0 && (
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={12}>
            <Segmented<'sdt' | 'cccd'> value={cachTim} onChange={(v) => { setCachTim(v); formTim.resetFields(); setKetQuaTim(null) }}
              options={[{ value: 'sdt', label: 'Số điện thoại' }, { value: 'cccd', label: 'Số CCCD' }]} style={{ marginBottom: 12 }} />
            <Form form={formTim} layout="inline" onFinish={tim} style={{ marginBottom: 16 }}>
              <Form.Item name="gia_tri" style={{ flex: 1 }}
                rules={cachTim === 'sdt' ? [quyTac.batBuoc('số điện thoại'), quyTac.sdt] : [quyTac.batBuoc('số CCCD'), quyTac.cccd]}>
                <Input prefix={<SearchOutlined />} autoFocus placeholder={cachTim === 'sdt' ? '0912345678' : '12 chữ số'} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={dangTim}>Tìm</Button>
            </Form>
            {ketQuaTim && ketQuaTim.length === 0 && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hồ sơ. Tạo hồ sơ mới ở bên cạnh." />
            )}
            <Flex vertical gap={8}>
              {ketQuaTim?.map((b) => (
                <Card key={b.MaBN} size="small" hoverable onClick={() => { setBn(b); setBuoc(1) }}
                  style={{ borderColor: bn?.MaBN === b.MaBN ? token.colorPrimary : undefined }}>
                  <Flex justify="space-between" align="center" gap={8}>
                    <div>
                      <Typography.Text strong>{b.HoTen}</Typography.Text>{' '}
                      {b.MaTK ? <Tag color="green">Có tài khoản</Tag> : <Tag>Chưa có tài khoản</Tag>}
                      <div><Typography.Text type="secondary">
                        {[b.NgaySinh && `${dayjs(b.NgaySinh).format('DD/MM/YYYY')} (${tuoi(b.NgaySinh)} tuổi)`,
                          b.GioiTinh === 'NAM' ? 'Nam' : b.GioiTinh === 'NU' ? 'Nữ' : null, b.CCCD && `CCCD ${b.CCCD}`]
                          .filter(Boolean).join(' · ')}
                      </Typography.Text></div>
                      {b.NguoiLienHe && <Typography.Text type="secondary">Liên hệ: {b.NguoiLienHe}</Typography.Text>}
                    </div>
                    <Space direction="vertical" size={4} align="end">
                      <Button type="primary" size="small">Chọn</Button>
                      <NutTheBhyt maBn={b.MaBN} hoTen={b.HoTen} />
                    </Space>
                  </Flex>
                </Card>
              ))}
            </Flex>
            {ketQuaTim && ketQuaTim.length > 0 && !taoMoi && (
              <Button icon={<UserAddOutlined />} type="link" style={{ paddingInline: 0, marginTop: 8 }} onClick={() => setTaoMoi(true)}>
                Không phải các bệnh nhân trên? Tạo hồ sơ mới
              </Button>
            )}
          </Col>
          {taoMoi && (
            <Col xs={24} lg={12}>
              <Card size="small" title={<><UserAddOutlined /> Tạo hồ sơ bệnh nhân mới</>}>
                <Form form={formMoi} layout="vertical" onFinish={taoHoSo} requiredMark="optional">
                  <Row gutter={12}>
                    <Col span={24}>
                      <Form.Item name="ho_ten" label="Họ và tên" rules={[quyTac.batBuoc('họ tên'), { max: 100 }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="sdt" label="Số điện thoại" rules={[quyTac.batBuoc('số điện thoại'), quyTac.sdt]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="cccd" label="Số CCCD" rules={[quyTac.cccd]}>
                        <Input maxLength={12} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="ngay_sinh" label="Ngày sinh">
                        <ONhapNgay style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs())} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="gioi_tinh" label="Giới tính">
                        <Radio.Group options={[{ label: 'Nam', value: 'NAM' }, { label: 'Nữ', value: 'NU' }]} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="dia_chi" label="Địa chỉ"><Input /></Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="nguoi_lien_he" label="Người liên hệ" extra="Với trẻ em: họ tên bố/mẹ">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="sdt_nguoi_lien_he" label="SĐT người liên hệ" rules={[quyTac.sdt]}><Input /></Form.Item>
                    </Col>
                  </Row>
                  <Typography.Title level={5} style={{ marginTop: 4 }}>Thẻ bảo hiểm y tế (nếu có)</Typography.Title>
                  <CacTruongThe ten={['the_bhyt']} batBuoc={false} />
                  <Button type="primary" htmlType="submit" block loading={dangGui}>Tạo hồ sơ và tiếp tục</Button>
                </Form>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {buoc === 1 && bn && (
        <>
          <Alert type="info" style={{ marginBottom: 16 }}
            title={<>Bệnh nhân: <b>{bn.HoTen}</b> · {bn.SDT}</>}
            action={<Space><NutTheBhyt maBn={bn.MaBN} hoTen={bn.HoTen} /><Button size="small" onClick={() => setBuoc(0)}>Đổi</Button></Space>} />
          <Typography.Text strong>Kênh đặt lịch</Typography.Text>
          <Row gutter={[12, 12]} style={{ margin: '8px 0 16px' }}>
            {KENH.map((k) => (
              <Col xs={24} sm={8} key={k.value}>
                <Card size="small" hoverable onClick={() => { setKenh(k.value); setKg(null) }}
                  style={{ borderColor: kenh === k.value ? token.colorPrimary : undefined,
                    background: kenh === k.value ? token.colorPrimaryBg : undefined }}>
                  <Space>
                    <span style={{ fontSize: 20, color: token.colorPrimary }}>{k.icon}</span>
                    <div>
                      <Typography.Text strong>{k.label}</Typography.Text>
                      <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{k.moTa}</Typography.Text></div>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12}>
              <Select placeholder="Chọn chuyên khoa" style={{ width: '100%' }} value={maCk} onChange={setMaCk}
                options={dsCk.map((c) => ({ value: c.MaCK, label: c.TenCK }))} />
            </Col>
            <Col xs={24} sm={12}>
              <Select placeholder="Bác sĩ bất kỳ" allowClear style={{ width: '100%' }} value={maBs} disabled={!maCk}
                onChange={(v) => { setMaBs(v); setKg(null) }} options={dsBs.map((b) => ({ value: b.MaBS, label: b.HoTen }))} />
            </Col>
          </Row>
          {maCk ? (
            <ChonKhungGio key={`${kenh}-${maCk}-${maBs}`} maCk={maCk} maBs={maBs} vangLai={kenh === 'TAI_QUAY'}
              value={kg} onChange={(k) => { setKg(k); if (k) setBuoc(2) }} />
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chọn chuyên khoa để xem khung giờ trống" />}
        </>
      )}

      {buoc === 2 && bn && kg && (
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={11}>
            <Descriptions bordered column={1} size="small" items={[
              { key: 'bn', label: 'Bệnh nhân', children: <><b>{bn.HoTen}</b> · {bn.SDT}</> },
              { key: 'kenh', label: 'Kênh', children: KENH.find((k) => k.value === kenh)?.label },
              { key: 'tg', label: 'Thời gian', children: <b>{kg.GioBatDau} – {kg.GioKetThuc}, {thuNgay(kg.NgayKham)}</b> },
              { key: 'bs', label: 'Bác sĩ', children: kg.BacSi },
              { key: 'p', label: 'Phòng', children: `${kg.MaSoPhong} – ${kg.TenPhong}` },
            ]} />
            <Alert type="success" showIcon style={{ marginTop: 16 }}
              title="Lịch do lễ tân tạo được xác nhận ngay"
              description={kenh === 'TIN_NHAN' ? 'Thông báo cũng được gửi qua kênh tin nhắn.' : undefined} />
          </Col>
          <Col xs={24} lg={13}>
            <Form form={formLyDo} layout="vertical" onFinish={datLich}>
              <Form.Item name="ly_do" label="Lý do khám" rules={[{ max: 500 }]}><Input /></Form.Item>
              <Form.Item name="trieu_chung" label="Triệu chứng sơ bộ" rules={[{ max: 500 }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
              <Space>
                <Button onClick={() => setBuoc(1)}>Quay lại</Button>
                <Button type="primary" htmlType="submit" loading={dangGui}>Đặt lịch</Button>
              </Space>
            </Form>
          </Col>
        </Row>
      )}
    </Card>
  )
}
