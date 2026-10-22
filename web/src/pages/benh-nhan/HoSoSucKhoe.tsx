import { ExperimentOutlined, MedicineBoxOutlined, ReloadOutlined } from '@ant-design/icons'
import { App, Button, Card, Drawer, Empty, Flex, List, Skeleton, Space, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import XemLanKham from '@/components/XemLanKham'
import { api, LoiApi, type DongHoSoSucKhoe, type LanKham } from '@/lib/api'
import { thuNgay } from '@/lib/hangSo'

/** Bệnh nhân xem lại các lần khám đã hoàn tất: chẩn đoán, đơn thuốc, kết quả cận lâm sàng, lời dặn. */
export default function HoSoSucKhoe() {
  const { message } = App.useApp()
  const [ds, setDs] = useState<DongHoSoSucKhoe[] | null>(null)
  const [chiTiet, setChiTiet] = useState<LanKham | null>(null)
  const [dangMo, setDangMo] = useState<number | null>(null)
  const [thamSo, setThamSo] = useSearchParams()

  const tai = useCallback(async () => {
    try {
      setDs(await api.hoSoSucKhoe())
    } catch (e) {
      setDs([])
      message.error(e instanceof LoiApi ? e.message : 'Không tải được hồ sơ sức khỏe')
    }
  }, [message])

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

  return (
    <Card>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Hồ sơ sức khỏe</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={tai} aria-label="Làm mới" />
      </Flex>
      {taiKhamSapToi && (
        <Card size="small" style={{ marginBottom: 16, background: 'var(--ant-color-primary-bg)' }}>
          Bạn có hẹn tái khám vào <Typography.Text strong>{thuNgay(taiKhamSapToi)}</Typography.Text>. Hãy đặt lịch trước để giữ chỗ.
        </Card>
      )}
      {!ds ? <Skeleton active /> : ds.length === 0 ? (
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
      )}
      <Drawer open={!!chiTiet} onClose={() => setChiTiet(null)} size="min(720px, 100vw)" destroyOnHidden
        title={chiTiet ? `Lần khám ${dayjs(chiTiet.NgayKham).format('DD/MM/YYYY')}` : ''}>
        {chiTiet && <XemLanKham lk={chiTiet} />}
      </Drawer>
    </Card>
  )
}
