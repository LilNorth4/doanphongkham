import { CameraOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Avatar, Button, Flex, Form, Input, Modal, Space, Typography, Upload, type TableProps } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import BangThichUng from '@/components/BangThichUng'
import { anhChuyenKhoa } from '@/lib/anh'
import { api, type ChuyenKhoaQuanLy } from '@/lib/api'
import { quyTac, tien } from '@/lib/hangSo'
import { CongTacTrangThai, ONhapTien, TagTrangThai, thongBaoLoi } from './chung'

interface GiaTri { ten_ck: string; mo_ta?: string; phi_kham: number }

/** UC3.1: chuyên khoa. Thêm chuyên khoa thì hệ thống tạo kèm dịch vụ khám cùng giá. */
export default function ChuyenKhoaTab() {
  const { message } = App.useApp()
  const [ds, setDs] = useState<ChuyenKhoaQuanLy[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [sua, setSua] = useState<ChuyenKhoaQuanLy | 'moi' | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const [form] = Form.useForm<GiaTri>()

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      setDs(await api.qlChuyenKhoa())
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangTai(false)
    }
  }, [message])
  useEffect(() => { tai() }, [tai])

  const mo = (ck: ChuyenKhoaQuanLy | 'moi') => {
    setSua(ck)
    form.setFieldsValue(ck === 'moi' ? { ten_ck: '', mo_ta: '', phi_kham: 150000 }
      : { ten_ck: ck.TenCK, mo_ta: ck.MoTa ?? '', phi_kham: Number(ck.PhiKhamCoBan) })
  }

  const luu = async (v: GiaTri) => {
    setDangLuu(true)
    try {
      const b = { ten_ck: v.ten_ck, mo_ta: v.mo_ta || null, phi_kham: v.phi_kham }
      if (sua === 'moi') await api.themChuyenKhoa(b)
      else if (sua) await api.suaChuyenKhoa(sua.MaCK, b)
      message.success(sua === 'moi' ? 'Đã thêm chuyên khoa và dịch vụ khám' : 'Đã lưu chuyên khoa')
      setSua(null)
      tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangLuu(false)
    }
  }

  const doiAnh = async (ck: ChuyenKhoaQuanLy, tep: File) => {
    try {
      await api.doiAnhChuyenKhoa(ck.MaCK, tep)
      message.success('Đã đổi ảnh chuyên khoa')
      tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }

  const cot: TableProps<ChuyenKhoaQuanLy>['columns'] = [
    {
      title: 'Chuyên khoa', key: 'ten',
      render: (_, c) => (
        <Flex gap={12} align="center">
          <Upload accept="image/png,image/jpeg,image/webp" showUploadList={false}
            beforeUpload={(tep) => { doiAnh(c, tep); return false }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} title="Đổi ảnh">
              <Avatar shape="square" size={48} src={anhChuyenKhoa(c.MaCK, c.AnhDaiDien)} />
              <CameraOutlined style={{ position: 'absolute', right: -4, bottom: -4, background: '#fff', borderRadius: 8, padding: 2, fontSize: 12 }} />
            </div>
          </Upload>
          <div>
            <Typography.Text strong>{c.TenCK}</Typography.Text>
            {c.MoTa && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{c.MoTa}</Typography.Text></div>}
          </div>
        </Flex>
      ),
    },
    { title: 'Phí khám', dataIndex: 'PhiKhamCoBan', render: (p) => tien(p), width: 120 },
    { title: 'Bác sĩ', dataIndex: 'SoBacSi', width: 80 },
    { title: 'Phòng', dataIndex: 'SoPhong', width: 80 },
    { title: 'Trạng thái', dataIndex: 'TrangThai', render: (t) => <TagTrangThai tt={t} />, width: 110 },
    {
      title: '', key: 'thao_tac', width: 110, align: 'right',
      render: (_, c) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => mo(c)} aria-label="Sửa" />
          <CongTacTrangThai loai="chuyen-khoa" ma={c.MaCK} tt={c.TrangThai} ten={`chuyên khoa ${c.TenCK}`} onXong={tai} />
        </Space>
      ),
    },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">Ngừng chuyên khoa thì bệnh nhân không đặt lịch được (BR07)</Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => mo('moi')}>Thêm chuyên khoa</Button>
      </Flex>
      <BangThichUng rowKey="MaCK" columns={cot} dataSource={ds} loading={dangTai} pagination={false} />

      <Modal title={sua === 'moi' ? 'Thêm chuyên khoa' : 'Sửa chuyên khoa'} open={!!sua} onCancel={() => setSua(null)}
        okText="Lưu" cancelText="Đóng" confirmLoading={dangLuu} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={luu}>
          <Form.Item name="ten_ck" label="Tên chuyên khoa" rules={[quyTac.batBuoc('tên chuyên khoa')]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="mo_ta" label="Mô tả"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
          <Form.Item name="phi_kham" label="Phí khám cơ bản" rules={[{ required: true, message: 'Nhập phí khám' }]}
            extra="Giá của dịch vụ khám chuyên khoa, cập nhật theo">
            <ONhapTien step={10000} style={{ width: 220 }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
