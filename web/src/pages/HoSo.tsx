import { CameraOutlined, DeleteOutlined, EditOutlined, KeyOutlined, LockOutlined } from '@ant-design/icons'
import {
  Alert, App, Button, Card, Col, DatePicker, Descriptions, Flex, Form, Input, Popconfirm, Radio, Rate, Row, Skeleton,
  Tag, Typography, Upload,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnhDaiDien from '@/components/AnhDaiDien'
import { api, type CapNhatHoSo, type HoSo as HoSoKieu } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { MAU_VAI_TRO, quyTac, TEN_VAI_TRO } from '@/lib/hangSo'

const NHAN_ANH = 'image/jpeg,image/png,image/webp'
const TEN_GIOI_TINH = { NAM: 'Nam', NU: 'Nữ' }

type GiaTriForm = Omit<CapNhatHoSo, 'ngay_sinh'> & { ngay_sinh?: Dayjs | null }

const ngay = (s?: string | null) => (s ? dayjs(s).format('DD/MM/YYYY') : '—')
const ngayGio = (s?: string | null) => (s ? dayjs(s).format('HH:mm DD/MM/YYYY') : '—')
const coGiaTri = (s?: string | number | null) => (s === null || s === undefined || s === '' ? '—' : s)

/** Hồ sơ cá nhân cho mọi vai trò: ảnh đại diện, thông tin chi tiết và tự sửa thông tin cơ bản. */
export default function HoSo() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const { nguoiDung, taiLai } = usePhien()
  const [hs, setHs] = useState<HoSoKieu | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [dangSua, setDangSua] = useState(false)
  const [dangLuu, setDangLuu] = useState(false)
  const [dangTaiAnh, setDangTaiAnh] = useState(false)

  useEffect(() => {
    api.hoSo().then(setHs).catch((e) => setLoi(e.message))
  }, [])

  if (!nguoiDung) return null
  if (loi) return <Alert type="error" showIcon title={loi} />
  if (!hs) return <Card><Skeleton avatar active paragraph={{ rows: 6 }} /></Card>

  const laBenhNhan = hs.MaBN !== undefined
  const laBacSi = hs.LoaiNhanVien === 'BAC_SI'
  const ma = laBenhNhan ? `BN${String(hs.MaBN).padStart(5, '0')}` : `NV${String(hs.MaNV).padStart(4, '0')}`

  const giaTriBanDau = (): GiaTriForm => ({
      ho_ten: hs.HoTen,
      ngay_sinh: hs.NgaySinh ? dayjs(hs.NgaySinh) : null,
      gioi_tinh: hs.GioiTinh,
      dia_chi: hs.DiaChi,
      cccd: hs.CCCD,
      nguoi_lien_he: hs.NguoiLienHe,
      sdt_nguoi_lien_he: hs.SDTNguoiLienHe,
      gioi_thieu: hs.GioiThieu,
  })

  const luu = async (v: GiaTriForm) => {
    setDangLuu(true)
    try {
      setHs(await api.capNhatHoSo({ ...v, ngay_sinh: v.ngay_sinh ? v.ngay_sinh.format('YYYY-MM-DD') : null }))
      setDangSua(false)
      message.success('Đã cập nhật thông tin cá nhân')
      taiLai() // họ tên trên thanh bên
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setDangLuu(false)
    }
  }

  const doiAnh = async (tep: File) => {
    if (tep.size > 2 * 1024 * 1024) {
      message.error('Ảnh tối đa 2 MB')
      return
    }
    setDangTaiAnh(true)
    try {
      const { AnhDaiDien } = await api.doiAnhDaiDien(tep)
      setHs((h) => h && { ...h, AnhDaiDien })
      message.success('Đã đổi ảnh đại diện')
      taiLai()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setDangTaiAnh(false)
    }
  }

  const xoaAnh = async () => {
    try {
      await api.xoaAnhDaiDien()
      setHs((h) => h && { ...h, AnhDaiDien: null })
      message.success('Đã xóa ảnh đại diện')
      taiLai()
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const thongTinCaNhan = [
    { key: 'ten', label: 'Họ và tên', children: hs.HoTen },
    { key: 'ns', label: 'Ngày sinh', children: ngay(hs.NgaySinh) },
    { key: 'gt', label: 'Giới tính', children: hs.GioiTinh ? TEN_GIOI_TINH[hs.GioiTinh] : '—' },
    ...(laBenhNhan ? [{ key: 'cccd', label: 'Số CCCD', children: coGiaTri(hs.CCCD) }] : []),
    { key: 'dc', label: 'Địa chỉ', children: coGiaTri(hs.DiaChi), span: 'filled' as const },
    ...(laBenhNhan ? [
      { key: 'nlh', label: 'Người liên hệ', children: coGiaTri(hs.NguoiLienHe) },
      { key: 'sdtlh', label: 'SĐT người liên hệ', children: coGiaTri(hs.SDTNguoiLienHe) },
    ] : []),
    ...(laBacSi ? [{ key: 'gtbs', label: 'Giới thiệu', children: coGiaTri(hs.GioiThieu), span: 'filled' as const }] : []),
  ]

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={8}>
        <Card>
          <Flex vertical align="center" gap={6} style={{ textAlign: 'center' }}>
            <div className="ho-so-anh">
              <AnhDaiDien anh={hs.AnhDaiDien} hoTen={hs.HoTen} co={120} />
              <Upload accept={NHAN_ANH} showUploadList={false} disabled={dangTaiAnh}
                beforeUpload={(tep) => { doiAnh(tep); return false }}>
                <Button shape="circle" icon={<CameraOutlined />} loading={dangTaiAnh} className="ho-so-doi-anh"
                  aria-label="Đổi ảnh đại diện" />
              </Upload>
            </div>
            <Typography.Title level={4} style={{ margin: '8px 0 0' }}>{hs.HoTen}</Typography.Title>
            <Flex gap={6} wrap justify="center">
              <Tag color={MAU_VAI_TRO[nguoiDung.VaiTro]}>{TEN_VAI_TRO[nguoiDung.VaiTro]}</Tag>
              <Tag>{ma}</Tag>
            </Flex>
            <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
              Ảnh JPG, PNG hoặc WEBP, tối đa 2 MB
            </Typography.Text>
            {hs.AnhDaiDien && (
              <Popconfirm title="Xóa ảnh đại diện?" okText="Xóa" cancelText="Không" onConfirm={xoaAnh}>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}>Xóa ảnh</Button>
              </Popconfirm>
            )}
          </Flex>
        </Card>

        <Card title="Tài khoản đăng nhập" style={{ marginTop: 24 }}>
          <Descriptions column={1} size="small" items={[
            { key: 'email', label: 'Email', children: coGiaTri(hs.Email) },
            { key: 'sdt', label: 'Số điện thoại', children: coGiaTri(hs.SDT) },
            { key: 'tao', label: 'Ngày tạo', children: ngay(hs.NgayTao) },
            { key: 'cuoi', label: 'Đăng nhập gần nhất', children: ngayGio(hs.LanDangNhapCuoi) },
          ]} />
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '8px 0 12px' }}>
            <LockOutlined /> Email và số điện thoại dùng để đăng nhập. Muốn đổi, vui lòng liên hệ
            {laBenhNhan ? ' lễ tân' : ' quản trị viên'}.
          </Typography.Paragraph>
          <Button block icon={<KeyOutlined />} onClick={() => navigate('/doi-mat-khau')}>Đổi mật khẩu</Button>
        </Card>
      </Col>

      <Col xs={24} lg={16}>
        <Card title="Thông tin cá nhân"
          extra={!dangSua && <Button type="primary" ghost icon={<EditOutlined />} onClick={() => setDangSua(true)}>Chỉnh sửa</Button>}>
          {!dangSua ? (
            <Descriptions column={{ xs: 1, sm: 2 }} size="middle" items={thongTinCaNhan} />
          ) : (
            <Form layout="vertical" initialValues={giaTriBanDau()} onFinish={luu} requiredMark="optional">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="ho_ten" label="Họ và tên" rules={[quyTac.batBuoc('họ tên')]}>
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="ngay_sinh" label="Ngày sinh"
                    rules={laBenhNhan ? [{ required: true, message: 'Vui lòng chọn ngày sinh' }] : []}>
                    <DatePicker format="DD/MM/YYYY" placeholder="dd/mm/yyyy" style={{ width: '100%' }}
                      disabledDate={(d) => d.isAfter(dayjs())} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="gioi_tinh" label="Giới tính"
                    rules={laBenhNhan ? [{ required: true, message: 'Vui lòng chọn giới tính' }] : []}>
                    <Radio.Group options={[{ value: 'NAM', label: 'Nam' }, { value: 'NU', label: 'Nữ' }]} />
                  </Form.Item>
                </Col>
                {laBenhNhan && (
                  <Col xs={24} sm={12}>
                    <Form.Item name="cccd" label="Số CCCD" rules={[quyTac.cccd]}
                      extra={hs.CCCD ? 'Đã có CCCD, muốn sửa vui lòng liên hệ lễ tân' : undefined}>
                      <Input maxLength={12} inputMode="numeric" disabled={!!hs.CCCD} />
                    </Form.Item>
                  </Col>
                )}
                <Col span={24}>
                  <Form.Item name="dia_chi" label="Địa chỉ">
                    <Input maxLength={255} />
                  </Form.Item>
                </Col>
                {laBenhNhan && (
                  <>
                    <Col xs={24} sm={12}>
                      <Form.Item name="nguoi_lien_he" label="Người liên hệ khi cần">
                        <Input maxLength={100} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="sdt_nguoi_lien_he" label="SĐT người liên hệ" rules={[quyTac.sdt]}>
                        <Input maxLength={15} inputMode="tel" />
                      </Form.Item>
                    </Col>
                  </>
                )}
                {laBacSi && (
                  <Col span={24}>
                    <Form.Item name="gioi_thieu" label="Giới thiệu (hiện cho bệnh nhân khi chọn bác sĩ)">
                      <Input.TextArea rows={4} maxLength={2000} showCount />
                    </Form.Item>
                  </Col>
                )}
              </Row>
              <Flex gap={8} justify="flex-end">
                <Button onClick={() => setDangSua(false)}>Hủy</Button>
                <Button type="primary" htmlType="submit" loading={dangLuu}>Lưu thay đổi</Button>
              </Flex>
            </Form>
          )}
        </Card>

        {!laBenhNhan && (
          <Card title="Thông tin công việc" style={{ marginTop: 24 }}>
            <Descriptions column={{ xs: 1, sm: 2 }} size="middle" items={[
              { key: 'vt', label: 'Vai trò', children: hs.TenVaiTro },
              ...(hs.TenCK ? [{ key: 'ck', label: 'Chuyên khoa', children: hs.TenCK }] : []),
              ...(hs.TenPhong ? [{ key: 'p', label: 'Phòng phụ trách', children: `${hs.MaSoPhong} · ${hs.TenPhong}` }] : []),
              ...(laBacSi ? [
                { key: 'hh', label: 'Học hàm, học vị', children: coGiaTri(hs.HocHamHocVi) },
                { key: 'kn', label: 'Kinh nghiệm', children: hs.SoNamKinhNghiem != null ? `${hs.SoNamKinhNghiem} năm` : '—' },
                {
                  key: 'dg', label: 'Đánh giá', children: hs.SoLuotDanhGia ? (
                    <Flex gap={6} align="center">
                      <Rate disabled allowHalf value={Number(hs.DiemDanhGiaTB)} style={{ fontSize: 14 }} />
                      {Number(hs.DiemDanhGiaTB).toFixed(1)} ({hs.SoLuotDanhGia} lượt)
                    </Flex>
                  ) : 'Chưa có đánh giá',
                },
              ] : []),
            ]} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Thông tin công việc do quản trị viên cập nhật.
            </Typography.Text>
          </Card>
        )}

        {laBenhNhan && (
          <Card title="Thông tin y tế" style={{ marginTop: 24 }}>
            <Descriptions column={1} size="middle" items={[
              { key: 'du', label: 'Dị ứng đã ghi nhận', children: coGiaTri(hs.DiUng) },
            ]} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Do bác sĩ ghi nhận khi khám. Nếu thông tin chưa đúng, hãy báo bác sĩ ở lần khám tới.
            </Typography.Text>
          </Card>
        )}
      </Col>
    </Row>
  )
}
