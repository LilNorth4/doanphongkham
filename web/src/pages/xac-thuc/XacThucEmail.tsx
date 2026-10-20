import { MailOutlined } from '@ant-design/icons'
import { Alert, App, Button, Flex, Form, Input, Result, Steps, Typography } from 'antd'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api, LoiApi } from '@/lib/api'
import AuthLayout from '@/layouts/AuthLayout'
import { KHONG_TU_SUA, TU_DONG_FOCUS, useKieuBuoc } from '@/hooks/manHinh'
import OtpSo from '@/components/OtpSo'
import HopThuThu from '@/components/HopThuThu'
import { useDemNguoc } from '@/hooks/useDemNguoc'
import { quyTac } from '@/lib/hangSo'
import { BUOC_DANG_KY } from '@/pages/xac-thuc/DangKy'

/** UC1.2: nhập mã OTP 6 số gửi tới email để kích hoạt tài khoản bệnh nhân. */
export default function XacThucEmail() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const vuaGui = (useLocation().state as { vuaGui?: boolean } | null)?.vuaGui
  const [params] = useSearchParams()
  const [dinhDanh, setDinhDanh] = useState(params.get('dinh_danh') ?? '')
  const [otp, setOtp] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const [xong, setXong] = useState(false)
  const kieuBuoc = useKieuBuoc()
  const { con, batDau } = useDemNguoc(vuaGui ? 60 : 0)

  const xacNhan = async (ma = otp) => {
    if (ma.length !== 6) {
      setLoi('Vui lòng nhập đủ 6 chữ số')
      return
    }
    setDangGui(true)
    setLoi(null)
    try {
      await api.xacThucEmail(dinhDanh, ma)
      setXong(true)                                  // bước "Hoàn tất" trước khi sang đăng nhập
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Xác thực thất bại')
      setOtp('')
    } finally {
      setDangGui(false)
    }
  }

  const guiLai = async () => {
    setLoi(null)
    try {
      await api.guiLaiMa(dinhDanh)
      message.success('Đã gửi mã mới, vui lòng kiểm tra email')
      batDau(60)
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Không gửi được mã')
    }
  }

  if (xong) {
    return (
      <AuthLayout rong tieuDe="Đăng ký thành công">
        <Steps current={2} status="finish" size="small" items={BUOC_DANG_KY} style={{ marginBottom: 24 }} {...kieuBuoc} />
        <Result status="success" title="Tài khoản đã được kích hoạt"
          subTitle={<>Email <Typography.Text strong>{dinhDanh}</Typography.Text> đã được xác thực. Mời bạn đăng nhập để đặt lịch khám.</>}
          extra={<Button type="primary" size="large" onClick={() => navigate('/dang-nhap', { replace: true, state: { dinhDanh } })}>
            Đăng nhập
          </Button>} />
      </AuthLayout>
    )
  }

  // Mở trang trực tiếp (không qua bước đăng ký): hỏi email trước
  if (!params.get('dinh_danh') && !dinhDanh.includes('@')) {
    return (
      <AuthLayout tieuDe="Xác thực email" moTa="Nhập email bạn đã dùng khi đăng ký">
        <Form layout="vertical" size="large" requiredMark={false}
          onFinish={(v: { email: string }) => setDinhDanh(v.email.trim().toLowerCase())}>
          <Form.Item name="email" label="Email" rules={[quyTac.batBuoc('email'), quyTac.email]}>
            <Input prefix={<MailOutlined />} placeholder="ban@gmail.com" autoFocus={TU_DONG_FOCUS} inputMode="email"
              {...KHONG_TU_SUA} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Tiếp tục</Button>
        </Form>
        <Flex justify="center" style={{ marginTop: 16 }}>
          <Link to="/dang-nhap">Quay lại đăng nhập</Link>
        </Flex>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout rong tieuDe="Xác thực email"
      moTa={<>Chúng tôi đã gửi mã gồm 6 chữ số tới <Typography.Text strong>{dinhDanh}</Typography.Text>. Mã có hiệu lực trong 5 phút.</>}>
      <Steps current={1} size="small" items={BUOC_DANG_KY} style={{ marginBottom: 24 }} {...kieuBuoc} />
      {loi && <Alert type="error" showIcon title={loi} style={{ marginBottom: 16 }} />}

      <Flex vertical align="center" gap={20}>
        <OtpSo size="large" value={otp} onChange={(v) => { setOtp(v); xacNhan(v) }} disabled={dangGui} />
        <Button type="primary" size="large" block loading={dangGui} onClick={() => xacNhan()}>
          Xác nhận
        </Button>
        <Typography.Text type="secondary">
          Chưa nhận được mã?{' '}
          <Button type="link" style={{ padding: 0 }} disabled={con > 0} onClick={guiLai}>
            {con > 0 ? `Gửi lại sau ${con} giây` : 'Gửi lại mã'}
          </Button>
        </Typography.Text>
        <Link to="/dang-nhap">Quay lại đăng nhập</Link>
      </Flex>

      <HopThuThu dinhDanh={dinhDanh} />
    </AuthLayout>
  )
}
