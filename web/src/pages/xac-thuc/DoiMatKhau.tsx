import { LockOutlined } from '@ant-design/icons'
import { Alert, App, Button, Flex, Form, Input } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, LoiApi } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import AuthLayout from '@/layouts/AuthLayout'
import { quyTac } from '@/lib/hangSo'

interface GiaTri {
  mat_khau_cu: string
  mat_khau_moi: string
  nhap_lai: string
}

/** Đổi mật khẩu; nhân viên đăng nhập bằng mật khẩu tạm bị chuyển tới đây trước khi dùng hệ thống. */
export default function DoiMatKhau() {
  const { message } = App.useApp()
  const { nguoiDung, taiLai, dangXuat } = usePhien()
  const navigate = useNavigate()
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const batBuoc = nguoiDung?.PhaiDoiMatKhau

  const gui = async (v: GiaTri) => {
    setDangGui(true)
    setLoi(null)
    try {
      await api.doiMatKhau(v.mat_khau_cu, v.mat_khau_moi)
      await taiLai()
      message.success('Đổi mật khẩu thành công. Các thiết bị khác đã được đăng xuất.')
      navigate('/', { replace: true })
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Đổi mật khẩu thất bại')
    } finally {
      setDangGui(false)
    }
  }

  return (
    <AuthLayout tieuDe="Đổi mật khẩu" moTa={nguoiDung ? `Tài khoản: ${nguoiDung.Email ?? nguoiDung.SDT}` : undefined}>
      {batBuoc && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }}
          title="Bạn đang dùng mật khẩu tạm thời"
          description="Vì lý do bảo mật, vui lòng đặt mật khẩu mới trước khi sử dụng hệ thống." />
      )}
      {loi && <Alert type="error" showIcon title={loi} style={{ marginBottom: 16 }} />}

      <Form<GiaTri> layout="vertical" size="large" requiredMark={false} onFinish={gui}>
        <Form.Item name="mat_khau_cu" label={batBuoc ? 'Mật khẩu tạm thời' : 'Mật khẩu hiện tại'}
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" autoFocus />
        </Form.Item>
        <Form.Item name="mat_khau_moi" label="Mật khẩu mới" dependencies={['mat_khau_cu']} hasFeedback
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            quyTac.matKhau,
            ({ getFieldValue }) => ({
              validator: (_, v) => !v || v !== getFieldValue('mat_khau_cu')
                ? Promise.resolve()
                : Promise.reject(new Error('Mật khẩu mới phải khác mật khẩu hiện tại')),
            }),
          ]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Ít nhất 8 ký tự, có chữ và số"
            autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="nhap_lai" label="Nhập lại mật khẩu mới" dependencies={['mat_khau_moi']} hasFeedback
          rules={[{ required: true, message: 'Vui lòng nhập lại mật khẩu' }, quyTac.nhapLai('mat_khau_moi')]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={dangGui}>Lưu mật khẩu mới</Button>
      </Form>

      <Flex justify="center" style={{ marginTop: 16 }}>
        {batBuoc ? (
          <Button type="link" onClick={async () => { await dangXuat(); navigate('/dang-nhap', { replace: true }) }}>
            Đăng xuất
          </Button>
        ) : (
          <Button type="link" onClick={() => navigate(-1)}>Quay lại</Button>
        )}
      </Flex>
    </AuthLayout>
  )
}
