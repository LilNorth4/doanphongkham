import { DeleteOutlined, EditOutlined, PlusOutlined, SafetyOutlined, TeamOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, Col, Empty, Flex, Form, Input, Modal, Popconfirm, Radio, Row, Select, Skeleton, Space, Tag, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ONhapNgay from '@/components/ONhapNgay'
import { api, LoiApi, type KetQuaThemNguoiThan, type NguoiThan as NguoiThanKieu } from '@/lib/api'
import { chuanHoaSdt, quyTac, tuoi } from '@/lib/hangSo'

const QUAN_HE = ['Con', 'Bố', 'Mẹ', 'Vợ', 'Chồng', 'Ông', 'Bà', 'Anh', 'Chị', 'Em', 'Cháu', 'Khác']
const TOI_DA = 5

interface GiaTriThem {
  ho_ten: string; ngay_sinh: Dayjs; gioi_tinh?: 'NAM' | 'NU'; quan_he: string; sdt?: string; cccd?: string; dia_chi?: string
}

const TRANG_THAI: Record<NguoiThanKieu['TrangThai'], { mau: string; ten: string }> = {
  DA_LIEN_KET: { mau: 'green', ten: 'Đã liên kết' },
  CHO_OTP: { mau: 'gold', ten: 'Chờ nhập mã OTP' },
  CHO_LE_TAN: { mau: 'blue', ten: 'Chờ lễ tân xác nhận' },
}

/**
 * UC1.7: hồ sơ người thân (tối đa 5, BR34) để đặt lịch, theo dõi lịch hẹn, xem hồ sơ sức khỏe và hóa đơn thay người thân.
 * Hồ sơ đã có tại phòng khám thì phải nhập OTP gửi tới SĐT của hồ sơ đó, hoặc lễ tân xác nhận khi đến khám.
 */
export default function NguoiThan() {
  const { message } = App.useApp()
  const [ds, setDs] = useState<NguoiThanKieu[] | null>(null)
  const [moThem, setMoThem] = useState(false)
  const [sua, setSua] = useState<NguoiThanKieu | null>(null)
  const [otp, setOtp] = useState<{ ma_bn: number; ho_ten: string; sdt_an?: string; otp_thu?: string } | null>(null)
  const [maOtp, setMaOtp] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const [formThem] = Form.useForm<GiaTriThem>()
  const [formSua] = Form.useForm<{ quan_he: string; sdt?: string; dia_chi?: string }>()

  const tai = useCallback(() => api.dsNguoiThan().then(setDs).catch((e) => {
    setDs([])
    message.error(e instanceof LoiApi ? e.message : 'Không tải được danh sách người thân')
  }), [message])
  useEffect(() => { tai() }, [tai])

  const baoLoi = (e: unknown, macDinh: string) => message.error(e instanceof LoiApi ? e.message : macDinh)

  const them = async (v: GiaTriThem) => {
    setDangGui(true)
    try {
      const kq: KetQuaThemNguoiThan = await api.themNguoiThan({
        ho_ten: v.ho_ten.trim(), ngay_sinh: v.ngay_sinh.format('YYYY-MM-DD'), gioi_tinh: v.gioi_tinh, quan_he: v.quan_he,
        sdt: v.sdt ? chuanHoaSdt(v.sdt) : null, cccd: v.cccd?.trim() || null, dia_chi: v.dia_chi?.trim() || null,
      })
      setMoThem(false)
      formThem.resetFields()
      if (kq.trang_thai === 'DA_LIEN_KET') message.success('Đã tạo hồ sơ người thân')
      if (kq.trang_thai === 'CHO_LE_TAN') {
        message.info(`${kq.ho_ten} đã có hồ sơ tại phòng khám nhưng chưa có SĐT nhận mã. Lễ tân sẽ xác nhận khi người thân đến khám.`, 6)
      }
      if (kq.trang_thai === 'CHO_OTP') {
        setMaOtp('')
        setOtp({ ma_bn: kq.ma_bn, ho_ten: kq.ho_ten ?? v.ho_ten, sdt_an: kq.sdt_an, otp_thu: kq.otp_thu })
      }
      tai()
    } catch (e) {
      baoLoi(e, 'Không thêm được người thân')
    } finally {
      setDangGui(false)
    }
  }

  const xacNhanOtp = async () => {
    if (!otp) return
    setDangGui(true)
    try {
      await api.xacNhanOtpNguoiThan(otp.ma_bn, maOtp)
      message.success(`Đã liên kết hồ sơ ${otp.ho_ten} cùng lịch sử khám`)
      setOtp(null)
      tai()
    } catch (e) {
      baoLoi(e, 'Mã OTP không đúng')
    } finally {
      setDangGui(false)
    }
  }

  const guiLai = async (n: { MaBN: number; HoTen: string }) => {
    try {
      const kq = await api.guiLaiOtpNguoiThan(n.MaBN)
      setMaOtp('')
      setOtp({ ma_bn: n.MaBN, ho_ten: n.HoTen, sdt_an: kq.sdt_an, otp_thu: kq.otp_thu })
      message.success('Đã gửi lại mã OTP')
    } catch (e) {
      baoLoi(e, 'Không gửi lại được mã')
    }
  }

  const luuSua = async (v: { quan_he: string; sdt?: string; dia_chi?: string }) => {
    if (!sua) return
    setDangGui(true)
    try {
      await api.suaNguoiThan(sua.MaBN, { quan_he: v.quan_he, sdt: v.sdt ? chuanHoaSdt(v.sdt) : null, dia_chi: v.dia_chi?.trim() || null })
      message.success('Đã lưu')
      setSua(null)
      tai()
    } catch (e) {
      baoLoi(e, 'Không lưu được')
    } finally {
      setDangGui(false)
    }
  }

  const huy = async (n: NguoiThanKieu) => {
    try {
      await api.huyNguoiThan(n.MaBN)
      message.success(`Đã hủy liên kết ${n.HoTen}. Lịch sử khám vẫn được giữ tại phòng khám.`)
      tai()
    } catch (e) {
      baoLoi(e, 'Không hủy được liên kết')
    }
  }

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}><TeamOutlined /> Người thân</Typography.Title>
          <Typography.Text type="secondary">Đặt lịch, theo dõi lịch hẹn, xem hồ sơ sức khỏe và hóa đơn thay người thân. Tối đa {TOI_DA} hồ sơ.</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} disabled={(ds?.length ?? 0) >= TOI_DA}
          onClick={() => { formThem.resetFields(); setMoThem(true) }}>Thêm người thân</Button>
      </Flex>

      {ds === null ? <Skeleton active /> : ds.length === 0 ? (
        <Empty description="Chưa có hồ sơ người thân">
          <Button type="primary" onClick={() => setMoThem(true)}>Thêm người thân</Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {ds.map((n) => (
            <Col xs={24} md={12} key={n.MaBN}>
              <Card size="small" title={<Space wrap>{n.HoTen}<Tag>{n.QuanHe}</Tag><Tag color={TRANG_THAI[n.TrangThai].mau}>{TRANG_THAI[n.TrangThai].ten}</Tag></Space>}
                extra={<Space>
                  <Button size="small" icon={<EditOutlined />} aria-label="Sửa" onClick={() => {
                    setSua(n); formSua.setFieldsValue({ quan_he: n.QuanHe, sdt: n.SDT ?? undefined, dia_chi: n.DiaChi ?? undefined })
                  }} />
                  <Popconfirm title={`Hủy liên kết ${n.HoTen}?`} description="Hồ sơ không còn trong tài khoản; lịch sử khám vẫn được giữ."
                    okText="Hủy liên kết" okButtonProps={{ danger: true }} cancelText="Không" onConfirm={() => huy(n)}>
                    <Button size="small" danger icon={<DeleteOutlined />} aria-label="Hủy liên kết" />
                  </Popconfirm>
                </Space>}>
                <Typography.Text type="secondary">
                  {[n.NgaySinh && `${dayjs(n.NgaySinh).format('DD/MM/YYYY')} (${tuoi(n.NgaySinh)} tuổi)`,
                    n.GioiTinh === 'NAM' ? 'Nam' : n.GioiTinh === 'NU' ? 'Nữ' : null, n.SDT].filter(Boolean).join(' · ')}
                </Typography.Text>
                {n.TrangThai === 'DA_LIEN_KET' && (
                  <Flex gap={8} wrap style={{ marginTop: 8 }}>
                    <Link to={`/dat-lich?ma_bn=${n.MaBN}`}><Button size="small" type="primary">Đặt lịch</Button></Link>
                    <Link to={`/ho-so-suc-khoe?ma_bn=${n.MaBN}`}><Button size="small">Hồ sơ sức khỏe ({n.SoLanKham})</Button></Link>
                  </Flex>
                )}
                {n.TrangThai === 'CHO_OTP' && (
                  <Button size="small" icon={<SafetyOutlined />} style={{ marginTop: 8 }} onClick={() => guiLai(n)}>Nhập mã OTP</Button>
                )}
                {n.TrangThai === 'CHO_LE_TAN' && (
                  <div style={{ marginTop: 8 }}><Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Hồ sơ đã có tại phòng khám nhưng không có SĐT nhận mã: mang giấy tờ của người thân tới quầy lễ tân để xác nhận.
                  </Typography.Text></div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title="Thêm người thân" open={moThem} onCancel={() => setMoThem(false)} okText="Thêm" cancelText="Đóng"
        confirmLoading={dangGui} onOk={() => formThem.submit()} destroyOnHidden>
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          title="Nếu người thân đã từng khám tại phòng khám (trùng SĐT hoặc CCCD và ngày sinh), hệ thống gửi mã OTP tới SĐT của hồ sơ đó để xác nhận." />
        <Form form={formThem} layout="vertical" onFinish={them} requiredMark="optional">
          <Row gutter={12}>
            <Col span={24}><Form.Item name="ho_ten" label="Họ và tên" rules={[quyTac.batBuoc('họ tên'), { max: 100 }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item name="ngay_sinh" label="Ngày sinh" rules={[{ required: true, message: 'Nhập ngày sinh' }]}>
                <ONhapNgay style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs())} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="quan_he" label="Quan hệ với bạn" rules={[{ required: true, message: 'Chọn quan hệ' }]}>
                <Select options={QUAN_HE.map((q) => ({ value: q, label: q }))} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="gioi_tinh" label="Giới tính">
                <Radio.Group options={[{ label: 'Nam', value: 'NAM' }, { label: 'Nữ', value: 'NU' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="sdt" label="Số điện thoại" rules={[quyTac.sdt]} extra="Bỏ trống với trẻ nhỏ chưa có SĐT riêng"><Input /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="cccd" label="Số CCCD" rules={[quyTac.cccd]}><Input maxLength={12} /></Form.Item>
            </Col>
            <Col span={24}><Form.Item name="dia_chi" label="Địa chỉ"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title="Sửa hồ sơ người thân" open={!!sua} onCancel={() => setSua(null)} okText="Lưu" cancelText="Đóng"
        confirmLoading={dangGui} onOk={() => formSua.submit()} destroyOnHidden>
        <Typography.Paragraph type="secondary">Họ tên, ngày sinh chỉ lễ tân sửa được (đối chiếu giấy tờ).</Typography.Paragraph>
        <Form form={formSua} layout="vertical" onFinish={luuSua}>
          <Form.Item name="quan_he" label="Quan hệ với bạn" rules={[{ required: true, message: 'Chọn quan hệ' }]}>
            <Select options={QUAN_HE.map((q) => ({ value: q, label: q }))} />
          </Form.Item>
          {sua?.TrangThai === 'DA_LIEN_KET' && <>
            <Form.Item name="sdt" label="Số điện thoại" rules={[quyTac.sdt]}><Input /></Form.Item>
            <Form.Item name="dia_chi" label="Địa chỉ"><Input /></Form.Item>
          </>}
        </Form>
      </Modal>

      <Modal title="Xác nhận liên kết hồ sơ" open={!!otp} onCancel={() => setOtp(null)} okText="Xác nhận" cancelText="Để sau"
        confirmLoading={dangGui} okButtonProps={{ disabled: maOtp.length !== 6 }} onOk={xacNhanOtp} destroyOnHidden>
        {otp && <>
          <Typography.Paragraph>
            <b>{otp.ho_ten}</b> đã có hồ sơ tại phòng khám. Mã OTP đã gửi qua tin nhắn tới số {otp.sdt_an ?? 'của hồ sơ'};
            nhập mã để liên kết hồ sơ cùng lịch sử khám vào tài khoản của bạn.
          </Typography.Paragraph>
          {otp.otp_thu && <Alert type="warning" showIcon style={{ marginBottom: 12 }} title={`Chế độ thử (chưa có cổng SMS thật): mã là ${otp.otp_thu}`} />}
          <Input.OTP length={6} value={maOtp} onChange={setMaOtp} />
          <Button type="link" style={{ paddingInline: 0, marginTop: 8 }} onClick={() => guiLai({ MaBN: otp.ma_bn, HoTen: otp.ho_ten })}>Gửi lại mã</Button>
        </>}
      </Modal>
    </Card>
  )
}
