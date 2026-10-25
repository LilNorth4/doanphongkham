import { CheckOutlined, DollarOutlined, LeftOutlined, PlusOutlined, ReloadOutlined, RightOutlined, WalletOutlined } from '@ant-design/icons'
import {
  Alert, App, Badge, Button, Card, Col, DatePicker, Descriptions, Flex, Form, Input, Modal, Radio, Result, Row,
  Segmented, Select, Space, Tabs, Tag, Tooltip, Typography, type TableProps,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BangThichUng from '@/components/BangThichUng'
import { usePhien } from '@/lib/auth'
import { api, LoiApi, type BacSi, type LichHen, type TheBHYT, type TrangThaiLichHen } from '@/lib/api'
import { gioKham, SU_KIEN_SO_CHO, TEN_KENH, thuNgay, TRANG_THAI_LICH_HEN, tuoi } from '@/lib/hangSo'

const LY_DO_LE_TAN = ['Bác sĩ nghỉ đột xuất', 'Bệnh nhân yêu cầu hủy qua điện thoại', 'Thông tin đặt lịch không hợp lệ', 'Khác']

const NHOM_NGAY: { key: string; ten: string; trangThai?: TrangThaiLichHen[] }[] = [
  { key: 'tat-ca', ten: 'Tất cả' },
  { key: 'cho', ten: 'Chờ xác nhận', trangThai: ['CHO_XAC_NHAN'] },
  { key: 'sap-den', ten: 'Chờ đến', trangThai: ['DA_XAC_NHAN'] },
  { key: 'da-den', ten: 'Đã đến', trangThai: ['DA_CHECK_IN', 'DANG_KHAM', 'CHO_CLS', 'DA_CO_KET_QUA', 'HOAN_THANH'] },
  { key: 'huy', ten: 'Hủy / vắng', trangThai: ['DA_HUY', 'VANG_MAT'] },
]

type KetQuaCheckIn = {
  lh: LichHen; so_thu_tu: number; TrangThaiBHYT: LichHen['TrangThaiBHYT']; MucHuong: number | null; ly_do_bhyt: string | null
}

/**
 * UC7.1-7.5, UC7.9: lễ tân duyệt, từ chối, hủy thay, check-in, đánh dấu vắng mặt.
 * Không có quyền duyệt (quản trị viên giám sát với LICH_HEN.XEM) thì chỉ xem, ẩn mọi thao tác.
 */
export default function QuanLyLichHen() {
  const { message, modal } = App.useApp()
  const quyen = usePhien().nguoiDung?.Quyen ?? []
  const chiXem = !quyen.includes('LICH_HEN.DUYET')
  const thuTien = quyen.includes('THANH_TOAN.THU')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') === 'ngay' ? 'ngay' : 'cho')
  const [ngay, setNgay] = useState<Dayjs>(dayjs())
  const [nhom, setNhom] = useState('tat-ca')
  const [maBs, setMaBs] = useState<number>()
  const [tuKhoa, setTuKhoa] = useState('')
  const [dsCho, setDsCho] = useState<LichHen[]>([])
  const [dsNgay, setDsNgay] = useState<LichHen[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [dsBs, setDsBs] = useState<BacSi[]>([])
  const [chon, setChon] = useState<number[]>([])
  const [lhHuy, setLhHuy] = useState<LichHen | null>(null)
  const [formHuy] = Form.useForm<{ ly_do: string; khac?: string }>()
  const [lhCheckIn, setLhCheckIn] = useState<LichHen | null>(null)
  const [dsThe, setDsThe] = useState<TheBHYT[]>([])
  const [formCheckIn] = Form.useForm<{ chon_the: string; ma_the?: string }>()
  const [ketQua, setKetQua] = useState<KetQuaCheckIn | null>(null)
  const [dangGui, setDangGui] = useState(false)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      const loc = { ma_bs: maBs, tu_khoa: tuKhoa || undefined }
      const [cho, theoNgay] = await Promise.all([
        api.dsLichHen({ ...loc, trang_thai: ['CHO_XAC_NHAN'] }),
        api.dsLichHen({ ...loc, ngay: ngay.format('YYYY-MM-DD') }),
      ])
      setDsCho(cho)
      setDsNgay(theoNgay)
      window.dispatchEvent(new CustomEvent(SU_KIEN_SO_CHO, { detail: cho.length }))
      setChon((c) => c.filter((ma) => cho.some((l) => l.MaLK === ma)))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được lịch hẹn')
    } finally {
      setDangTai(false)
    }
  }, [ngay, maBs, tuKhoa, message])

  useEffect(() => { tai() }, [tai])
  useEffect(() => {
    const id = setInterval(tai, 30_000)
    return () => clearInterval(id)
  }, [tai])
  useEffect(() => { api.dsBacSi().then(setDsBs).catch(() => {}) }, [])

  const chay = async (viec: () => Promise<unknown>, thanhCong?: string) => {
    setDangGui(true)
    try {
      await viec()
      if (thanhCong) message.success(thanhCong)
      return true
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Thao tác thất bại')
      return false
    } finally {
      setDangGui(false)
      tai()
    }
  }

  const duyetNhieu = async () => {
    let ok = 0
    for (const ma of chon) {
      try {
        await api.duyetLich(ma)
        ok++
      } catch { /* lịch đã bị đổi trạng thái bởi người khác: bỏ qua, báo số lượng */ }
    }
    message.success(`Đã duyệt ${ok}/${chon.length} lịch hẹn`)
    setChon([])
    tai()
  }

  const moCheckIn = async (lh: LichHen) => {
    formCheckIn.resetFields()
    setDsThe([])
    setLhCheckIn(lh)
    try {
      const the = await api.theBhyt(lh.MaBN)
      setDsThe(the)
      if (the.length) formCheckIn.setFieldValue('chon_the', the[0].MaThe)
    } catch { /* không có thẻ */ }
  }

  const checkIn = async (v: { chon_the: string; ma_the?: string }) => {
    const lh = lhCheckIn!
    const maThe = v.chon_the === 'KHONG' ? undefined : v.chon_the === 'NHAP' ? v.ma_the?.trim() : v.chon_the
    setDangGui(true)
    try {
      const kq = await api.checkIn(lh.MaLK, maThe)
      setLhCheckIn(null)
      setKetQua({ lh, ...kq })
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Check-in thất bại')
    } finally {
      setDangGui(false)
      tai()
    }
  }

  const homNay = ngay.isSame(dayjs(), 'day')
  const thaoTac = (lh: LichHen) => {
    const hoTen = lh.BenhNhan
    if (lh.TrangThai === 'CHO_XAC_NHAN') {
      return (
        <Space>
          <Button size="small" type="primary" icon={<CheckOutlined />}
            onClick={() => chay(() => api.duyetLich(lh.MaLK), `Đã xác nhận lịch của ${hoTen}`)}>Duyệt</Button>
          <Button size="small" danger onClick={() => { formHuy.resetFields(); setLhHuy(lh) }}>Từ chối</Button>
        </Space>
      )
    }
    if (lh.TrangThai === 'DA_XAC_NHAN') {
      const laHomNay = dayjs(lh.NgayKham).isSame(dayjs(), 'day')
      const quaGio = gioKham(lh).isBefore(dayjs())
      return (
        <Space wrap>
          <Tooltip title={laHomNay ? undefined : 'Chỉ check-in vào ngày khám'}>
            <Button size="small" type="primary" disabled={!laHomNay} onClick={() => moCheckIn(lh)}>Check-in</Button>
          </Tooltip>
          {quaGio && (
            <Button size="small" onClick={() => modal.confirm({
              title: `Đánh dấu ${hoTen} vắng mặt?`, okText: 'Vắng mặt', cancelText: 'Đóng',
              onOk: () => chay(() => api.vangMat(lh.MaLK), 'Đã đánh dấu vắng mặt'),
            })}>Vắng mặt</Button>
          )}
          <Button size="small" danger onClick={() => { formHuy.resetFields(); setLhHuy(lh) }}>Hủy</Button>
        </Space>
      )
    }
    // Bệnh nhân quay lại quầy: thu ngay từ danh sách lịch hẹn, không phải tìm lại ở trang thu tiền
    if (thuTien && (lh.SoPhieuChoThu ?? 0) > 0) {
      return <Button size="small" type="primary" icon={<WalletOutlined />} onClick={() => navigate(`/le-tan/tam-thu?lk=${lh.MaLK}`)}>Thu tạm thu CLS</Button>
    }
    if (thuTien && lh.MaHDChuaThu) {
      return <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => navigate(`/le-tan/thanh-toan?hd=${lh.MaHDChuaThu}`)}>Thanh toán</Button>
    }
    return null
  }

  const cot = (coNgay: boolean): TableProps<LichHen>['columns'] => [
    {
      title: 'Giờ', key: 'gio', width: coNgay ? 130 : 80,
      render: (_, lh) => (
        <div>
          <Typography.Text strong>{lh.GioBatDau}</Typography.Text>
          {coNgay && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{thuNgay(lh.NgayKham)}</Typography.Text></div>}
        </div>
      ),
    },
    {
      title: 'Bệnh nhân', key: 'bn',
      render: (_, lh) => (
        <div>
          <Typography.Text strong>{lh.BenhNhan}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {[lh.GioiTinh === 'NAM' ? 'Nam' : lh.GioiTinh === 'NU' ? 'Nữ' : null,
              tuoi(lh.NgaySinh) != null ? `${tuoi(lh.NgaySinh)} tuổi` : null, lh.SDT].filter(Boolean).join(' · ')}
          </Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Bác sĩ', key: 'bs', responsive: ['lg'],
      render: (_, lh) => (
        <div>
          {lh.BacSi}
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{lh.TenCK} · {lh.MaSoPhong}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Lý do khám', key: 'ly_do', responsive: ['xl'], width: 200,
      render: (_, lh) => (
        <Typography.Paragraph ellipsis={{ rows: 2, tooltip: [lh.LyDoKham, lh.TrieuChungSoBo].filter(Boolean).join(' – ') }}
          style={{ margin: 0 }}>
          {lh.LyDoKham ?? <Typography.Text type="secondary">—</Typography.Text>}
          {lh.TrieuChungSoBo && <Typography.Text type="secondary"> · {lh.TrieuChungSoBo}</Typography.Text>}
        </Typography.Paragraph>
      ),
    },
    { title: 'Kênh', dataIndex: 'KenhDat', responsive: ['xxl'], render: (k: LichHen['KenhDat']) => TEN_KENH[k] },
    {
      title: 'Trạng thái', key: 'tt',
      render: (_, lh) => (
        <Space size={4} wrap>
          <Tooltip title={lh.TrangThai === 'DA_HUY' ? lh.LyDoHuy : undefined}>
            <Tag color={TRANG_THAI_LICH_HEN[lh.TrangThai].mau}>{TRANG_THAI_LICH_HEN[lh.TrangThai].ten}</Tag>
          </Tooltip>
          {lh.SoThuTu && <Tag>STT {lh.SoThuTu}</Tag>}
          {lh.TrangThaiBHYT === 'HOP_LE' && <Tag color="green">BHYT {lh.MucHuong}%</Tag>}
        </Space>
      ),
    },
    // Cột thao tác luôn nằm sát phải để không bị đẩy khỏi màn hình khi bảng rộng
    ...(chiXem ? [] : [{ title: 'Thao tác', key: 'tac', fixed: 'right' as const, render: (_: unknown, lh: LichHen) => thaoTac(lh) }]),
  ]

  const demNhom = useMemo(() => Object.fromEntries(NHOM_NGAY.map((n) => [
    n.key, n.trangThai ? dsNgay.filter((l) => n.trangThai!.includes(l.TrangThai)).length : dsNgay.length,
  ])), [dsNgay])
  const loc = NHOM_NGAY.find((n) => n.key === nhom)?.trangThai
  const dsHienThi = loc ? dsNgay.filter((l) => loc.includes(l.TrangThai)) : dsNgay

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 8 }}>
        <Space>
          <Typography.Title level={4} style={{ margin: 0 }}>{chiXem ? 'Lịch hẹn' : 'Quản lý lịch hẹn'}</Typography.Title>
          {chiXem && <Tag>Chỉ xem</Tag>}
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={tai} loading={dangTai}>Làm mới</Button>
          {!chiXem && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/le-tan/dat-lich')}>Đặt lịch hộ</Button>
          )}
        </Space>
      </Flex>

      <Row gutter={[12, 12]} style={{ marginBottom: 4 }}>
        <Col xs={24} md={10}>
          <Input.Search allowClear placeholder="Tìm tên, SĐT, mã lịch hẹn" onSearch={(v) => setTuKhoa(v.trim())} />
        </Col>
        <Col xs={24} md={8}>
          <Select allowClear placeholder="Tất cả bác sĩ" style={{ width: '100%' }} value={maBs} onChange={setMaBs}
            options={dsBs.map((b) => ({ value: b.MaBS, label: `${b.HoTen} – ${b.TenCK}` }))} />
        </Col>
      </Row>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'cho',
          label: <Badge count={dsCho.length} offset={[10, -2]} size="small">Chờ xác nhận</Badge>,
          children: (
            <>
              {chon.length > 0 && (
                <Alert type="info" style={{ marginBottom: 12 }} title={`Đã chọn ${chon.length} lịch hẹn`}
                  action={<Button size="small" type="primary" onClick={duyetNhieu}>Duyệt tất cả đã chọn</Button>} />
              )}
              <BangThichUng soCotTieuDe={2} rowKey="MaLK" size="middle" columns={cot(true)} dataSource={dsCho} loading={dangTai}
                rowSelection={chiXem ? undefined : { selectedRowKeys: chon, onChange: (k) => setChon(k as number[]) }}
                locale={{ emptyText: 'Không có lịch hẹn nào chờ xác nhận' }}
                pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }} />
            </>
          ),
        },
        {
          key: 'ngay', label: 'Lịch theo ngày',
          children: (
            <>
              <Flex gap={12} wrap align="center" style={{ marginBottom: 12 }}>
                <Space.Compact>
                  <Button icon={<LeftOutlined />} onClick={() => setNgay(ngay.subtract(1, 'day'))} aria-label="Ngày trước" />
                  <DatePicker value={ngay} onChange={(d) => d && setNgay(d)} format={(d) => thuNgay(d)} allowClear={false}
                    style={{ width: 210 }} />
                  <Button icon={<RightOutlined />} onClick={() => setNgay(ngay.add(1, 'day'))} aria-label="Ngày sau" />
                </Space.Compact>
                {!homNay && <Button type="link" onClick={() => setNgay(dayjs())}>Hôm nay</Button>}
                <Segmented value={nhom} onChange={setNhom}
                  options={NHOM_NGAY.map((n) => ({ value: n.key, label: `${n.ten} (${demNhom[n.key] ?? 0})` }))} />
              </Flex>
              <BangThichUng soCotTieuDe={2} rowKey="MaLK" size="middle" columns={cot(false)} dataSource={dsHienThi} loading={dangTai}
                locale={{ emptyText: 'Không có lịch hẹn' }} pagination={{ pageSize: 30, hideOnSinglePage: true }}
                scroll={{ x: 'max-content' }} />
            </>
          ),
        },
      ]} />

      {/* Từ chối (UC7.3) / hủy thay (UC7.4) */}
      <Modal title={lhHuy?.TrangThai === 'CHO_XAC_NHAN' ? 'Từ chối lịch hẹn' : 'Hủy lịch hẹn'} open={!!lhHuy}
        onCancel={() => setLhHuy(null)} okText="Xác nhận" cancelText="Đóng"
        okButtonProps={{ danger: true, loading: dangGui }} onOk={() => formHuy.submit()}>
        {lhHuy && (
          <Typography.Paragraph>
            {lhHuy.BenhNhan} · {lhHuy.GioBatDau} {thuNgay(lhHuy.NgayKham)} · {lhHuy.BacSi}.
            Bệnh nhân sẽ nhận được thông báo kèm lý do.
          </Typography.Paragraph>
        )}
        <Form form={formHuy} layout="vertical" initialValues={{ ly_do: LY_DO_LE_TAN[0] }}
          onFinish={async (v) => {
            const lyDo = v.ly_do === 'Khác' ? (v.khac ?? '').trim() : v.ly_do
            if (await chay(() => api.huyLichThay(lhHuy!.MaLK, lyDo), 'Đã cập nhật lịch hẹn')) setLhHuy(null)
          }}>
          <Form.Item name="ly_do" label="Lý do">
            <Radio.Group options={LY_DO_LE_TAN} style={{ display: 'flex', flexDirection: 'column', gap: 6 }} />
          </Form.Item>
          <Form.Item noStyle dependencies={['ly_do']}>
            {({ getFieldValue }) => getFieldValue('ly_do') === 'Khác' && (
              <Form.Item name="khac" rules={[{ required: true, whitespace: true, message: 'Nhập lý do' }, { max: 200 }]}>
                <Input placeholder="Lý do khác" />
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* Check-in (UC7.5, UC7.10 kiểm tra BHYT) */}
      <Modal title="Check-in bệnh nhân" open={!!lhCheckIn} onCancel={() => setLhCheckIn(null)}
        okText="Check-in" cancelText="Đóng" okButtonProps={{ loading: dangGui }} onOk={() => formCheckIn.submit()}>
        {lhCheckIn && (
          <Descriptions size="small" column={1} style={{ marginBottom: 12 }} items={[
            { key: 'bn', label: 'Bệnh nhân', children: <b>{lhCheckIn.BenhNhan}</b> },
            { key: 'ns', label: 'Ngày sinh', children: lhCheckIn.NgaySinh ? dayjs(lhCheckIn.NgaySinh).format('DD/MM/YYYY') : '—' },
            { key: 'lh', label: 'Lịch hẹn', children: `${lhCheckIn.GioBatDau} · ${lhCheckIn.BacSi} · phòng ${lhCheckIn.MaSoPhong}` },
          ]} />
        )}
        <Form form={formCheckIn} layout="vertical" onFinish={checkIn} initialValues={{ chon_the: 'KHONG' }}>
          <Form.Item name="chon_the" label="Bảo hiểm y tế">
            <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: 6 }} options={[
              ...dsThe.map((t) => ({
                value: t.MaThe,
                label: <span>Thẻ {t.MaThe} · {t.MucHuong}% · hết hạn {dayjs(t.NgayHetHan).format('DD/MM/YYYY')}
                  {dayjs(t.NgayHetHan).isBefore(dayjs(), 'day') && <Tag color="red" style={{ marginInlineStart: 6 }}>Hết hạn</Tag>}</span>,
              })),
              { value: 'NHAP', label: 'Nhập mã thẻ khác' },
              { value: 'KHONG', label: 'Không dùng BHYT' },
            ]} />
          </Form.Item>
          <Form.Item noStyle dependencies={['chon_the']}>
            {({ getFieldValue }) => getFieldValue('chon_the') === 'NHAP' && (
              <Form.Item name="ma_the" rules={[{ required: true, message: 'Nhập mã thẻ hoặc mã số BHXH' }]}>
                <Input placeholder="Mã thẻ 15 ký tự hoặc mã số BHXH 10 số" maxLength={15} />
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={!!ketQua} onCancel={() => setKetQua(null)} footer={null} width={420}>
        {ketQua && (
          <Result status="success" title={<>Số thứ tự <span style={{ fontSize: 40 }}>{ketQua.so_thu_tu}</span></>}
            subTitle={<>
              {ketQua.lh.BenhNhan} · {ketQua.lh.BacSi} · phòng {ketQua.lh.MaSoPhong} – {ketQua.lh.TenPhong}
              <div style={{ marginTop: 8 }}>
                {ketQua.TrangThaiBHYT === 'HOP_LE' && <Tag color="green">BHYT hợp lệ, mức hưởng {ketQua.MucHuong}%</Tag>}
                {ketQua.TrangThaiBHYT === 'KHONG_HOP_LE' && (
                  <Alert type="error" showIcon style={{ textAlign: 'left' }} title="Thẻ BHYT không hợp lệ, khám dịch vụ"
                    description={ketQua.ly_do_bhyt ? `Lý do: ${ketQua.ly_do_bhyt}` : undefined} />
                )}
                {ketQua.TrangThaiBHYT === 'CHO_XAC_MINH' && <Tag color="gold">BHYT chờ xác minh</Tag>}
                {ketQua.TrangThaiBHYT === 'KHONG_CO' && <Tag>Không dùng BHYT</Tag>}
              </div>
            </>}
            extra={<Button type="primary" onClick={() => setKetQua(null)}>Xong</Button>} />
        )}
      </Modal>
    </Card>
  )
}
