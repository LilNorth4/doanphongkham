import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Divider, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LoiApi } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import AuthLayout from '@/layouts/AuthLayout'
import { KHONG_TU_SUA, TU_DONG_FOCUS } from '@/hooks/manHinh'
import { quyTac } from '@/lib/hangSo'

interface GiaTri {
  dinh_danh: string
  mat_khau: string
}

export default function DangNhap() {
  const { dangNhap } = usePhien()
  const navigate = useNavigate()
  const state = useLocation().state as { tu?: string; dinhDanh?: string; thongBao?: string } | null
  const [form] = Form.useForm<GiaTri>()
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)

  const gui = async ({ dinh_danh, mat_khau }: GiaTri) => {
    setDangGui(true)
    setLoi(null)
    try {
      const nd = await dangNhap(dinh_danh.trim(), mat_khau)
      navigate(nd.PhaiDoiMatKhau ? '/doi-mat-khau' : state?.tu || '/', { replace: true })
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Đăng nhập thất bại')
      form.setFieldValue('mat_khau', '')
    } finally {
      setDangGui(false)
    }
  }

  // Tài khoản bệnh nhân đăng ký nhưng chưa nhập OTP: cho đi thẳng tới bước xác thực
  const chuaXacThuc = loi?.includes('chưa xác thực email')

  return (
    <AuthLayout tieuDe="Đăng nhập" moTa="Dành cho bệnh nhân và nhân viên phòng khám">
      {state?.thongBao && !loi && (
        <Alert type="success" showIcon title={state.thongBao} style={{ marginBottom: 16 }} />
      )}
      {loi && (
        <Alert
          type="error"
          showIcon
          title={loi}
          style={{ marginBottom: 16 }}
          action={chuaXacThuc && (
            <Button size="small" type="primary"
              onClick={() => navigate(`/xac-thuc-email?dinh_danh=${encodeURIComponent(form.getFieldValue('dinh_danh'))}`)}>
              Xác thực ngay
            </Button>
          )}
        />
      )}

      <Form form={form} layout="vertical" size="large" requiredMark={false} onFinish={gui}
        initialValues={{ dinh_danh: state?.dinhDanh ?? '' }}>
        <Form.Item name="dinh_danh" label="Email hoặc số điện thoại"
          rules={[quyTac.batBuoc('email hoặc số điện thoại'), quyTac.dinhDanh]}>
          <Input prefix={<UserOutlined />} placeholder="vd: an.hv@gmail.com hoặc 0912345678"
            autoComplete="username" autoFocus={TU_DONG_FOCUS} {...KHONG_TU_SUA} />
        </Form.Item>
        <Form.Item name="mat_khau" label="Mật khẩu" style={{ marginBottom: 8 }}
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" autoComplete="current-password" />
        </Form.Item>
        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <Link to="/quen-mat-khau">Quên mật khẩu?</Link>
        </div>
        <Button type="primary" htmlType="submit" block loading={dangGui}>
          Đăng nhập
        </Button>
      </Form>

      <Divider plain>
        <Typography.Text type="secondary">Lần đầu đến phòng khám?</Typography.Text>
      </Divider>
      <Link to="/dang-ky">
        <Button block size="large">Đăng ký tài khoản bệnh nhân</Button>
      </Link>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16, fontSize: 13, textAlign: 'center' }}>
        Nhân viên dùng tài khoản do quản trị viên cấp. Nhập sai mật khẩu 5 lần, tài khoản bị tạm khóa 15 phút.
      </Typography.Paragraph>
    </AuthLayout>
  )
}
