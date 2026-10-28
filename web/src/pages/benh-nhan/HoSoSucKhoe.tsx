import { ExperimentOutlined, LineChartOutlined, MedicineBoxOutlined, ReloadOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, Col, Drawer, Empty, Flex, List, Row, Select, Skeleton, Space, Table, Tabs, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BieuDoChiSo, { danhGia } from '@/components/BieuDoChiSo'
import ChonNguoiKham, { useNguoiKham } from '@/components/ChonNguoiKham'
import XemLanKham from '@/components/XemLanKham'
import { api, LoiApi, type DayChiSo, type DongHoSoSucKhoe, type LanKham } from '@/lib/api'
import { thuNgay } from '@/lib/hangSo'

const giaTriChu = (v: string | number | undefined) => (v == null ? '' : Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 2 }))

/** UC11.3: chọn một chỉ số, xem biểu đồ qua các lần khám kèm khoảng tham chiếu và bảng số liệu. */
function TabChiSo({ maBn }: { maBn?: number }) {
  const [ds, setDs] = useState<DayChiSo[] | null>(null)
  const [ma, setMa] = useState<string>()
  useEffect(() => {
    setDs(null)
    api.chiSoSucKhoe(maBn).then((d) => {
      setDs(d)
      // Mặc định chọn chỉ số có nhiều lần đo nhất
      setMa([...d].sort((a, b) => b.Diem.length - a.Diem.length)[0]?.Ma)
    }).catch(() => setDs([]))
  }, [maBn])

  if (!ds) return <Skeleton active />
  if (ds.length === 0) return <Empty description="Chưa có chỉ số nào được ghi nhận ở các lần khám đã hoàn tất" />
  const day = ds.find((d) => d.Ma === ma) ?? ds[0]
  const nhom = [...new Set(ds.map((d) => d.Nhom))]
  const haiDuong = day.Diem.some((p) => p.GiaTri2 != null)
  const khoang = day.Duoi != null || day.Tren != null
    ? `${day.Duoi != null ? giaTriChu(day.Duoi) : '…'} – ${day.Tren != null ? giaTriChu(day.Tren) : '…'}${haiDuong ? ` / ${giaTriChu(day.Duoi2)} – ${giaTriChu(day.Tren2)}` : ''} ${day.DonVi ?? ''}`
    : null

  return (
    <Flex vertical gap={12}>
      <Space wrap>
        <Typography.Text strong>Chỉ số</Typography.Text>
        <Select style={{ minWidth: 280 }} value={day.Ma} onChange={setMa} showSearch optionFilterProp="label"
          options={nhom.map((g) => ({
            label: g,
            options: ds.filter((d) => d.Nhom === g).map((d) => ({ value: d.Ma, label: `${d.Ten} (${d.Diem.length} lần)` })),
          }))} />
      </Space>
      <Typography.Title level={5} style={{ margin: 0 }}>
        {day.Ten}{day.DonVi && <Typography.Text type="secondary" style={{ fontWeight: 400 }}> ({day.DonVi})</Typography.Text>}
      </Typography.Title>
      {khoang && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Khoảng tham chiếu: {khoang}</Typography.Text>}
      {day.Diem.length < 2 ? (
        <Alert type="info" showIcon title="Chưa đủ dữ liệu để vẽ biểu đồ"
          description={`${day.Ten} mới được đo ${day.Diem.length} lần; cần ít nhất 2 lần khám để xem xu hướng.`} />
      ) : <BieuDoChiSo day={day} />}
      <Table size="small" rowKey="MaLK" pagination={false} dataSource={[...day.Diem].reverse()} scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Ngày khám', dataIndex: 'NgayKham', render: (n: string) => dayjs(n).format('DD/MM/YYYY') },
          {
            title: haiDuong ? 'Tâm thu / tâm trương' : 'Giá trị', key: 'gt', align: 'right',
            render: (_, p) => haiDuong ? `${giaTriChu(p.GiaTri)}/${giaTriChu(p.GiaTri2)}` : giaTriChu(p.GiaTri),
          },
          {
            title: 'So với tham chiếu', key: 'dg',
            render: (_, p) => haiDuong
              ? [danhGia(Number(p.GiaTri), day.Duoi, day.Tren), danhGia(Number(p.GiaTri2), day.Duoi2, day.Tren2)]
                .map((t, i) => `${i ? 'TTr' : 'TT'}: ${t}`).join(' · ')
              : danhGia(Number(p.GiaTri), day.Duoi, day.Tren) || '—',
          },
        ]} />
    </Flex>
  )
}

/**
 * Bệnh nhân xem lại các lần khám đã hoàn tất của mình hoặc người thân (UC1.7): chẩn đoán, đơn thuốc, kết quả cận lâm sàng,
 * lời dặn; và biểu đồ chỉ số qua các lần khám (UC11.3).
 */
export default function HoSoSucKhoe() {
  const { message } = App.useApp()
  const [ds, setDs] = useState<DongHoSoSucKhoe[] | null>(null)
  const [chiTiet, setChiTiet] = useState<LanKham | null>(null)
  const [dangMo, setDangMo] = useState<number | null>(null)
  const [thamSo, setThamSo] = useSearchParams()
  const dsNguoiKham = useNguoiKham()
  const [maBn, setMaBn] = useState<number | undefined>(thamSo.get('ma_bn') ? Number(thamSo.get('ma_bn')) : undefined)
  const [tab, setTab] = useState('lan-kham')

  const tai = useCallback(async () => {
    setDs(null)
    try {
      setDs(await api.hoSoSucKhoe(maBn))
    } catch (e) {
      setDs([])
      message.error(e instanceof LoiApi ? e.message : 'Không tải được hồ sơ sức khỏe')
    }
  }, [message, maBn])

  const mo = useCallback(async (maLk: number) => {
    setDangMo(maLk)
    try {
      setChiTiet(await api.chiTietHoSoSucKhoe(maLk))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được lần khám')
    } finally {
      setDangMo(null)
    }
  }, [message])

  useEffect(() => { tai() }, [tai])

  // Mở từ thông báo hoàn tất khám: /ho-so-suc-khoe?luot=123
  useEffect(() => {
    const luot = Number(thamSo.get('luot'))
    if (luot) {
      mo(luot)
      setThamSo({}, { replace: true })
    }
  }, [thamSo, setThamSo, mo])

  const taiKhamSapToi = ds?.map((d) => d.NgayTaiKham).filter((n): n is string => !!n && !dayjs(n).isBefore(dayjs(), 'day')).sort()[0]

  const danhSach = !ds ? <Skeleton active /> : ds.length === 0 ? (
    <Empty description="Chưa có lần khám nào hoàn tất" />
  ) : (
    <List dataSource={ds} renderItem={(d) => (
      <List.Item actions={[
        <Button key="xem" type="link" loading={dangMo === d.MaLK} onClick={() => mo(d.MaLK)}>Xem chi tiết</Button>,
      ]}>
        <List.Item.Meta
          title={(
            <Space wrap size={6}>
              <span>{thuNgay(d.NgayKham)}</span>
              {d.MaICD && <Tag color="blue">{d.MaICD}</Tag>}
            </Space>
          )}
          description={(
            <div>
              <Typography.Text strong>{d.ChanDoan ?? d.TenBenh}</Typography.Text>
              <div>{d.BacSi}{d.HocHamHocVi && ` (${d.HocHamHocVi})`}{d.TenCK && ` · ${d.TenCK}`}</div>
              <Space size={12} wrap style={{ fontSize: 12 }}>
                {!!Number(d.CoDonThuoc) && <span><MedicineBoxOutlined /> Có đơn thuốc</span>}
                {d.SoKetQua > 0 && <span><ExperimentOutlined /> {d.SoKetQua} kết quả cận lâm sàng</span>}
                {d.NgayTaiKham && <span>Tái khám {dayjs(d.NgayTaiKham).format('DD/MM/YYYY')}</span>}
              </Space>
            </div>
          )} />
      </List.Item>
    )} />
  )

  return (
    <Card>
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Hồ sơ sức khỏe</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={tai} aria-label="Làm mới" />
      </Flex>
      <Row style={{ marginBottom: 12 }}><Col><ChonNguoiKham ds={dsNguoiKham} value={maBn} onChange={setMaBn} nhan="Hồ sơ của" /></Col></Row>
      {taiKhamSapToi && (
        <Card size="small" style={{ marginBottom: 16, background: 'var(--ant-color-primary-bg)' }}>
          Có hẹn tái khám vào <Typography.Text strong>{thuNgay(taiKhamSapToi)}</Typography.Text>. Hãy đặt lịch trước để giữ chỗ.
        </Card>
      )}
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'lan-kham', label: <><UnorderedListOutlined /> Các lần khám</>, children: danhSach },
        { key: 'chi-so', label: <><LineChartOutlined /> Biểu đồ chỉ số</>, children: <TabChiSo key={maBn ?? 0} maBn={maBn} /> },
      ]} />
      <Drawer open={!!chiTiet} onClose={() => setChiTiet(null)} size="min(720px, 100vw)" destroyOnHidden
        title={chiTiet ? `Lần khám ${dayjs(chiTiet.NgayKham).format('DD/MM/YYYY')}` : ''}>
        {chiTiet && <XemLanKham lk={chiTiet} />}
      </Drawer>
    </Card>
  )
}
