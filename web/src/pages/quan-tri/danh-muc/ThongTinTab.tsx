import { SaveOutlined } from '@ant-design/icons'
import { App, Button, Col, Divider, Form, Input, Row, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { quyTac } from '@/lib/hangSo'
import { thongBaoLoi } from './chung'

interface GiaTri {
  ten_phong_kham: string; gioi_thieu?: string; dia_chi: string; gio_lam_viec: string; hotline: string; email?: string
  ma_ngan_hang?: string; so_tai_khoan?: string; ten_tai_khoan?: string
}

/** UC3.6: thông tin chung của phòng khám; tài khoản ngân hàng dùng để sinh mã VietQR khi thanh toán (BR26). */
export default function ThongTinTab() {
  const { message } = App.useApp()
  const [form] = Form.useForm<GiaTri>()
  const [daTai, setDaTai] = useState(false)
  const [dangLuu, setDangLuu] = useState(false)

  useEffect(() => {
    api.thongTinPhongKham().then((t) => {
      form.setFieldsValue({
        ten_phong_kham: t.TenPhongKham, gioi_thieu: t.GioiThieu ?? '', dia_chi: t.DiaChi, gio_lam_viec: t.GioLamViec,
        hotline: t.Hotline, email: t.Email ?? '', ma_ngan_hang: t.MaNganHang ?? '', so_tai_khoan: t.SoTaiKhoan ?? '',
        ten_tai_khoan: t.TenTaiKhoan ?? '',
      })
      setDaTai(true)
    }).catch((e) => message.error(thongBaoLoi(e)))
  }, [form, message])

  const luu = async (v: GiaTri) => {
    setDangLuu(true)
    try {
      await api.luuThongTinPhongKham({ ...v })
      message.success('Đã lưu thông tin phòng khám')
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangLuu(false)
    }
  }

  return (
    <>
      {!daTai && <Skeleton active />}
      <Form form={form} layout="vertical" onFinish={luu} style={{ maxWidth: 760, display: daTai ? undefined : 'none' }}>
        <Form.Item name="ten_phong_kham" label="Tên phòng khám" rules={[quyTac.batBuoc('tên phòng khám')]}><Input maxLength={150} /></Form.Item>
        <Form.Item name="gioi_thieu" label="Giới thiệu"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="dia_chi" label="Địa chỉ" rules={[quyTac.batBuoc('địa chỉ')]}><Input maxLength={255} /></Form.Item>
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="gio_lam_viec" label="Giờ làm việc" rules={[quyTac.batBuoc('giờ làm việc')]}><Input maxLength={255} /></Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="hotline" label="Hotline" rules={[quyTac.batBuoc('hotline'),
              { pattern: /^[\d\s.-]{8,15}$/, message: '8 đến 11 chữ số' }]}><Input maxLength={15} /></Form.Item>
          </Col>
          <Col xs={12} md={6}><Form.Item name="email" label="Email" rules={[quyTac.email]}><Input maxLength={100} /></Form.Item></Col>
        </Row>
        <Divider titlePlacement="start">Tài khoản nhận chuyển khoản (VietQR)</Divider>
        <Row gutter={12}>
          <Col xs={12} md={6}><Form.Item name="ma_ngan_hang" label="Mã ngân hàng (BIN)"><Input maxLength={20} placeholder="970436" /></Form.Item></Col>
          <Col xs={12} md={8}>
            <Form.Item name="so_tai_khoan" label="Số tài khoản" rules={[{ pattern: /^\d{6,30}$/, message: 'Chỉ gồm chữ số' }]}>
              <Input maxLength={30} />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}><Form.Item name="ten_tai_khoan" label="Tên tài khoản"><Input maxLength={100} /></Form.Item></Col>
        </Row>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={dangLuu}>Lưu thông tin</Button>
      </Form>
    </>
  )
}
