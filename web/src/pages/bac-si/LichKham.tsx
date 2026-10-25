import { FileTextOutlined, LeftOutlined, ReloadOutlined, RightOutlined, SoundOutlined } from '@ant-design/icons'
import { App, Button, Card, Col, DatePicker, Flex, Row, Select, Space, Statistic, Tag, Typography, type TableProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BangThichUng from '@/components/BangThichUng'
import { useManHinhNho } from '@/hooks/manHinh'
import { usePhien } from '@/lib/auth'
import { api, LoiApi, type BacSi, type LichHen } from '@/lib/api'
import { thuNgay, TRANG_THAI_LICH_HEN, tuoi } from '@/lib/hangSo'

const DA_DEN = ['DA_CHECK_IN', 'DANG_KHAM', 'CHO_CLS', 'DA_CO_KET_QUA', 'HOAN_THANH']
// Đã có hồ sơ bệnh án (tạo khi gọi vào khám lần đầu)
const CO_HO_SO = ['DANG_KHAM', 'CHO_CLS', 'DA_CO_KET_QUA', 'HOAN_THANH']

/**
 * Bác sĩ xem lịch hẹn của mình theo ngày: ai đã đến, ai đang chờ, lý do khám.
 * Quản trị viên giám sát (KHAM.XEM) chọn bác sĩ để xem, chỉ xem.
 */
export default function LichKham() {
  const nho = useManHinhNho()
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const quyen = usePhien().nguoiDung?.Quyen ?? []
  const giamSat = quyen.includes('KHAM.XEM')
  const laBacSi = quyen.includes('KHAM.THUC_HIEN')
  const [ngay, setNgay] = useState<Dayjs>(dayjs())
  const [dsBs, setDsBs] = useState<BacSi[]>([])
  const [maBs, setMaBs] = useState<number>()
  const [ds, setDs] = useState<LichHen[]>([])
  const [dangTai, setDangTai] = useState(false)

  // Người giám sát không phải bác sĩ: mặc định xem bác sĩ đầu danh sách
  useEffect(() => {
    if (!giamSat) return
    api.dsBacSi().then((d) => {
      setDsBs(d)
      if (!laBacSi && d.length) setMaBs((m) => m ?? d[0].MaBS)
    }).catch(() => {})
  }, [giamSat, laBacSi])

  const tai = useCallback(async () => {
    if (!laBacSi && !maBs) return
    setDangTai(true)
    try {
      setDs(await api.lichKham(ngay.format('YYYY-MM-DD'), maBs))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được lịch khám')
    } finally {
      setDangTai(false)
    }
  }, [ngay, maBs, laBacSi, message])

  useEffect(() => { tai() }, [tai])
  useEffect(() => {
    const id = setInterval(tai, 60_000)
    return () => clearInterval(id)
  }, [tai])

  // Bác sĩ thao tác trên hàng chờ của chính mình trong ngày hôm nay; người giám sát chỉ mở xem hồ sơ
  const thaoTac = laBacSi && !maBs && ngay.isSame(dayjs(), 'day')
  const dangKhamAi = ds.find((l) => l.TrangThai === 'DANG_KHAM')

  const goi = async (l: LichHen) => {
    try {
      await api.goiKham(l.MaLK)
      navigate(`/bac-si/kham/${l.MaLK}`)
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không gọi được bệnh nhân')
    }
  }

  /** Gọi người đứng đầu hàng chờ (theo thứ tự check-in, đã tính người bị bỏ qua và người quay lại sau CLS). */
  const goiTiepTheo = async () => {
    try {
      const tiep = (await api.hangChoKham()).find((l) => l.TrangThai === 'DA_CHECK_IN' || l.TrangThai === 'DA_CO_KET_QUA')
      if (!tiep) {
        message.info('Không còn bệnh nhân nào đang chờ')
        return
      }
      await api.goiKham(tiep.MaLK)
      navigate(`/bac-si/kham/${tiep.MaLK}`)
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không gọi được bệnh nhân')
    }
  }

  const boQua = (l: LichHen) => modal.confirm({
    title: `Bỏ qua ${l.BenhNhan}?`,
    content: 'Bệnh nhân chưa có mặt sẽ được chuyển xuống cuối hàng chờ.',
    okText: 'Bỏ qua',
    cancelText: 'Đóng',
    onOk: async () => {
      try {
        await api.boQuaLuot(l.MaLK)
        tai()
      } catch (e) {
        message.error(e instanceof LoiApi ? e.message : 'Không bỏ qua được')
      }
    },
  })

  const dem = (dk: (l: LichHen) => boolean) => ds.filter(dk).length

  const cot: TableProps<LichHen>['columns'] = [
    { title: 'Giờ hẹn', dataIndex: 'GioBatDau', width: 90, render: (g) => <Typography.Text strong>{g}</Typography.Text> },
    { title: 'STT', dataIndex: 'SoThuTu', width: 64, render: (s) => s ?? '—' },
    {
      title: 'Bệnh nhân', key: 'bn',
      render: (_, l) => (
        <div>
          <Typography.Text strong>{l.BenhNhan}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {[l.GioiTinh === 'NAM' ? 'Nam' : l.GioiTinh === 'NU' ? 'Nữ' : null,
              tuoi(l.NgaySinh) != null ? `${tuoi(l.NgaySinh)} tuổi` : null].filter(Boolean).join(' · ')}
          </Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Lý do / triệu chứng', key: 'ly_do',
      render: (_, l) => (
        <div style={{ maxWidth: 360 }}>
          {l.LyDoKham ?? <Typography.Text type="secondary">—</Typography.Text>}
          {l.TrieuChungSoBo && <div><Typography.Text type="secondary">{l.TrieuChungSoBo}</Typography.Text></div>}
        </div>
      ),
    },
    {
      title: 'BHYT', key: 'bhyt', responsive: ['md'],
      render: (_, l) => l.TrangThaiBHYT === 'HOP_LE' ? <Tag color="green">{l.MucHuong}%</Tag>
        : l.TrangThaiBHYT === 'KHONG_CO' ? '—' : <Tag color="orange">{l.TrangThaiBHYT === 'CHO_XAC_MINH' ? 'Chờ xác minh' : 'Không hợp lệ'}</Tag>,
    },
    {
      title: 'Trạng thái', key: 'tt',
      render: (_, l) => (
        <Space orientation="vertical" size={0}>
          <Tag color={TRANG_THAI_LICH_HEN[l.TrangThai].mau}>{TRANG_THAI_LICH_HEN[l.TrangThai].ten}</Tag>
          {l.TrangThai === 'DA_CHECK_IN' && l.GioDuKienVaoKham && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Dự kiến {dayjs(l.GioDuKienVaoKham).format('HH:mm')}</Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: '', key: 'thao_tac', align: 'right',
      render: (_, l) => {
        const choGoi = l.TrangThai === 'DA_CHECK_IN' || l.TrangThai === 'DA_CO_KET_QUA'
        if (thaoTac && choGoi) {
          return (
            <Space size={4}>
              <Button type="primary" size="small" icon={<SoundOutlined />} disabled={!!dangKhamAi} onClick={() => goi(l)}
                title={dangKhamAi ? `Đang khám ${dangKhamAi.BenhNhan}` : undefined}>
                {l.TrangThai === 'DA_CO_KET_QUA' ? 'Gọi đọc KQ' : 'Gọi khám'}
              </Button>
              <Button size="small" onClick={() => boQua(l)}>Bỏ qua</Button>
            </Space>
          )
        }
        if (CO_HO_SO.includes(l.TrangThai)) {
          return (
            <Button size="small" type={thaoTac && l.TrangThai === 'DANG_KHAM' ? 'primary' : 'default'} icon={<FileTextOutlined />}
              onClick={() => navigate(`/bac-si/kham/${l.MaLK}`)}>
              {thaoTac && l.TrangThai === 'DANG_KHAM' ? 'Tiếp tục khám' : 'Hồ sơ'}
            </Button>
          )
        }
        return null
      },
    },
  ]

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space>
          <Typography.Title level={4} style={{ margin: 0 }}>{maBs ? 'Lịch khám bác sĩ' : 'Lịch khám của tôi'}</Typography.Title>
          {maBs && <Tag>Chỉ xem</Tag>}
        </Space>
        <Space wrap>
          {giamSat && (
            <Select showSearch optionFilterProp="label" value={maBs} onChange={setMaBs} allowClear={laBacSi}
              placeholder={laBacSi ? 'Lịch của tôi' : 'Chọn bác sĩ'} style={{ width: nho ? '100%' : 260 }}
              options={dsBs.map((b) => ({ value: b.MaBS, label: `${b.HoTen} – ${b.TenCK}` }))} />
          )}
          <Space.Compact>
            <Button icon={<LeftOutlined />} onClick={() => setNgay(ngay.subtract(1, 'day'))} aria-label="Ngày trước" />
            <DatePicker value={ngay} onChange={(d) => d && setNgay(d)} format={nho ? 'dd DD/MM' : (d) => thuNgay(d)} allowClear={false}
              style={{ width: nho ? 120 : 210 }} />
            <Button icon={<RightOutlined />} onClick={() => setNgay(ngay.add(1, 'day'))} aria-label="Ngày sau" />
          </Space.Compact>
          {!ngay.isSame(dayjs(), 'day') && <Button type="link" onClick={() => setNgay(dayjs())}>Hôm nay</Button>}
          <Button icon={<ReloadOutlined />} onClick={tai} loading={dangTai} aria-label="Làm mới" />
          {thaoTac && (dangKhamAi ? (
            <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate(`/bac-si/kham/${dangKhamAi.MaLK}`)}>
              Đang khám: {dangKhamAi.BenhNhan}
            </Button>
          ) : (
            <Button type="primary" icon={<SoundOutlined />} onClick={goiTiepTheo}
              disabled={!ds.some((l) => l.TrangThai === 'DA_CHECK_IN' || l.TrangThai === 'DA_CO_KET_QUA')}>
              Gọi bệnh nhân tiếp theo
            </Button>
          ))}
        </Space>
      </Flex>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          { ten: 'Tổng lịch hẹn', so: ds.length },
          { ten: 'Chưa đến', so: dem((l) => l.TrangThai === 'DA_XAC_NHAN' || l.TrangThai === 'CHO_XAC_NHAN') },
          { ten: 'Đang chờ khám', so: dem((l) => l.TrangThai === 'DA_CHECK_IN') },
          { ten: 'Đã đến', so: dem((l) => DA_DEN.includes(l.TrangThai)) },
          { ten: 'Hoàn thành', so: dem((l) => l.TrangThai === 'HOAN_THANH') },
          { ten: 'Vắng mặt', so: dem((l) => l.TrangThai === 'VANG_MAT') },
        ].map((t) => (
          <Col xs={8} lg={4} key={t.ten}>
            <Card size="small" styles={nho ? { body: { padding: '8px 10px' } } : undefined}>
              <Statistic title={<span style={nho ? { fontSize: 12 } : undefined}>{t.ten}</span>} value={t.so}
                styles={nho ? { content: { fontSize: 20 } } : undefined} />
            </Card>
          </Col>
        ))}
      </Row>

      <BangThichUng soCotTieuDe={3} rowKey="MaLK" columns={cot} dataSource={ds} loading={dangTai} size="middle" pagination={false}
        locale={{ emptyText: 'Không có lịch hẹn trong ngày' }} scroll={{ x: 'max-content' }} />
    </Card>
  )
}
