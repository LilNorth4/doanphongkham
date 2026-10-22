import { EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { App, Button, Flex, Form, Input, Modal, Space, Tag, type TableProps } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import BangThichUng from '@/components/BangThichUng'
import { api, type BenhIcd } from '@/lib/api'
import { quyTac } from '@/lib/hangSo'
import { CongTacTrangThai, TagTrangThai, thongBaoLoi } from './chung'

/** UC3.8: mã bệnh ICD-10 bác sĩ chọn khi chẩn đoán. Mã không đổi được, chỉ sửa tên hoặc ngừng. */
export default function IcdTab() {
  const { message } = App.useApp()
  const [ds, setDs] = useState<BenhIcd[]>([])
  const [tuKhoa, setTuKhoa] = useState('')
  const [dangTai, setDangTai] = useState(false)
  const [sua, setSua] = useState<BenhIcd | 'moi' | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const [form] = Form.useForm<{ ma_icd: string; ten_benh: string }>()

  const tai = useCallback(async (k?: string) => {
    setDangTai(true)
    try {
      setDs(await api.qlIcd(k))
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangTai(false)
    }
  }, [message])
  useEffect(() => { tai() }, [tai])

  const mo = (b: BenhIcd | 'moi') => {
    setSua(b)
    form.setFieldsValue(b === 'moi' ? { ma_icd: '', ten_benh: '' } : { ma_icd: b.MaICD, ten_benh: b.TenBenh })
  }

  const luu = async (v: { ma_icd: string; ten_benh: string }) => {
    setDangLuu(true)
    try {
      if (sua === 'moi') await api.themIcd(v.ma_icd.trim().toUpperCase(), v.ten_benh)
      else if (sua) await api.suaIcd(sua.MaICD, v.ten_benh)
      message.success('Đã lưu mã ICD')
      setSua(null)
      tai(tuKhoa || undefined)
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangLuu(false)
    }
  }

  const cot: TableProps<BenhIcd>['columns'] = [
    { title: 'Mã', dataIndex: 'MaICD', width: 100, render: (m) => <Tag color="blue">{m}</Tag> },
    { title: 'Tên bệnh', dataIndex: 'TenBenh' },
    { title: 'Trạng thái', dataIndex: 'TrangThai', render: (t) => <TagTrangThai tt={t} />, width: 110 },
    {
      title: '', key: 'thao_tac', width: 110, align: 'right',
      render: (_, b) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => mo(b)} aria-label="Sửa" />
          <CongTacTrangThai loai="icd" ma={b.MaICD} tt={b.TrangThai} ten={`mã ${b.MaICD}`} onXong={() => tai(tuKhoa || undefined)} />
        </Space>
      ),
    },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
        <Input.Search allowClear prefix={<SearchOutlined />} placeholder="Mã hoặc tên bệnh" style={{ width: 280 }}
          value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} onSearch={(k) => tai(k || undefined)} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => mo('moi')}>Thêm mã ICD</Button>
      </Flex>
      <BangThichUng rowKey="MaICD" columns={cot} dataSource={ds} loading={dangTai} pagination={{ pageSize: 20 }} />

      <Modal title={sua === 'moi' ? 'Thêm mã ICD-10' : 'Sửa mã ICD-10'} open={!!sua} onCancel={() => setSua(null)}
        okText="Lưu" cancelText="Đóng" confirmLoading={dangLuu} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={luu}>
          <Form.Item name="ma_icd" label="Mã ICD-10" rules={[quyTac.batBuoc('mã ICD'),
            { pattern: /^[A-Za-z]\d{2}(\.\d{1,2})?$/, message: '1 chữ cái, 2 chữ số, có thể thêm phần thập phân (VD J06.9)' }]}>
            <Input maxLength={10} disabled={sua !== 'moi'} style={{ width: 160 }} placeholder="J06.9" />
          </Form.Item>
          <Form.Item name="ten_benh" label="Tên bệnh" rules={[quyTac.batBuoc('tên bệnh')]}><Input maxLength={255} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}
