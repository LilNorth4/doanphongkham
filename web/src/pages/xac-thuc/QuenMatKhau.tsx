import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, App, Button, Flex, Form, Input, Steps, Typography } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, LoiApi } from '@/lib/api'
import AuthLayout from '@/layouts/AuthLayout'
import { KHONG_TU_SUA, TU_DONG_FOCUS, useKieuBuoc } from '@/hooks/manHinh'
import OtpSo from '@/components/OtpSo'
import HopThuThu from '@/components/HopThuThu'
import { useDemNguoc } from '@/hooks/useDemNguoc'
import { quyTac } from '@/lib/hangSo'

interface DatLai {
  ma_otp: string
  mat_khau_moi: string
  nhap_lai: string
}

/** UC1.4: khôi phục mật khẩu bằng mã OTP gửi về email (dùng cho mọi vai trò). */
export default function QuenMatKhau() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [buoc, setBuoc] = useState(0)
  const [dinhDanh, setDinhDanh] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const kieuBuoc = useKieuBuoc()
  const { con, batDau } = useDemNguoc()

  const chay = async (viec: () => Promise<void>) => {
    setDangGui(true)
    setLoi(null)
    try {
      await viec()
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setDangGui(false)
    }
  }

  const guiMa = (dd: string) => chay(async () => {
    await api.quenMatKhau(dd)
    setDinhDanh(dd)
    setBuoc(1)
    batDau(60)
  })

  const datLai = (v: DatLai) => chay(async () => {
    await api.datLaiMatKhau(dinhDanh, v.ma_otp, v.mat_khau_moi)
    message.success('Đặt lại mật khẩu thành công')
    navigate('/dang-nhap', {
      replace: true,
      state: { dinhDanh, thongBao: 'Mật khẩu đã được đặt lại. Mời bạn đăng nhập bằng mật khẩu mới.' },
    })
  })

  return (
    <AuthLayout tieuDe="Khôi phục mật khẩu"
      moTa={buoc === 0
        ? 'Nhập email hoặc số điện thoại của tài khoản, chúng tôi sẽ gửi mã xác minh tới email đã đăng ký.'
        : <>Nếu tài khoản <Typography.Text strong>{dinhDanh}</Typography.Text> tồn tại, mã OTP đã được gửi tới
          email đăng ký và có hiệu lực 5 phút.</>}>
      <Steps current={buoc} size="small" style={{ marginBottom: 24 }} {...kieuBuoc}
        items={[{ title: 'Tài khoản' }, { title: 'Đặt mật khẩu mới' }]} />
      {loi && <Alert type="error" showIcon title={loi} style={{ marginBottom: 16 }} />}

      {buoc === 0 ? (
        <Form layout="vertical" size="large" requiredMark={false}
          onFinish={(v: { dinh_danh: string }) => guiMa(v.dinh_danh.trim())}>
          <Form.Item name="dinh_danh" label="Email hoặc số điện thoại"
            rules={[quyTac.batBuoc('email hoặc số điện thoại'), quyTac.dinhDanh]}>
            <Input prefix={<UserOutlined />} placeholder="vd: an.hv@gmail.com" autoComplete="username"
              autoFocus={TU_DONG_FOCUS} {...KHONG_TU_SUA} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={dangGui}>Gửi mã xác minh</Button>
        </Form>
      ) : (
        <Form<DatLai> layout="vertical" size="large" requiredMark={false} onFinish={datLai}>
          <Form.Item name="ma_otp" label="Mã OTP"
            rules={[{ required: true, len: 6, message: 'Vui lòng nhập đủ 6 chữ số' }]}>
            <OtpSo />
          </Form.Item>
          <Form.Item name="mat_khau_moi" label="Mật khẩu mới" hasFeedback
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, quyTac.matKhau]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Ít nhất 8 ký tự, có chữ và số"
              autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="nhap_lai" label="Nhập lại mật khẩu mới" dependencies={['mat_khau_moi']} hasFeedback
            rules={[{ required: true, message: 'Vui lòng nhập lại mật khẩu' }, quyTac.nhapLai('mat_khau_moi')]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={dangGui}>Đặt lại mật khẩu</Button>
          <Flex justify="space-between" style={{ marginTop: 12 }}>
            <Button type="link" style={{ padding: 0 }} onClick={() => { setBuoc(0); setLoi(null) }}>
              Đổi tài khoản
            </Button>
            <Button type="link" style={{ padding: 0 }} disabled={con > 0} onClick={() => guiMa(dinhDanh)}>
              {con > 0 ? `Gửi lại mã sau ${con} giây` : 'Gửi lại mã'}
            </Button>
          </Flex>
        </Form>
      )}

      <Flex justify="center" style={{ marginTop: 20 }}>
        <Link to="/dang-nhap">Quay lại đăng nhập</Link>
      </Flex>
      {buoc === 1 && <HopThuThu dinhDanh={dinhDanh} />}
    </AuthLayout>
  )
}
