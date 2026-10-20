import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { App, Button, Card, Col, DatePicker, Flex, Form, Input, Radio, Row, Space, Tag, Typography, type TableProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, LoiApi, type CaLam, type DangKyCa } from '@/lib/api'
import BangThichUng from '@/components/BangThichUng'
import { CA_LAM, DS_CA_LAM, thuNgay, TRANG_THAI_DANG_KY_CA } from '@/lib/hangSo'

/** UC4.2: bác sĩ đăng ký thêm ca làm việc, theo dõi kết quả duyệt và rút đăng ký chưa duyệt. */
export default function DangKyCa() {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm<{ ngay: Dayjs; ca_lam: CaLam; ghi_chu?: string }>()
  const [ds, setDs] = useState<DangKyCa[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [dangGui, setDangGui] = useState(false)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      setDs(await api.dangKyCaCuaToi())
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được đăng ký ca')
    } finally {
      setDangTai(false)
    }
  }, [message])

  useEffect(() => { tai() }, [tai])

  const gui = async (v: { ngay: Dayjs; ca_lam: CaLam; ghi_chu?: string }) => {
    setDangGui(true)
    try {
      await api.dangKyCa({ ngay: v.ngay.format('YYYY-MM-DD'), ca_lam: v.ca_lam, ghi_chu: v.ghi_chu?.trim() || undefined })
      message.success('Đã gửi đăng ký, chờ quản trị viên duyệt')
      form.resetFields(['ngay', 'ghi_chu'])
      tai()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không gửi được đăng ký')
    } finally {
      setDangGui(false)
    }
  }

  const rut = (dk: DangKyCa) => modal.confirm({
    title: 'Rút đăng ký ca?', content: `${CA_LAM[dk.CaLam].ten} ${thuNgay(dk.NgayLam)}`, okText: 'Rút đăng ký',
    cancelText: 'Đóng', okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await api.huyDangKyCa(dk.MaDK)
        message.success('Đã rút đăng ký')
      } catch (e) {
        message.error(e instanceof LoiApi ? e.message : 'Không rút được đăng ký')
      } finally {
        tai()
      }
    },
  })

  const cot: TableProps<DangKyCa>['columns'] = [
    {
      title: 'Ca', key: 'ca',
      render: (_, dk) => (
        <div>
          <Typography.Text strong>{CA_LAM[dk.CaLam].ten}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{thuNgay(dk.NgayLam)}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Trạng thái', key: 'tt',
      render: (_, dk) => <Tag color={TRANG_THAI_DANG_KY_CA[dk.TrangThai].mau}>{TRANG_THAI_DANG_KY_CA[dk.TrangThai].ten}</Tag>,
    },
    {
      title: 'Kết quả', key: 'kq',
      render: (_, dk) => dk.TrangThai === 'DA_DUYET' ? (dk.MaSoPhong ? `Phòng ${dk.MaSoPhong} – ${dk.TenPhong}` : 'Đã duyệt')
        : dk.TrangThai === 'TU_CHOI' ? <Typography.Text type="danger">{dk.LyDoTuChoi}</Typography.Text>
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
    { title: 'Ghi chú', dataIndex: 'GhiChu', responsive: ['md'], render: (g) => g ?? '—' },
    { title: 'Gửi lúc', dataIndex: 'NgayTao', responsive: ['lg'], render: (t) => dayjs(t).format('HH:mm DD/MM/YYYY') },
    {
      title: 'Thao tác', key: 'tac', fixed: 'right',
      render: (_, dk) => dk.TrangThai === 'CHO_DUYET' ? <Button size="small" danger onClick={() => rut(dk)}>Rút</Button>
        : dk.TrangThai === 'DA_DUYET' && dk.MaCa ? (
          <Button size="small" onClick={() => navigate(`/lich-lam-viec?ca=${dk.MaCa}`)}>Xem ca</Button>
        ) : null,
    },
  ]

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <Card title={<><PlusOutlined /> Đăng ký ca mới</>}>
          <Form form={form} layout="vertical" onFinish={gui} initialValues={{ ca_lam: 'SANG' }} requiredMark={false}>
            <Form.Item name="ngay" label="Ngày làm" rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker format="dddd, DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày"
                disabledDate={(d) => !d.isAfter(dayjs(), 'day') || d.isAfter(dayjs().add(62, 'day')) || d.day() === 0} />
            </Form.Item>
            <Form.Item name="ca_lam" label="Ca">
              <Radio.Group block optionType="button" buttonStyle="solid" options={DS_CA_LAM.map((c) => ({
                value: c, label: `${c === 'SANG' ? 'Sáng' : 'Chiều'} ${CA_LAM[c].batDau}–${CA_LAM[c].ketThuc}`,
              }))} />
            </Form.Item>
            <Form.Item name="ghi_chu" label="Ghi chú" rules={[{ max: 255 }]}>
              <Input.TextArea rows={2} placeholder="VD: làm thay BS. ..., muốn xếp phòng P101" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={dangGui}>Gửi đăng ký</Button>
          </Form>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }}>
            Đăng ký từ ngày mai đến 62 ngày tới, thứ 2 đến thứ 7. Quản trị viên xếp phòng khi duyệt, bạn sẽ nhận thông báo.
          </Typography.Paragraph>
        </Card>
      </Col>
      <Col xs={24} lg={16}>
        <Card>
          <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>Đăng ký của tôi</Typography.Title>
            <Space>
              <Button onClick={() => navigate('/lich-lam-viec')}>Lịch làm việc</Button>
              <Button icon={<ReloadOutlined />} onClick={tai} loading={dangTai} aria-label="Làm mới" />
            </Space>
          </Flex>
          <BangThichUng rowKey="MaDK" columns={cot} dataSource={ds} loading={dangTai} size="middle"
            pagination={{ pageSize: 15, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Chưa có đăng ký ca nào' }} />
        </Card>
      </Col>
    </Row>
  )
}
