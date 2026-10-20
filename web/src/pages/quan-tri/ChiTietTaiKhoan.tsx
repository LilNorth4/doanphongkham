import { DesktopOutlined, EditOutlined, LogoutOutlined } from '@ant-design/icons'
import {
  App, Button, Card, Col, DatePicker, Descriptions, Drawer, Empty, Flex, Form, Input, InputNumber, Radio, Row,
  Skeleton, Space, Tag, Timeline, Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { api, LoiApi, type ChiTietTaiKhoan as ChiTiet } from '@/lib/api'
import { MAU_VAI_TRO, quyTac, TEN_HANH_DONG, TEN_VAI_TRO, TRANG_THAI } from '@/lib/hangSo'

interface FormNv {
  HoTen: string
  NgaySinh?: Dayjs | null
  GioiTinh?: 'NAM' | 'NU' | null
  SDT: string
  Email: string
  DiaChi?: string | null
  HocHamHocVi?: string | null
  SoNamKinhNghiem?: number | null
  GioiThieu?: string | null
}

const ngay = (d: string | null | undefined, dinhDang = 'DD/MM/YYYY') => (d ? dayjs(d).format(dinhDang) : '—')
const gioiTinh = (g: string | null | undefined) => (g === 'NAM' ? 'Nam' : g === 'NU' ? 'Nữ' : '—')

/** Chi tiết tài khoản cho quản trị viên: sửa hồ sơ nhân viên, xem/thu hồi phiên, lịch sử thao tác. */
export default function ChiTietTaiKhoan({ maTk, onClose, onDoi }: { maTk: number | null; onClose: () => void; onDoi: () => void }) {
  const { message, modal } = App.useApp()
  const [tk, setTk] = useState<ChiTiet | null>(null)
  const [sua, setSua] = useState(false)
  const [dangLuu, setDangLuu] = useState(false)
  const [form] = Form.useForm<FormNv>()

  const tai = useCallback(async () => {
    if (!maTk) return
    try {
      setTk(await api.chiTietTaiKhoan(maTk))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được tài khoản')
    }
  }, [maTk, message])

  useEffect(() => {
    setTk(null)
    setSua(false)
    tai()
  }, [tai])

  const nv = tk?.NhanVien
  const bn = tk?.BenhNhan

  const batDauSua = () => {
    if (!nv) return
    form.setFieldsValue({
      HoTen: nv.HoTen, NgaySinh: nv.NgaySinh ? dayjs(nv.NgaySinh) : null, GioiTinh: nv.GioiTinh,
      SDT: nv.SDT ?? '', Email: nv.Email ?? '', DiaChi: nv.DiaChi, HocHamHocVi: nv.HocHamHocVi,
      SoNamKinhNghiem: nv.SoNamKinhNghiem, GioiThieu: nv.GioiThieu,
    })
    setSua(true)
  }

  const luu = async (v: FormNv) => {
    if (!nv || !maTk) return
    const moi = { ...v, NgaySinh: v.NgaySinh ? v.NgaySinh.format('YYYY-MM-DD') : null }
    // Chỉ gửi các trường thật sự đổi để nhật ký ghi đúng
    const doi = Object.fromEntries(Object.entries(moi).filter(([k, giaTri]) =>
      String(giaTri ?? '') !== String((nv as Record<string, unknown>)[k] ?? '')))
    if (Object.keys(doi).length === 0) {
      setSua(false)
      return
    }
    setDangLuu(true)
    try {
      await api.suaNhanVien(maTk, doi)
      message.success('Đã cập nhật hồ sơ nhân viên')
      setSua(false)
      await tai()
      onDoi()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Cập nhật thất bại')
    } finally {
      setDangLuu(false)
    }
  }

  const thuHoi = () => modal.confirm({
    title: 'Đăng xuất tài khoản khỏi mọi thiết bị?',
    content: 'Người dùng sẽ phải đăng nhập lại trên tất cả thiết bị. Dùng khi nghi ngờ lộ mật khẩu hoặc mất thiết bị.',
    okText: 'Đăng xuất tất cả', okType: 'danger', cancelText: 'Hủy',
    onOk: async () => {
      try {
        const { so_phien } = await api.thuHoiPhien(maTk!)
        message.success(`Đã thu hồi ${so_phien} phiên đăng nhập`)
        tai()
      } catch (e) {
        message.error(e instanceof LoiApi ? e.message : 'Thu hồi thất bại')
      }
    },
  })

  const tamKhoa = tk?.KhoaDen && dayjs(tk.KhoaDen).isAfter(dayjs())

  return (
    <Drawer open={!!maTk} onClose={onClose} size="min(640px, 100vw)" destroyOnHidden
      title={tk ? (
        <Flex align="center" gap={8} wrap>
          {nv?.HoTen ?? bn?.HoTen ?? tk.Email}
          <Tag color={MAU_VAI_TRO[tk.VaiTro]}>{TEN_VAI_TRO[tk.VaiTro]}</Tag>
          <Tag color={TRANG_THAI[tk.TrangThai].mau}>{TRANG_THAI[tk.TrangThai].ten}</Tag>
          {tamKhoa && <Tag color="warning">Tạm khóa đến {ngay(tk.KhoaDen, 'HH:mm')}</Tag>}
        </Flex>
      ) : 'Chi tiết tài khoản'}>
      {!tk ? <Skeleton active paragraph={{ rows: 12 }} /> : (
        <Flex vertical gap={16}>
          <Card size="small" title="Tài khoản đăng nhập">
            <Descriptions size="small" column={{ xs: 1, sm: 2 }} items={[
              { key: 'e', label: 'Email', children: tk.Email ?? '—' },
              { key: 's', label: 'Số điện thoại', children: tk.SDT ?? '—' },
              { key: 'dn', label: 'Đăng nhập gần nhất', children: ngay(tk.LanDangNhapCuoi, 'HH:mm DD/MM/YYYY') },
              { key: 'nt', label: 'Ngày tạo', children: ngay(tk.NgayTao) },
              { key: 'mk', label: 'Mật khẩu', children: tk.PhaiDoiMatKhau ? <Tag color="gold">Đang dùng mật khẩu tạm</Tag> : 'Đã đặt' },
              { key: 'sai', label: 'Sai mật khẩu liên tiếp', children: `${tk.SoLanSai}/5` },
              ...(tk.LyDoKhoa ? [{ key: 'ld', label: 'Lý do khóa', children: <Typography.Text type="danger">{tk.LyDoKhoa}</Typography.Text>, span: 2 }] : []),
            ]} />
          </Card>

          {nv && (
            <Card size="small" title="Hồ sơ nhân viên"
              extra={!sua && <Button size="small" icon={<EditOutlined />} onClick={batDauSua}>Sửa</Button>}>
              {sua ? (
                <Form form={form} layout="vertical" onFinish={luu} requiredMark="optional">
                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="HoTen" label="Họ tên" rules={[quyTac.batBuoc('họ tên'), { max: 100 }]}><Input /></Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Item name="NgaySinh" label="Ngày sinh">
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs())} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Item name="GioiTinh" label="Giới tính">
                        <Radio.Group options={[{ label: 'Nam', value: 'NAM' }, { label: 'Nữ', value: 'NU' }]} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="Email" label="Email" extra="Cũng là tên đăng nhập"
                        rules={[quyTac.batBuoc('email'), quyTac.email]}><Input /></Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="SDT" label="Số điện thoại" extra="Cũng là tên đăng nhập"
                        rules={[quyTac.batBuoc('số điện thoại'), quyTac.sdt]}><Input /></Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="DiaChi" label="Địa chỉ" rules={[{ max: 255 }]}><Input /></Form.Item>
                    </Col>
                    {tk.VaiTro !== 'LE_TAN' && tk.VaiTro !== 'QUAN_TRI' && (
                      <>
                        <Col xs={12} sm={12}>
                          <Form.Item name="HocHamHocVi" label="Học hàm / học vị" rules={[{ max: 50 }]}><Input placeholder="ThS.BS" /></Form.Item>
                        </Col>
                        <Col xs={12} sm={12}>
                          <Form.Item name="SoNamKinhNghiem" label="Số năm kinh nghiệm">
                            <InputNumber min={0} max={60} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item name="GioiThieu" label="Giới thiệu" extra="Hiển thị cho bệnh nhân khi chọn bác sĩ">
                            <Input.TextArea rows={3} maxLength={1000} showCount />
                          </Form.Item>
                        </Col>
                      </>
                    )}
                  </Row>
                  <Space>
                    <Button onClick={() => setSua(false)}>Hủy</Button>
                    <Button type="primary" htmlType="submit" loading={dangLuu}>Lưu</Button>
                  </Space>
                </Form>
              ) : (
                <Descriptions size="small" column={{ xs: 1, sm: 2 }} items={[
                  { key: 'ht', label: 'Họ tên', children: nv.HoTen },
                  { key: 'ma', label: 'Mã nhân viên', children: `NV${String(nv.MaNV).padStart(4, '0')}` },
                  { key: 'ns', label: 'Ngày sinh', children: ngay(nv.NgaySinh) },
                  { key: 'gt', label: 'Giới tính', children: gioiTinh(nv.GioiTinh) },
                  { key: 'dc', label: 'Địa chỉ', children: nv.DiaChi ?? '—', span: 2 },
                  ...(nv.TenCK ? [{ key: 'ck', label: 'Chuyên khoa', children: nv.TenCK }] : []),
                  ...(nv.MaSoPhong ? [{ key: 'p', label: 'Phòng phụ trách', children: `${nv.MaSoPhong} – ${nv.TenPhong}` }] : []),
                  ...(nv.HocHamHocVi ? [{ key: 'hv', label: 'Học hàm/vị', children: nv.HocHamHocVi }] : []),
                  ...(nv.SoNamKinhNghiem != null ? [{ key: 'kn', label: 'Kinh nghiệm', children: `${nv.SoNamKinhNghiem} năm` }] : []),
                  ...(nv.SoLuotDanhGia ? [{ key: 'dg', label: 'Đánh giá', children: `${Number(nv.DiemDanhGiaTB).toFixed(1)}/5 (${nv.SoLuotDanhGia} lượt)` }] : []),
                  ...(nv.GioiThieu ? [{ key: 'gth', label: 'Giới thiệu', children: nv.GioiThieu, span: 2 }] : []),
                ]} />
              )}
            </Card>
          )}

          {bn && (
            <Card size="small" title="Hồ sơ bệnh nhân">
              <Descriptions size="small" column={{ xs: 1, sm: 2 }} items={[
                { key: 'ht', label: 'Họ tên', children: bn.HoTen },
                { key: 'ma', label: 'Mã bệnh nhân', children: `BN${String(bn.MaBN).padStart(5, '0')}` },
                { key: 'ns', label: 'Ngày sinh', children: ngay(bn.NgaySinh) },
                { key: 'gt', label: 'Giới tính', children: gioiTinh(bn.GioiTinh) },
                { key: 'cccd', label: 'CCCD', children: bn.CCCD ?? '—' },
                { key: 'lk', label: 'Số lượt khám', children: bn.SoLuotKham },
                { key: 'dc', label: 'Địa chỉ', children: bn.DiaChi ?? '—', span: 2 },
              ]} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Thông tin bệnh nhân do bệnh nhân hoặc lễ tân cập nhật.
              </Typography.Text>
            </Card>
          )}

          <Card size="small" title={`Phiên đăng nhập đang hoạt động (${tk.Phien.length})`}
            extra={tk.Phien.length > 0 && (
              <Button size="small" danger icon={<LogoutOutlined />} onClick={thuHoi}>Đăng xuất mọi thiết bị</Button>
            )}>
            {tk.Phien.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có phiên nào" /> : (
              <Flex vertical gap={8}>
                {tk.Phien.map((p) => (
                  <Flex key={p.MaPhien} gap={10} align="center">
                    <DesktopOutlined style={{ fontSize: 18 }} />
                    <div style={{ minWidth: 0 }}>
                      <Typography.Text ellipsis style={{ maxWidth: 480 }}>{p.ThietBi ?? 'Không rõ thiết bị'}</Typography.Text>
                      <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Đăng nhập {ngay(p.NgayTao, 'HH:mm DD/MM/YYYY')} · hết hạn {ngay(p.HetHan)}
                      </Typography.Text></div>
                    </div>
                  </Flex>
                ))}
              </Flex>
            )}
          </Card>

          <Card size="small" title="Lịch sử thao tác liên quan">
            {tk.NhatKy.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thao tác nào" /> : (
              <Timeline items={tk.NhatKy.map((n) => ({
                key: n.MaNK,
                color: TEN_HANH_DONG[n.HanhDong]?.mau ?? 'gray',
                content: (
                  <div>
                    <Typography.Text strong>{TEN_HANH_DONG[n.HanhDong]?.ten ?? n.HanhDong}</Typography.Text>{' '}
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {ngay(n.ThoiGian, 'HH:mm DD/MM/YYYY')} · bởi {n.MaTK === tk.MaTK ? 'chính tài khoản này' : n.NguoiThucHien ?? 'hệ thống'}
                    </Typography.Text>
                    {n.ChiTiet && <div style={{ fontSize: 13 }}>{n.ChiTiet}</div>}
                  </div>
                ),
              }))} />
            )}
          </Card>
        </Flex>
      )}
    </Drawer>
  )
}
