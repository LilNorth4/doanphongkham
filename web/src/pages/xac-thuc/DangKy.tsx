import { IdcardOutlined, LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, Col, Form, Input, Radio, Row, Steps, Tooltip, Typography } from 'antd'
import ONhapNgay from '@/components/ONhapNgay'
import dayjs, { type Dayjs } from 'dayjs'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, LoiApi } from '@/lib/api'
import AuthLayout from '@/layouts/AuthLayout'
import { KHONG_TU_SUA, useKieuBuoc } from '@/hooks/manHinh'
import { chuanHoaSdt, quyTac } from '@/lib/hangSo'

interface GiaTri {
  ho_ten: string
  ngay_sinh: Dayjs
  gioi_tinh: 'NAM' | 'NU'
  sdt: string
  email: string
  cccd?: string
  dia_chi?: string
  mat_khau: string
  nhap_lai: string
  dong_y: boolean
}

export const BUOC_DANG_KY = [{ title: 'Thông tin' }, { title: 'Xác thực email' }, { title: 'Hoàn tất' }]

export default function DangKy() {
  const navigate = useNavigate()
  const [form] = Form.useForm<GiaTri>()
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const kieuBuoc = useKieuBuoc()

  const gui = async (v: GiaTri) => {
    setDangGui(true)
    setLoi(null)
    try {
      const email = v.email.trim().toLowerCase()
      await api.dangKy({
        ho_ten: v.ho_ten.trim(),
        ngay_sinh: v.ngay_sinh.format('YYYY-MM-DD'),
        gioi_tinh: v.gioi_tinh,
        sdt: chuanHoaSdt(v.sdt),
        email,
        mat_khau: v.mat_khau,
        cccd: v.cccd?.trim() || undefined,
        dia_chi: v.dia_chi?.trim() || undefined,
      })
      navigate(`/xac-thuc-email?dinh_danh=${encodeURIComponent(email)}`, { state: { vuaGui: true } })
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Đăng ký thất bại')
    } finally {
      setDangGui(false)
    }
  }

  return (
    <AuthLayout rong tieuDe="Đăng ký tài khoản bệnh nhân"
      moTa={<>Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link></>}>
      <Steps current={0} size="small" items={BUOC_DANG_KY} style={{ marginBottom: 24 }} {...kieuBuoc} />
      {loi && (
        <Alert type="error" showIcon title={loi} style={{ marginBottom: 16 }}
          action={loi.includes('chưa xác thực') && (
            <Button size="small" onClick={() => navigate(
              `/xac-thuc-email?dinh_danh=${encodeURIComponent(form.getFieldValue('email') ?? '')}`)}>
              Xác thực
            </Button>
          )} />
      )}

      <Form<GiaTri> form={form} layout="vertical" requiredMark="optional" onFinish={gui} scrollToFirstError
        initialValues={{ gioi_tinh: 'NAM' }}>
        <Form.Item name="ho_ten" label="Họ và tên" rules={[quyTac.batBuoc('họ và tên'), { max: 100 }]}>
          <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" autoComplete="name" autoCapitalize="words" />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="ngay_sinh" label="Ngày sinh" rules={[{ required: true, message: 'Vui lòng chọn ngày sinh' }]}>
              <ONhapNgay placeholder="dd/mm/yyyy" style={{ width: '100%' }}
                disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="gioi_tinh" label="Giới tính" rules={[{ required: true }]}>
              <Radio.Group optionType="button" buttonStyle="solid"
                options={[{ label: 'Nam', value: 'NAM' }, { label: 'Nữ', value: 'NU' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="sdt" label="Số điện thoại" rules={[quyTac.batBuoc('số điện thoại'), quyTac.sdt]}>
              <Input prefix={<PhoneOutlined />} placeholder="0912345678" autoComplete="tel" inputMode="tel" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="email" label="Email" extra="Mã xác thực sẽ được gửi tới email này"
              rules={[quyTac.batBuoc('email'), quyTac.email]}>
              <Input prefix={<MailOutlined />} placeholder="ban@gmail.com" autoComplete="email" inputMode="email"
                {...KHONG_TU_SUA} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="cccd" rules={[quyTac.cccd]}
              label={
                <Tooltip title="Nếu bạn đã từng khám tại phòng khám, nhập đúng CCCD để liên kết với hồ sơ cũ">
                  <span>Số CCCD <Typography.Text type="secondary">(?)</Typography.Text></span>
                </Tooltip>
              }>
              <Input prefix={<IdcardOutlined />} placeholder="12 chữ số" maxLength={12} inputMode="numeric" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="dia_chi" label="Địa chỉ" rules={[{ max: 255 }]}>
              <Input placeholder="Số nhà, đường, quận" autoComplete="street-address" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="mat_khau" label="Mật khẩu" hasFeedback
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }, quyTac.matKhau]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Ít nhất 8 ký tự, có chữ và số"
                autoComplete="new-password" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="nhap_lai" label="Nhập lại mật khẩu" dependencies={['mat_khau']} hasFeedback
              rules={[{ required: true, message: 'Vui lòng nhập lại mật khẩu' }, quyTac.nhapLai('mat_khau')]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" autoComplete="new-password" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="dong_y" valuePropName="checked"
          rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject(new Error('Bạn cần đồng ý để tiếp tục')) }]}>
          <Checkbox>Tôi đồng ý để phòng khám lưu trữ và sử dụng thông tin cá nhân phục vụ khám chữa bệnh</Checkbox>
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={dangGui}>
          Đăng ký
        </Button>
      </Form>
    </AuthLayout>
  )
}
