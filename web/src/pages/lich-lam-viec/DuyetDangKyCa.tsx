import { CheckOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  Alert, App, AutoComplete, Badge, Button, Card, Descriptions, Flex, Form, InputNumber, Modal, Select, Space, Tabs, Tag,
  Tooltip, Typography, type TableProps,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { api, LoiApi, type DangKyCa, type PhongKham } from '@/lib/api'
import BangThichUng from '@/components/BangThichUng'
import { CA_LAM, quyTac, soKhungGio, SU_KIEN_SO_DANG_KY_CA, thuNgay, TRANG_THAI_DANG_KY_CA } from '@/lib/hangSo'

const LY_DO_TU_CHOI = ['Đủ bác sĩ trong ca', 'Không còn phòng trống', 'Trùng lịch công tác của bác sĩ']

/** UC4.4: quản trị viên duyệt (xếp phòng, sinh khung giờ) hoặc từ chối đăng ký ca của bác sĩ. */
export default function DuyetDangKyCa() {
  const { message } = App.useApp()
  const [tab, setTab] = useState('cho')
  const [dsCho, setDsCho] = useState<DangKyCa[]>([])
  const [dsDaXuLy, setDsDaXuLy] = useState<DangKyCa[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [dkDuyet, setDkDuyet] = useState<DangKyCa | null>(null)
  const [dkTuChoi, setDkTuChoi] = useState<DangKyCa | null>(null)
  const [dsPhong, setDsPhong] = useState<PhongKham[]>([])
  const [dangGui, setDangGui] = useState(false)
  const [formDuyet] = Form.useForm<{ ma_phong: number; thoi_luong: number }>()
  const [formTuChoi] = Form.useForm<{ ly_do: string }>()
  const thoiLuong = Form.useWatch('thoi_luong', formDuyet)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      const [cho, xong] = await Promise.all([
        api.dsDangKyCa({ trang_thai: ['CHO_DUYET'] }),
        api.dsDangKyCa({ trang_thai: ['DA_DUYET', 'TU_CHOI', 'DA_HUY'] }),
      ])
      setDsCho(cho)
      setDsDaXuLy(xong)
      // Badge menu chỉ đếm đăng ký còn duyệt được (ngày chưa qua), khớp soDangKyChoDuyet ở backend
      const homNay = dayjs().format('YYYY-MM-DD')
      window.dispatchEvent(new CustomEvent(SU_KIEN_SO_DANG_KY_CA, { detail: cho.filter((d) => d.NgayLam >= homNay).length }))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được đăng ký ca')
    } finally {
      setDangTai(false)
    }
  }, [message])

  useEffect(() => { tai() }, [tai])

  const moDuyet = async (dk: DangKyCa) => {
    formDuyet.resetFields()
    formDuyet.setFieldsValue({ thoi_luong: 15 })
    setDsPhong([])
    setDkDuyet(dk)
    try {
      const ds = await api.phongChoBacSi({ ma_bs: dk.MaBS, ngay: dk.NgayLam, ca_lam: dk.CaLam })
      setDsPhong(ds)
      const trong = ds.find((p) => !p.BacSiDangDung)
      if (trong) formDuyet.setFieldValue('ma_phong', trong.MaPhong)
    } catch { /* để trống, người duyệt chọn tay */ }
  }

  const chay = async (viec: () => Promise<unknown>, thanhCong: string) => {
    setDangGui(true)
    try {
      await viec()
      message.success(thanhCong)
      return true
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Thao tác thất bại')
      return false
    } finally {
      setDangGui(false)
      tai()
    }
  }

  const daQua = (dk: DangKyCa) => dayjs(dk.NgayLam).isBefore(dayjs(), 'day')

  const cot = (cho: boolean): TableProps<DangKyCa>['columns'] => [
    {
      title: 'Bác sĩ', key: 'bs',
      render: (_, dk) => (
        <div>
          <Typography.Text strong>{dk.BacSi}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{dk.TenCK}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Ca đăng ký', key: 'ca',
      render: (_, dk) => (
        <Space size={4} wrap>
          <span>{CA_LAM[dk.CaLam].ten} · {thuNgay(dk.NgayLam)}</span>
          {cho && daQua(dk) && <Tag>Đã qua ngày</Tag>}
          {cho && dk.DaCoCa > 0 && <Tag color="orange">Đã có ca này</Tag>}
        </Space>
      ),
    },
    { title: 'Ghi chú', dataIndex: 'GhiChu', render: (g) => g ?? '—' },
    ...(cho ? [
      { title: 'Gửi lúc', dataIndex: 'NgayTao', responsive: ['md' as const], render: (t: string) => dayjs(t).format('HH:mm DD/MM') },
      {
        title: 'Thao tác', key: 'tac', fixed: 'right' as const,
        render: (_: unknown, dk: DangKyCa) => (
          <Space>
            <Tooltip title={daQua(dk) ? 'Ngày đăng ký đã qua' : dk.DaCoCa > 0 ? 'Bác sĩ đã được xếp ca này' : undefined}>
              <Button size="small" type="primary" icon={<CheckOutlined />} disabled={daQua(dk) || dk.DaCoCa > 0}
                onClick={() => moDuyet(dk)}>Duyệt</Button>
            </Tooltip>
            <Button size="small" danger onClick={() => { formTuChoi.resetFields(); setDkTuChoi(dk) }}>Từ chối</Button>
          </Space>
        ),
      },
    ] : [
      {
        title: 'Kết quả', key: 'kq',
        render: (_: unknown, dk: DangKyCa) => (
          <div>
            <Tag color={TRANG_THAI_DANG_KY_CA[dk.TrangThai].mau}>{TRANG_THAI_DANG_KY_CA[dk.TrangThai].ten}</Tag>
            {dk.TrangThai === 'DA_DUYET' && dk.MaSoPhong && <span>Phòng {dk.MaSoPhong}</span>}
            {dk.TrangThai === 'TU_CHOI' && <Typography.Text type="secondary"> {dk.LyDoTuChoi}</Typography.Text>}
          </div>
        ),
      },
      {
        title: 'Người duyệt', key: 'nd', responsive: ['md' as const],
        render: (_: unknown, dk: DangKyCa) => dk.NguoiDuyet
          ? <>{dk.NguoiDuyet}<div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {dk.NgayDuyet && dayjs(dk.NgayDuyet).format('HH:mm DD/MM/YYYY')}</Typography.Text></div></>
          : '—',
      },
    ]),
  ]

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Duyệt đăng ký ca</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={tai} loading={dangTai}>Làm mới</Button>
      </Flex>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'cho', label: <Badge count={dsCho.length} offset={[10, -2]} size="small">Chờ duyệt</Badge>,
          children: (
            <BangThichUng soCotTieuDe={2} rowKey="MaDK" columns={cot(true)} dataSource={dsCho} loading={dangTai}
              size="middle" pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
              locale={{ emptyText: 'Không có đăng ký nào chờ duyệt' }} />
          ),
        },
        {
          key: 'xong', label: 'Đã xử lý',
          children: (
            <BangThichUng soCotTieuDe={2} rowKey="MaDK" columns={cot(false)} dataSource={dsDaXuLy} loading={dangTai}
              size="middle" pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
              locale={{ emptyText: 'Chưa có đăng ký nào' }} />
          ),
        },
      ]} />

      <Modal title="Duyệt đăng ký ca" open={!!dkDuyet} onCancel={() => setDkDuyet(null)} okText="Duyệt và tạo ca"
        cancelText="Đóng" okButtonProps={{ loading: dangGui }} onOk={() => formDuyet.submit()}>
        {dkDuyet && (
          <Descriptions size="small" column={1} style={{ marginBottom: 12 }} items={[
            { key: 'bs', label: 'Bác sĩ', children: <b>{dkDuyet.BacSi}</b> },
            { key: 'ca', label: 'Ca', children: `${CA_LAM[dkDuyet.CaLam].ten} (${CA_LAM[dkDuyet.CaLam].batDau}–${CA_LAM[dkDuyet.CaLam].ketThuc}) · ${thuNgay(dkDuyet.NgayLam)}` },
            ...(dkDuyet.GhiChu ? [{ key: 'gc', label: 'Ghi chú', children: dkDuyet.GhiChu }] : []),
          ]} />
        )}
        {dkDuyet && dsPhong.length > 0 && dsPhong.every((p) => p.BacSiDangDung) && (
          <Alert type="warning" showIcon style={{ marginBottom: 12 }} title="Mọi phòng của chuyên khoa đã kín trong ca này" />
        )}
        <Form form={formDuyet} layout="vertical" requiredMark={false} onFinish={async (v) => {
          if (await chay(() => api.duyetDangKyCa(dkDuyet!.MaDK, v), `Đã duyệt ca của ${dkDuyet!.BacSi}`)) setDkDuyet(null)
        }}>
          <Form.Item name="ma_phong" label="Phòng khám" rules={[{ required: true, message: 'Chọn phòng' }]}>
            <Select placeholder="Chọn phòng" options={dsPhong.map((p) => ({
              value: p.MaPhong, disabled: !!p.BacSiDangDung,
              label: `${p.MaSoPhong} – ${p.TenPhong}${p.BacSiDangDung ? ` (đã xếp cho ${p.BacSiDangDung})` : ''}`,
            }))} />
          </Form.Item>
          <Form.Item name="thoi_luong" label="Thời lượng mỗi khung giờ" rules={[{ required: true, message: 'Nhập thời lượng' }, quyTac.thoiLuongKhung]}
            extra={dkDuyet && thoiLuong ? `${soKhungGio(dkDuyet.CaLam, thoiLuong)} khung giờ` : undefined}>
            <InputNumber min={5} max={60} step={5} suffix="phút" style={{ width: 140 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Từ chối đăng ký ca" open={!!dkTuChoi} onCancel={() => setDkTuChoi(null)} okText="Từ chối"
        cancelText="Đóng" okButtonProps={{ danger: true, loading: dangGui }} onOk={() => formTuChoi.submit()}>
        {dkTuChoi && (
          <Typography.Paragraph>
            {dkTuChoi.BacSi} · {CA_LAM[dkTuChoi.CaLam].ten} {thuNgay(dkTuChoi.NgayLam)}. Bác sĩ sẽ nhận được lý do.
          </Typography.Paragraph>
        )}
        <Form form={formTuChoi} layout="vertical" onFinish={async (v) => {
          if (await chay(() => api.tuChoiDangKyCa(dkTuChoi!.MaDK, v.ly_do.trim()), 'Đã từ chối đăng ký')) setDkTuChoi(null)
        }}>
          <Form.Item name="ly_do" label="Lý do" rules={[{ required: true, whitespace: true, message: 'Nhập lý do' }, { max: 255 }]}>
            <AutoComplete options={LY_DO_TU_CHOI.map((l) => ({ value: l }))} placeholder="Chọn hoặc nhập lý do" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
