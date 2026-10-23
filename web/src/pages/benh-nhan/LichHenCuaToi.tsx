import { CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons'
import {
  Alert, App, Badge, Button, Card, Empty, Flex, Form, Input, Modal, Radio, Segmented, Skeleton, Space, Tabs, Tag,
  Tooltip, Typography, theme,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, LoiApi, type DangKyCho, type KhungGio, type LichHen } from '@/lib/api'
import ChonKhungGio from '@/components/ChonKhungGio'
import {
  coTheHuyDoi, gioKham, LICH_CON_HIEU_LUC, PHUT_HUY_SAU_KHI_DAT, TEN_BUOI, TEN_KENH, thuNgay, TRANG_THAI_LICH_HEN,
} from '@/lib/hangSo'

const LY_DO_HUY = ['Bận việc đột xuất', 'Đã khỏi bệnh', 'Muốn đổi sang bác sĩ khác', 'Khác']

/** Ô ngày lớn bên trái mỗi lịch hẹn. */
function ONgay({ ngay, mo }: { ngay: string; mo?: boolean }) {
  const { token } = theme.useToken()
  const d = dayjs(ngay)
  return (
    <Flex vertical align="center" justify="center" style={{
      width: 72, minWidth: 72, borderRadius: token.borderRadiusLG, padding: '8px 0',
      background: mo ? token.colorFillTertiary : token.colorPrimaryBg, color: mo ? token.colorTextSecondary : token.colorPrimary,
    }}>
      <span style={{ fontSize: 12 }}>{d.day() === 0 ? 'CN' : `Thứ ${d.day() + 1}`}</span>
      <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{d.format('DD')}</span>
      <span style={{ fontSize: 12 }}>Th{d.format('M/YYYY')}</span>
    </Flex>
  )
}

function TheLichHen({ lh, onDoi, onHuy }: { lh: LichHen; onDoi?: () => void; onHuy?: () => void }) {
  const tt = TRANG_THAI_LICH_HEN[lh.TrangThai]
  const quyen = coTheHuyDoi(lh)
  const lyDoKhoa = !quyen.du4Gio ? 'Chỉ được hủy/đổi trước giờ khám ít nhất 4 giờ' : undefined
  // Lịch vừa đặt sát giờ: vẫn hủy được trong 15 phút sau khi đặt, nhưng không đổi được
  const het15Phut = dayjs(lh.NgayTao).add(PHUT_HUY_SAU_KHI_DAT, 'minute')
  const hanHuyVuaDat = het15Phut.isBefore(gioKham(lh)) ? het15Phut : gioKham(lh)
  const goiYHuy = quyen.vuaDat && !quyen.du4Gio
    ? `Lịch vừa đặt: được hủy đến ${hanHuyVuaDat.format('HH:mm')}` : lyDoKhoa
  const daQua = ['HOAN_THANH', 'DA_HUY', 'VANG_MAT'].includes(lh.TrangThai)
  return (
    <Card size="small" styles={{ body: { padding: 16 } }}>
      <Flex gap={16} wrap>
        <ONgay ngay={lh.NgayKham} mo={daQua} />
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <Flex gap={8} align="center" wrap>
            <Typography.Text strong style={{ fontSize: 16 }}>
              <ClockCircleOutlined /> {lh.GioBatDau} – {lh.GioKetThuc}
            </Typography.Text>
            <Tag color={tt.mau}>{tt.ten}</Tag>
            {lh.SoThuTu && <Tag color="cyan">STT {lh.SoThuTu}</Tag>}
          </Flex>
          <div style={{ marginTop: 6 }}>
            <UserOutlined /> {lh.BacSi} · <Typography.Text type="secondary">{lh.TenCK}</Typography.Text>
          </div>
          <div><EnvironmentOutlined /> Phòng {lh.MaSoPhong} – {lh.TenPhong}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Mã {lh.MaLichHen} · Đặt qua {TEN_KENH[lh.KenhDat]}
            {lh.SoLanDoi > 0 && ` · Đã đổi ${lh.SoLanDoi}/2 lần`}
          </Typography.Text>
          {lh.LyDoKham && <div><Typography.Text type="secondary">Lý do: </Typography.Text>{lh.LyDoKham}</div>}
          {lh.TrangThai === 'DA_HUY' && lh.LyDoHuy && (
            <div><Typography.Text type="danger">Lý do hủy: {lh.LyDoHuy}</Typography.Text></div>
          )}
          {lh.GioDuKienVaoKham && lh.TrangThai === 'DA_CHECK_IN' && (
            <div><Typography.Text type="success">Dự kiến vào khám lúc {dayjs(lh.GioDuKienVaoKham).format('HH:mm')}</Typography.Text></div>
          )}
        </div>
        {quyen.conHieuLuc && (
          <Space orientation="vertical" style={{ flex: '0 0 auto' }}>
            <Tooltip title={lyDoKhoa ?? (lh.SoLanDoi >= 2 ? 'Mỗi lịch hẹn chỉ được đổi tối đa 2 lần' : undefined)}>
              <Button block disabled={!quyen.doi} onClick={onDoi}>Đổi lịch</Button>
            </Tooltip>
            <Tooltip title={goiYHuy}>
              <Button block danger disabled={!quyen.huy} onClick={onHuy}>Hủy lịch</Button>
            </Tooltip>
          </Space>
        )}
      </Flex>
    </Card>
  )
}

function TheDangKyCho({ d, bayGio, onNhan, onHuy }: {
  d: DangKyCho; bayGio: dayjs.Dayjs; onNhan: () => void; onHuy: () => void
}) {
  const conGiay = d.HanGiuCho ? dayjs(d.HanGiuCho).diff(bayGio, 'second') : 0
  const ten = { DANG_CHO: ['Đang chờ', 'processing'], DANG_DUOC_MOI: ['Đang giữ chỗ cho bạn', 'success'],
    DA_NHAN_CHO: ['Đã nhận lịch', 'success'], HET_HAN: ['Hết hạn', 'default'], DA_HUY: ['Đã hủy', 'default'] }[d.TrangThai]
  return (
    <Card size="small">
      <Flex justify="space-between" gap={12} wrap>
        <div>
          <Flex gap={8} align="center" wrap>
            <Typography.Text strong>{d.TenCK}</Typography.Text>
            <Badge status={ten[1] as 'processing'} text={ten[0]} />
          </Flex>
          <div>
            <CalendarOutlined /> {thuNgay(d.NgayMongMuon)} · {TEN_BUOI[d.Buoi]} · {d.BacSi ?? 'Bác sĩ bất kỳ'}
          </div>
          {d.TrangThai === 'DANG_CHO' && (
            <Typography.Text type="secondary">Vị trí trong hàng chờ: <b>{d.ViTri}</b></Typography.Text>
          )}
        </div>
        {d.TrangThai === 'DANG_CHO' && (
          <Button danger onClick={onHuy}>Hủy đăng ký</Button>
        )}
      </Flex>
      {d.TrangThai === 'DANG_DUOC_MOI' && (
        <Alert type="success" showIcon style={{ marginTop: 12 }}
          title={<>Có khung giờ {d.GioBatDau} {d.NgayKham && thuNgay(d.NgayKham)} với {d.BacSiDuocMoi}</>}
          description={conGiay > 0
            ? <>Khung giờ được giữ cho bạn thêm <b>{Math.floor(conGiay / 60)}:{String(conGiay % 60).padStart(2, '0')}</b>.
              Sau thời gian này chỗ sẽ chuyển cho người tiếp theo.</>
            : 'Đã hết thời gian giữ chỗ.'}
          action={conGiay > 0 && (
            <Space orientation="vertical">
              <Button type="primary" size="small" onClick={onNhan}>Nhận lịch</Button>
              <Button size="small" onClick={onHuy}>Từ chối</Button>
            </Space>
          )} />
      )}
    </Card>
  )
}

/** UC6.3, UC6.4, UC6.5, UC6.9, UC6.10: lịch hẹn và danh sách chờ của bệnh nhân. */
export default function LichHenCuaToi() {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'sap-toi'
  const [ds, setDs] = useState<LichHen[] | null>(null)
  const [cho, setCho] = useState<DangKyCho[]>([])
  const [bayGio, setBayGio] = useState(dayjs())
  const [lhHuy, setLhHuy] = useState<LichHen | null>(null)
  const [lhDoi, setLhDoi] = useState<LichHen | null>(null)
  const [cungBacSi, setCungBacSi] = useState(true)
  const [kgMoi, setKgMoi] = useState<KhungGio | null>(null)
  const [dangGui, setDangGui] = useState(false)
  const [formHuy] = Form.useForm<{ ly_do: string; khac?: string }>()

  const tai = useCallback(async () => {
    try {
      const [lh, dkc] = await Promise.all([api.lichHenCuaToi(), api.dsDangKyCho()])
      setDs(lh)
      setCho(dkc)
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được lịch hẹn')
    }
  }, [message])

  useEffect(() => {
    tai()
    const id = setInterval(tai, 30_000) // lời mời giữ chỗ có thể đến bất kỳ lúc nào
    return () => clearInterval(id)
  }, [tai])

  const dangMoi = cho.some((d) => d.TrangThai === 'DANG_DUOC_MOI')
  useEffect(() => {
    if (!dangMoi) return
    const id = setInterval(() => setBayGio(dayjs()), 1000)
    return () => clearInterval(id)
  }, [dangMoi])

  const chay = async (viec: () => Promise<unknown>, thanhCong: string) => {
    setDangGui(true)
    try {
      await viec()
      message.success(thanhCong)
      await tai()
      return true
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Thao tác thất bại')
      return false
    } finally {
      setDangGui(false)
    }
  }

  const sapToi = (ds ?? []).filter((l) => LICH_CON_HIEU_LUC.includes(l.TrangThai))
    .sort((a, b) => gioKham(a).valueOf() - gioKham(b).valueOf())
  const lichSu = (ds ?? []).filter((l) => !LICH_CON_HIEU_LUC.includes(l.TrangThai))
  const choHieuLuc = cho.filter((d) => d.TrangThai === 'DANG_CHO' || d.TrangThai === 'DANG_DUOC_MOI')

  const danhSach = (items: LichHen[], rong: string) => ds === null ? <Skeleton active /> : items.length === 0
    ? <Empty description={rong} />
    : (
      <Flex vertical gap={12}>
        {items.map((lh) => (
          <TheLichHen key={lh.MaLK} lh={lh}
            onDoi={() => { setKgMoi(null); setCungBacSi(true); setLhDoi(lh) }}
            onHuy={() => { formHuy.resetFields(); setLhHuy(lh) }} />
        ))}
      </Flex>
    )

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12}>
        <Typography.Title level={4} style={{ margin: 0 }}>Lịch hẹn của tôi</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/dat-lich')}>Đặt lịch mới</Button>
      </Flex>
      {dangMoi && tab !== 'cho' && (
        <Alert type="success" showIcon style={{ marginTop: 16 }} title="Có khung giờ trống đang được giữ cho bạn!"
          action={<Button size="small" type="primary" onClick={() => setParams({ tab: 'cho' })}>Xem ngay</Button>} />
      )}
      <Tabs activeKey={tab} onChange={(k) => setParams({ tab: k })} items={[
        { key: 'sap-toi', label: `Sắp tới (${sapToi.length})`, children: danhSach(sapToi, 'Bạn chưa có lịch hẹn nào sắp tới') },
        {
          key: 'cho', label: <Badge dot={dangMoi} offset={[6, 0]}>Danh sách chờ ({choHieuLuc.length})</Badge>,
          children: cho.length === 0
            ? <Empty description="Chưa có đăng ký chờ. Khi ngày bạn muốn đã kín lịch, hãy đăng ký chờ ở bước chọn ngày giờ." />
            : (
              <Flex vertical gap={12}>
                {cho.map((d) => (
                  <TheDangKyCho key={d.MaDKC} d={d} bayGio={bayGio}
                    onNhan={() => chay(() => api.nhanCho(d.MaDKC), 'Đã nhận lịch, lịch hẹn đang chờ lễ tân xác nhận')
                      .then((ok) => ok && setParams({ tab: 'sap-toi' }))}
                    onHuy={() => modal.confirm({
                      title: d.TrangThai === 'DANG_DUOC_MOI' ? 'Từ chối khung giờ được giữ?' : 'Hủy đăng ký chờ?',
                      content: d.TrangThai === 'DANG_DUOC_MOI'
                        ? 'Khung giờ sẽ được chuyển cho người tiếp theo và đăng ký chờ này kết thúc.' : undefined,
                      okText: 'Đồng ý', okType: 'danger', cancelText: 'Không',
                      onOk: () => chay(() => api.huyCho(d.MaDKC), 'Đã hủy đăng ký chờ'),
                    })} />
                ))}
              </Flex>
            ),
        },
        { key: 'lich-su', label: 'Lịch sử', children: danhSach(lichSu, 'Chưa có lịch sử khám') },
      ]} />

      {/* Hủy lịch (UC6.4, BR04) */}
      <Modal title="Hủy lịch hẹn" open={!!lhHuy} onCancel={() => setLhHuy(null)} okText="Hủy lịch"
        okButtonProps={{ danger: true, loading: dangGui }} cancelText="Đóng" onOk={() => formHuy.submit()}>
        {lhHuy && (
          <Typography.Paragraph>
            {lhHuy.GioBatDau} {thuNgay(lhHuy.NgayKham)} với {lhHuy.BacSi}. Lịch đã hủy không thể khôi phục.
          </Typography.Paragraph>
        )}
        <Form form={formHuy} layout="vertical" initialValues={{ ly_do: LY_DO_HUY[0] }}
          onFinish={async (v) => {
            const lyDo = v.ly_do === 'Khác' ? (v.khac ?? '').trim() || 'Khác' : v.ly_do
            if (await chay(() => api.huyLich(lhHuy!.MaLK, lyDo), 'Đã hủy lịch hẹn')) setLhHuy(null)
          }}>
          <Form.Item name="ly_do" label="Lý do hủy">
            <Radio.Group options={LY_DO_HUY} style={{ display: 'flex', flexDirection: 'column', gap: 6 }} />
          </Form.Item>
          <Form.Item noStyle dependencies={['ly_do']}>
            {({ getFieldValue }) => getFieldValue('ly_do') === 'Khác' && (
              <Form.Item name="khac" rules={[{ required: true, message: 'Nhập lý do' }, { max: 200 }]}>
                <Input placeholder="Lý do khác" />
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* Đổi lịch (UC6.5, BR04) */}
      <Modal title="Đổi lịch hẹn" open={!!lhDoi} onCancel={() => setLhDoi(null)} width={860} destroyOnHidden
        okText="Xác nhận đổi" okButtonProps={{ disabled: !kgMoi, loading: dangGui }} cancelText="Đóng"
        onOk={async () => {
          if (await chay(() => api.doiLich(lhDoi!.MaLK, kgMoi!.MaKG), 'Đã đổi lịch, lịch mới đang chờ lễ tân xác nhận')) {
            setLhDoi(null)
          }
        }}>
        {lhDoi && (
          <>
            <Typography.Paragraph type="secondary">
              Lịch hiện tại: {lhDoi.GioBatDau} {thuNgay(lhDoi.NgayKham)} – {lhDoi.BacSi}.
              Còn {2 - lhDoi.SoLanDoi} lần đổi; sau khi đổi, lịch cần lễ tân xác nhận lại.
            </Typography.Paragraph>
            <Segmented style={{ marginBottom: 16 }} value={cungBacSi ? 'cung' : 'bat-ky'}
              onChange={(v) => { setCungBacSi(v === 'cung'); setKgMoi(null) }}
              options={[{ value: 'cung', label: `Giữ ${lhDoi.BacSi}` }, { value: 'bat-ky', label: `Bác sĩ bất kỳ – ${lhDoi.TenCK}` }]} />
            <ChonKhungGio maCk={lhDoi.MaCK} maBs={cungBacSi ? lhDoi.MaBS : undefined} value={kgMoi} onChange={setKgMoi} />
            {kgMoi && (
              <Alert type="info" showIcon style={{ marginTop: 12 }}
                title={`Lịch mới: ${kgMoi.GioBatDau} ${thuNgay(kgMoi.NgayKham)} – ${kgMoi.BacSi}, phòng ${kgMoi.MaSoPhong}`} />
            )}
          </>
        )}
      </Modal>
    </Card>
  )
}
