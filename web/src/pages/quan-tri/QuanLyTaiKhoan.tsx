import {
  DeleteOutlined, EyeOutlined, KeyOutlined, LockOutlined, MoreOutlined, PlusOutlined, SwapOutlined, UnlockOutlined,
} from '@ant-design/icons'
import {
  App, Button, Card, Col, DatePicker, Dropdown, Flex, Form, Input, InputNumber, Modal, Radio, Row, Select, Space,
  Tag, Tooltip, Typography, type FormInstance, type MenuProps, type TableProps,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import BangThichUng from '@/components/BangThichUng'
import { api, LoiApi, type ChuyenKhoa, type Phong, type TaiKhoan, type VaiTroNhanVien } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import ChiTietTaiKhoan from '@/pages/quan-tri/ChiTietTaiKhoan'
import {
  chuanHoaSdt, MAU_VAI_TRO, PHONG_CUA_VAI_TRO, quyTac, TEN_VAI_TRO, TRANG_THAI, VAI_TRO_NHAN_VIEN,
} from '@/lib/hangSo'

const VAI_TRO_BAC_SI: VaiTroNhanVien[] = ['BAC_SI', 'BS_XET_NGHIEM', 'BS_CDHA', 'BS_NOI_SOI']
const thongBaoLoi = (e: unknown) => (e instanceof LoiApi ? e.message : 'Có lỗi xảy ra')

/** Chuyên khoa (bác sĩ) hoặc phòng phụ trách (bác sĩ CLS) hiện theo vai trò đang chọn. */
function TruongChuyenMon({ form, ten, chuyenKhoa, phong }: {
  form: FormInstance; ten: string; chuyenKhoa: ChuyenKhoa[]; phong: Phong[]
}) {
  const vaiTro = Form.useWatch(ten, form) as VaiTroNhanVien | undefined
  if (vaiTro === 'BAC_SI') {
    return (
      <Form.Item name="ma_ck" label="Chuyên khoa" rules={[{ required: true, message: 'Chọn chuyên khoa' }]}>
        <Select placeholder="Chọn chuyên khoa" options={chuyenKhoa.map((c) => ({ value: c.MaCK, label: c.TenCK }))} />
      </Form.Item>
    )
  }
  const loaiPhong = vaiTro && PHONG_CUA_VAI_TRO[vaiTro]
  if (loaiPhong) {
    return (
      <Form.Item name="ma_phong_phu_trach" label="Phòng phụ trách"
        rules={[{ required: true, message: 'Chọn phòng phụ trách' }]}>
        <Select placeholder="Chọn phòng" options={phong.filter((p) => loaiPhong.includes(p.LoaiPhong))
          .map((p) => ({ value: p.MaPhong, label: `${p.MaSoPhong} – ${p.TenPhong}` }))} />
      </Form.Item>
    )
  }
  return null
}

interface NhanVienForm {
  ho_ten: string
  email: string
  sdt: string
  loai_nhan_vien: VaiTroNhanVien
  ngay_sinh?: Dayjs
  gioi_tinh?: 'NAM' | 'NU'
  ma_ck?: number
  ma_phong_phu_trach?: number
  hoc_ham_hoc_vi?: string
  so_nam_kinh_nghiem?: number
}

/** Gói 2: danh sách tài khoản, tạo tài khoản nhân viên, khóa/mở khóa, cấp lại mật khẩu, đổi vai trò. */
export default function QuanLyTaiKhoan() {
  const { modal, message } = App.useApp()
  const { nguoiDung } = usePhien()
  const [loc, setLoc] = useState<{ vai_tro?: string; trang_thai?: string; tu_khoa?: string }>({})
  const [ds, setDs] = useState<TaiKhoan[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [chuyenKhoa, setChuyenKhoa] = useState<ChuyenKhoa[]>([])
  const [phong, setPhong] = useState<Phong[]>([])

  const [moTao, setMoTao] = useState(false)
  const [formTao] = Form.useForm<NhanVienForm>()
  const [tkKhoa, setTkKhoa] = useState<TaiKhoan | null>(null)
  const [formKhoa] = Form.useForm<{ ly_do: string }>()
  const [tkVaiTro, setTkVaiTro] = useState<TaiKhoan | null>(null)
  const [formVaiTro] = Form.useForm<{ vai_tro: VaiTroNhanVien; ma_ck?: number; ma_phong_phu_trach?: number }>()
  const [dangLuu, setDangLuu] = useState(false)
  const [xemTk, setXemTk] = useState<number | null>(null)

  const taiDs = useCallback(async () => {
    setDangTai(true)
    try {
      setDs(await api.dsTaiKhoan(loc))
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangTai(false)
    }
  }, [loc, message])

  useEffect(() => { taiDs() }, [taiDs])
  useEffect(() => {
    api.dsChuyenKhoa().then(setChuyenKhoa).catch(() => {})
    api.dsPhong().then(setPhong).catch(() => {})
  }, [])

  const hienMatKhauTam = (tieuDe: string, matKhau: string, email: string | null) => modal.success({
    title: tieuDe,
    content: (
      <>
        <p>Mật khẩu tạm thời đã được gửi tới <b>{email}</b>. Người dùng phải đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
        <Typography.Text code copyable style={{ fontSize: 16 }}>{matKhau}</Typography.Text>
      </>
    ),
  })

  const luu = async (viec: () => Promise<void>) => {
    setDangLuu(true)
    try {
      await viec()
      await taiDs()
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangLuu(false)
    }
  }

  const taoNhanVien = (v: NhanVienForm) => luu(async () => {
    const kq = await api.taoNhanVien({
      ...v,
      ho_ten: v.ho_ten.trim(),
      email: v.email.trim().toLowerCase(),
      sdt: chuanHoaSdt(v.sdt),
      ngay_sinh: v.ngay_sinh?.format('YYYY-MM-DD'),
    })
    setMoTao(false)
    formTao.resetFields()
    hienMatKhauTam('Đã tạo tài khoản nhân viên', kq.mat_khau_tam, v.email)
  })

  const khoa = ({ ly_do }: { ly_do: string }) => luu(async () => {
    await api.khoaTaiKhoan(tkKhoa!.MaTK, ly_do.trim())
    message.success('Đã khóa tài khoản và đăng xuất khỏi mọi thiết bị')
    setTkKhoa(null)
  })

  const doiVaiTro = (v: { vai_tro: VaiTroNhanVien; ma_ck?: number; ma_phong_phu_trach?: number }) => luu(async () => {
    await api.ganVaiTro(tkVaiTro!.MaTK, v)
    message.success('Đã cập nhật vai trò')
    setTkVaiTro(null)
  })

  const chonThaoTac = (tk: TaiKhoan): MenuProps['onClick'] => ({ key }) => {
    if (key === 'chi-tiet') {
      setXemTk(tk.MaTK)
    } else if (key === 'khoa') {
      formKhoa.resetFields()
      setTkKhoa(tk)
    } else if (key === 'mo-khoa') {
      luu(async () => {
        await api.moKhoaTaiKhoan(tk.MaTK)
        message.success('Đã mở khóa tài khoản')
      })
    } else if (key === 'mat-khau') {
      modal.confirm({
        title: 'Cấp lại mật khẩu?',
        content: `${tk.HoTen} sẽ nhận mật khẩu tạm mới qua email và bị đăng xuất khỏi mọi thiết bị.`,
        okText: 'Cấp lại',
        onOk: () => luu(async () => {
          const { mat_khau_tam } = await api.capLaiMatKhau(tk.MaTK)
          hienMatKhauTam('Đã cấp lại mật khẩu', mat_khau_tam, tk.Email)
        }),
      })
    } else if (key === 'xoa') {
      modal.confirm({
        title: `Xóa tài khoản ${tk.HoTen ?? tk.Email}?`,
        content: (
          <>
            <p>Tài khoản và hồ sơ đi kèm sẽ bị xóa vĩnh viễn, không thể khôi phục.</p>
            <p>Tài khoản đã có lịch hẹn, hồ sơ bệnh án hoặc ca làm việc sẽ không xóa được, hãy dùng
              <b> Khóa tài khoản</b> để giữ lịch sử.</p>
          </>
        ),
        okText: 'Xóa',
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: () => luu(async () => {
          await api.xoaTaiKhoan(tk.MaTK)
          message.success('Đã xóa tài khoản')
        }),
      })
    } else if (key === 'vai-tro') {
      formVaiTro.setFieldsValue({ vai_tro: tk.VaiTro as VaiTroNhanVien, ma_ck: undefined, ma_phong_phu_trach: undefined })
      setTkVaiTro(tk)
    }
  }

  const cot: TableProps<TaiKhoan>['columns'] = [
    {
      title: 'Họ tên', dataIndex: 'HoTen',
      render: (ten, tk) => (
        <Space orientation="vertical" size={0}>
          <Space size={6}>
            <Button type="link" onClick={() => setXemTk(tk.MaTK)}
              style={{ padding: 0, height: 'auto', fontWeight: 600 }}>{ten ?? '—'}</Button>
            {tk.MaTK === nguoiDung?.MaTK && <Tag color="gold" style={{ marginInlineEnd: 0 }}>Bạn</Tag>}
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {tk.MaNV ? `Nhân viên #${tk.MaNV}` : tk.MaBN ? `Bệnh nhân #${tk.MaBN}` : ''}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Liên hệ', key: 'lien_he', responsive: ['md'],
      render: (_, tk) => (
        <Space orientation="vertical" size={0}>
          <span>{tk.Email ?? '—'}</span>
          <Typography.Text type="secondary">{tk.SDT}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Vai trò', dataIndex: 'VaiTro',
      render: (vt: TaiKhoan['VaiTro']) => <Tag color={MAU_VAI_TRO[vt]}>{TEN_VAI_TRO[vt]}</Tag>,
    },
    {
      title: 'Trạng thái', dataIndex: 'TrangThai',
      render: (tt: TaiKhoan['TrangThai'], tk) => {
        const tamKhoa = tk.KhoaDen && dayjs(tk.KhoaDen).isAfter(dayjs())
        return (
          <Space size={4} wrap>
            <Tooltip title={tk.LyDoKhoa}>
              <Tag color={TRANG_THAI[tt].mau}>{TRANG_THAI[tt].ten}</Tag>
            </Tooltip>
            {tamKhoa && <Tag color="warning">Tạm khóa đến {dayjs(tk.KhoaDen).format('HH:mm')}</Tag>}
          </Space>
        )
      },
    },
    {
      title: 'Đăng nhập gần nhất', dataIndex: 'LanDangNhapCuoi', responsive: ['lg'],
      render: (t: string | null) => (t ? dayjs(t).format('HH:mm DD/MM/YYYY') : 'Chưa đăng nhập'),
    },
    {
      key: 'thao_tac', width: 56, align: 'center',
      render: (_, tk) => {
        const laMinh = tk.MaTK === nguoiDung?.MaTK
        const biKhoa = tk.TrangThai === 'BI_KHOA' || (tk.KhoaDen && dayjs(tk.KhoaDen).isAfter(dayjs()))
        // Mục bị khóa thì ghi luôn lý do bên dưới để người dùng biết vì sao không bấm được
        const nhan = (ten: string, lyDo: string | null) => lyDo ? (
          <div style={{ lineHeight: 1.3 }}>
            {ten}
            <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{lyDo}</Typography.Text></div>
          </div>
        ) : ten
        const tuThaoTac = laMinh ? 'Không thực hiện được với chính tài khoản của bạn' : null
        const lyDoMatKhau = tk.TrangThai === 'BI_KHOA' ? 'Mở khóa tài khoản trước'
          : !tk.Email ? 'Tài khoản chưa có email để nhận mật khẩu' : null
        const items: MenuProps['items'] = [
          { key: 'chi-tiet', icon: <EyeOutlined />, label: tk.MaNV ? 'Xem chi tiết / sửa' : 'Xem chi tiết' },
          { type: 'divider' },
          biKhoa
            ? { key: 'mo-khoa', icon: <UnlockOutlined />, label: 'Mở khóa' }
            : { key: 'khoa', icon: <LockOutlined />, label: nhan('Khóa tài khoản', tuThaoTac), danger: true, disabled: laMinh },
          { key: 'mat-khau', icon: <KeyOutlined />, label: nhan('Cấp lại mật khẩu', lyDoMatKhau), disabled: !!lyDoMatKhau },
          ...(tk.MaNV ? [{ key: 'vai-tro', icon: <SwapOutlined />, label: nhan('Đổi vai trò', tuThaoTac), disabled: laMinh }] : []),
          { type: 'divider' },
          { key: 'xoa', icon: <DeleteOutlined />, label: nhan('Xóa tài khoản', tuThaoTac), danger: true, disabled: laMinh },
        ]
        return (
          <Dropdown menu={{ items, onClick: chonThaoTac(tk) }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác" />
          </Dropdown>
        )
      },
    },
  ]

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Quản lý tài khoản</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setMoTao(true)}>Thêm nhân viên</Button>
      </Flex>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={10}>
          <Input.Search allowClear placeholder="Tìm theo tên, email, số điện thoại"
            onSearch={(tu_khoa) => setLoc((l) => ({ ...l, tu_khoa: tu_khoa.trim() || undefined }))} />
        </Col>
        <Col xs={12} md={7}>
          <Select allowClear placeholder="Vai trò" style={{ width: '100%' }}
            options={Object.entries(TEN_VAI_TRO).map(([value, label]) => ({ value, label }))}
            onChange={(vai_tro) => setLoc((l) => ({ ...l, vai_tro }))} />
        </Col>
        <Col xs={12} md={7}>
          <Select allowClear placeholder="Trạng thái" style={{ width: '100%' }}
            options={Object.entries(TRANG_THAI).map(([value, t]) => ({ value, label: t.ten }))}
            onChange={(trang_thai) => setLoc((l) => ({ ...l, trang_thai }))} />
        </Col>
      </Row>

      <BangThichUng thaoTacTrenDau rowKey="MaTK" columns={cot} dataSource={ds} loading={dangTai} size="middle"
        pagination={{ pageSize: 10, showTotal: (n) => `${n} tài khoản` }} scroll={{ x: 'max-content' }} />

      {/* Tạo tài khoản nhân viên (UC2.2) */}
      <Modal title="Thêm tài khoản nhân viên" open={moTao} onCancel={() => setMoTao(false)} width={640}
        okText="Tạo tài khoản" confirmLoading={dangLuu} onOk={() => formTao.submit()} destroyOnHidden>
        <Typography.Paragraph type="secondary">
          Hệ thống tạo mật khẩu tạm thời và gửi tới email nhân viên; nhân viên phải đổi mật khẩu khi đăng nhập lần đầu.
        </Typography.Paragraph>
        <Form form={formTao} layout="vertical" onFinish={taoNhanVien} preserve={false}
          initialValues={{ loai_nhan_vien: 'LE_TAN' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="ho_ten" label="Họ tên" rules={[quyTac.batBuoc('họ tên'), { max: 100 }]}>
                <Input placeholder="BS. Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="loai_nhan_vien" label="Vai trò" rules={[{ required: true }]}>
                <Select options={VAI_TRO_NHAN_VIEN.map((v) => ({ value: v, label: TEN_VAI_TRO[v] }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label="Email" rules={[quyTac.batBuoc('email'), quyTac.email]}>
                <Input placeholder="ten@vietbac.vn" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="sdt" label="Số điện thoại" rules={[quyTac.batBuoc('số điện thoại'), quyTac.sdt]}>
                <Input placeholder="0901000000" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="ngay_sinh" label="Ngày sinh">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs())} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="gioi_tinh" label="Giới tính">
                <Radio.Group options={[{ label: 'Nam', value: 'NAM' }, { label: 'Nữ', value: 'NU' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <TruongChuyenMon form={formTao} ten="loai_nhan_vien" chuyenKhoa={chuyenKhoa} phong={phong} />
            </Col>
            <Form.Item noStyle dependencies={['loai_nhan_vien']}>
              {({ getFieldValue }) => VAI_TRO_BAC_SI.includes(getFieldValue('loai_nhan_vien')) && (
                <>
                  <Col xs={12} sm={6}>
                    <Form.Item name="hoc_ham_hoc_vi" label="Học hàm/vị">
                      <Input placeholder="ThS.BS" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item name="so_nam_kinh_nghiem" label="Năm KN">
                      <InputNumber min={0} max={60} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </>
              )}
            </Form.Item>
          </Row>
        </Form>
      </Modal>

      {/* Khóa tài khoản */}
      <Modal title={`Khóa tài khoản: ${tkKhoa?.HoTen ?? ''}`} open={!!tkKhoa} onCancel={() => setTkKhoa(null)}
        okText="Khóa" okButtonProps={{ danger: true }} confirmLoading={dangLuu} onOk={() => formKhoa.submit()}>
        <Form form={formKhoa} layout="vertical" onFinish={khoa}>
          <Form.Item name="ly_do" label="Lý do khóa" rules={[quyTac.batBuoc('lý do'), { max: 255 }]}
            extra="Lý do sẽ hiển thị cho người dùng khi đăng nhập.">
            <Input.TextArea rows={3} placeholder="vd: Nhân viên nghỉ việc" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Đổi vai trò (UC2.6) */}
      <Modal title={`Đổi vai trò: ${tkVaiTro?.HoTen ?? ''}`} open={!!tkVaiTro} onCancel={() => setTkVaiTro(null)}
        okText="Lưu" confirmLoading={dangLuu} onOk={() => formVaiTro.submit()}>
        <Form form={formVaiTro} layout="vertical" onFinish={doiVaiTro}>
          <Form.Item name="vai_tro" label="Vai trò mới" rules={[{ required: true }]}>
            <Select options={VAI_TRO_NHAN_VIEN.map((v) => ({ value: v, label: TEN_VAI_TRO[v] }))} />
          </Form.Item>
          <TruongChuyenMon form={formVaiTro} ten="vai_tro" chuyenKhoa={chuyenKhoa} phong={phong} />
        </Form>
      </Modal>

      <ChiTietTaiKhoan maTk={xemTk} onClose={() => setXemTk(null)} onDoi={taiDs} />
    </Card>
  )
}
