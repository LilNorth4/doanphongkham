import { EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { App, Button, Col, Flex, Form, Input, Modal, Row, Space, Typography, type TableProps } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import BangThichUng from '@/components/BangThichUng'
import { api, type ThuocQuanLy } from '@/lib/api'
import { quyTac, tien } from '@/lib/hangSo'
import { CongTacTrangThai, ONhapTien, so, TagTrangThai, thongBaoLoi } from './chung'

interface GiaTri {
  ten_thuoc: string; hoat_chat?: string; ham_luong?: string; don_vi_tinh: string; don_gia: number; gia_bhyt?: number | null
}

/** UC3.4: danh mục thuốc bác sĩ chọn khi kê đơn; sửa giá chỉ áp dụng cho đơn kê sau. */
export default function ThuocTab() {
  const { message } = App.useApp()
  const [ds, setDs] = useState<ThuocQuanLy[]>([])
  const [tuKhoa, setTuKhoa] = useState('')
  const [dangTai, setDangTai] = useState(false)
  const [sua, setSua] = useState<ThuocQuanLy | 'moi' | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const [form] = Form.useForm<GiaTri>()
  const donGia = Form.useWatch('don_gia', form)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      setDs(await api.qlThuoc())
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangTai(false)
    }
  }, [message])
  useEffect(() => { tai() }, [tai])

  const hienThi = useMemo(() => {
    const k = tuKhoa.trim().toLowerCase()
    return k ? ds.filter((t) => `${t.TenThuoc} ${t.HoatChat ?? ''}`.toLowerCase().includes(k)) : ds
  }, [ds, tuKhoa])

  const mo = (t: ThuocQuanLy | 'moi') => {
    setSua(t)
    form.setFieldsValue(t === 'moi'
      ? { ten_thuoc: '', hoat_chat: '', ham_luong: '', don_vi_tinh: 'Viên', don_gia: 0, gia_bhyt: null }
      : { ten_thuoc: t.TenThuoc, hoat_chat: t.HoatChat ?? '', ham_luong: t.HamLuong ?? '', don_vi_tinh: t.DonViTinh,
          don_gia: Number(t.DonGia), gia_bhyt: so(t.GiaBHYT) })
  }

  const luu = async (v: GiaTri) => {
    setDangLuu(true)
    try {
      const b = { ...v, hoat_chat: v.hoat_chat || null, ham_luong: v.ham_luong || null, gia_bhyt: v.gia_bhyt ?? null }
      if (sua === 'moi') await api.themThuoc(b)
      else if (sua) await api.suaThuoc(sua.MaThuoc, b)
      message.success('Đã lưu thuốc')
      setSua(null)
      tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangLuu(false)
    }
  }

  const cot: TableProps<ThuocQuanLy>['columns'] = [
    {
      title: 'Thuốc', key: 'ten',
      render: (_, t) => (
        <div>
          <Typography.Text strong>{t.TenThuoc}</Typography.Text> {t.HamLuong}
          {t.HoatChat && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.HoatChat}</Typography.Text></div>}
        </div>
      ),
    },
    { title: 'Đơn vị', dataIndex: 'DonViTinh', width: 90 },
    { title: 'Đơn giá', dataIndex: 'DonGia', render: (g) => tien(g), width: 120 },
    { title: 'Giá BHYT', dataIndex: 'GiaBHYT', render: (g) => (g == null ? 'Ngoài BHYT' : tien(g)), width: 120 },
    { title: 'Trạng thái', dataIndex: 'TrangThai', render: (t) => <TagTrangThai tt={t} />, width: 110 },
    {
      title: '', key: 'thao_tac', width: 110, align: 'right',
      render: (_, t) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => mo(t)} aria-label="Sửa" />
          <CongTacTrangThai loai="thuoc" ma={t.MaThuoc} tt={t.TrangThai} ten={`thuốc ${t.TenThuoc}`} onXong={tai} />
        </Space>
      ),
    },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
        <Input allowClear prefix={<SearchOutlined />} placeholder="Tên thuốc, hoạt chất" style={{ width: 260 }}
          value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => mo('moi')}>Thêm thuốc</Button>
      </Flex>
      <BangThichUng rowKey="MaThuoc" columns={cot} dataSource={hienThi} loading={dangTai} pagination={{ pageSize: 15 }} />

      <Modal title={sua === 'moi' ? 'Thêm thuốc' : 'Sửa thuốc'} open={!!sua} onCancel={() => setSua(null)}
        okText="Lưu" cancelText="Đóng" confirmLoading={dangLuu} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={luu}>
          <Row gutter={12}>
            <Col xs={24} md={14}><Form.Item name="ten_thuoc" label="Tên thuốc" rules={[quyTac.batBuoc('tên thuốc')]}><Input maxLength={150} /></Form.Item></Col>
            <Col xs={12} md={5}><Form.Item name="ham_luong" label="Hàm lượng"><Input maxLength={50} placeholder="500mg" /></Form.Item></Col>
            <Col xs={12} md={5}><Form.Item name="don_vi_tinh" label="Đơn vị" rules={[quyTac.batBuoc('đơn vị')]}><Input maxLength={20} /></Form.Item></Col>
          </Row>
          <Form.Item name="hoat_chat" label="Hoạt chất"><Input maxLength={150} /></Form.Item>
          <Row gutter={12}>
            <Col xs={12}><Form.Item name="don_gia" label="Đơn giá" rules={[{ required: true, message: 'Nhập đơn giá' }]}><ONhapTien step={500} /></Form.Item></Col>
            <Col xs={12}>
              <Form.Item name="gia_bhyt" label="Giá BHYT" extra="Để trống nếu ngoài danh mục BHYT"
                rules={[{ validator: (_, v) => v == null || v <= (donGia ?? 0) ? Promise.resolve()
                  : Promise.reject(new Error('Không vượt đơn giá')) }]}>
                <ONhapTien step={500} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  )
}
