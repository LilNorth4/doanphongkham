import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  Alert, App, Badge, Button, Card, Col, Descriptions, Flex, Form, Input, Modal, Radio, Row, Skeleton, Tabs, Tag, Typography,
  type TableProps,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import BangThichUng from '@/components/BangThichUng'
import { api, LoiApi, type DongPhieuHoan, type HinhThucThu, type PhieuHoan, type TrangThaiHoan } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { NGUONG_DUYET_HOAN, SU_KIEN_SO_HOAN, TEN_HINH_THUC, TEN_LY_DO_HOAN, tien, TRANG_THAI_HOAN } from '@/lib/hangSo'
import { inTrang, thoat } from '@/lib/in'

const TAB: { key: string; ten: string; trangThai: TrangThaiHoan[] }[] = [
  { key: 'cho-duyet', ten: 'Chờ duyệt', trangThai: ['CHO_DUYET'] },
  { key: 'cho-hoan', ten: 'Chờ hoàn', trangThai: ['CHO_HOAN'] },
  { key: 'da-xu-ly', ten: 'Đã hoàn / từ chối', trangThai: ['DA_HOAN', 'TU_CHOI'] },
]

function inPhieuHoan(p: PhieuHoan) {
  return inTrang(p.MaSoPhieu, `
<div class="giua"><strong>${thoat(p.PhongKham.TenPhongKham)}</strong><br><small>${thoat(p.PhongKham.DiaChi)} · ${thoat(p.PhongKham.Hotline)}</small></div>
<h1>PHIẾU HOÀN TIỀN</h1>
<div class="giua">Số: <strong>${thoat(p.MaSoPhieu)}</strong> · ${dayjs(p.ThoiDiemHoan ?? p.ThoiDiemLap).format('HH:mm DD/MM/YYYY')}</div>
<p>Người nhận: <strong>${thoat(p.ChungTu.HoTen)}</strong>${p.ChungTu.SDT ? ` · ${thoat(p.ChungTu.SDT)}` : ''}<br>
Mã lịch hẹn: ${thoat(p.ChungTu.MaLichHen)}<br>Chứng từ gốc: ${thoat(p.ChungTu.MaSo)} (đã thu ${tien(p.ChungTu.DaThu)})<br>
Lý do: ${thoat(TEN_LY_DO_HOAN[p.LyDo])}${p.TenDV ? ` · ${thoat(p.TenDV)}` : ''}${p.GhiChu ? ` · ${thoat(p.GhiChu)}` : ''}</p>
<table><tbody><tr class="tong"><td>Số tiền hoàn</td><td class="so">${tien(p.SoTien)}</td></tr></tbody></table>
<p>Hình thức: ${p.HinhThuc ? TEN_HINH_THUC[p.HinhThuc] : ''}${p.HinhThuc === 'CHUYEN_KHOAN'
    ? `<br>${thoat(p.NganHang)} · ${thoat(p.SoTaiKhoan)}${p.TenTaiKhoan ? ` · ${thoat(p.TenTaiKhoan)}` : ''}` : ''}
${p.ThuNgan ? `<br>Người chi: ${thoat(p.ThuNgan)}` : ''}</p>
<p style="display:flex;justify-content:space-between;margin-top:32px"><span>Người nhận ký</span><span>Thu ngân ký</span></p>`)
}

/**
 * UC10.4: phiếu hoàn tiền. Lễ tân chi tiền phiếu chờ hoàn (tiền mặt hoặc chuyển khoản), quản trị viên duyệt phiếu
 * vượt ngưỡng BR31. Phiếu tự sinh khi bác sĩ hủy phiếu CLS đã thu, hoặc lập tay từ biên lai / hóa đơn.
 */
export default function HoanTien() {
  const { message } = App.useApp()
  const quyen = usePhien().nguoiDung?.Quyen ?? []
  const laDuyet = quyen.includes('HOAN_TIEN.DUYET')
  const [tab, setTab] = useState(laDuyet ? 'cho-duyet' : 'cho-hoan')
  const [tuKhoa, setTuKhoa] = useState('')
  const [ds, setDs] = useState<DongPhieuHoan[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [mo, setMo] = useState<number | null>(null)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      const d = await api.dsPhieuHoan({ tu_khoa: tuKhoa || undefined })
      setDs(d)
      if (!tuKhoa) {
        window.dispatchEvent(new CustomEvent(SU_KIEN_SO_HOAN, {
          detail: d.filter((p) => p.TrangThai === (laDuyet ? 'CHO_DUYET' : 'CHO_HOAN')).length,
        }))
      }
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được phiếu hoàn tiền')
    } finally {
      setDangTai(false)
    }
  }, [tuKhoa, laDuyet, message])

  useEffect(() => { tai() }, [tai])

  const cot: TableProps<DongPhieuHoan>['columns'] = [
    {
      title: 'Người nhận', key: 'bn',
      render: (_, p) => <div><Typography.Text strong>{p.HoTen}</Typography.Text>
        <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.MaLichHen}{p.SDT && ` · ${p.SDT}`}</Typography.Text></div></div>,
    },
    {
      title: 'Phiếu', key: 'phieu',
      render: (_, p) => <div>{p.MaSoPhieu}<div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
        từ {p.MaChungTu} · {dayjs(p.ThoiDiemLap).format('HH:mm DD/MM')}</Typography.Text></div></div>,
    },
    {
      title: 'Lý do', key: 'lydo', responsive: ['md'],
      render: (_, p) => <div>{TEN_LY_DO_HOAN[p.LyDo]}{(p.TenDV || p.GhiChu) && (
        <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{[p.TenDV, p.GhiChu].filter(Boolean).join(' · ')}</Typography.Text></div>)}</div>,
    },
    { title: 'Trạng thái', key: 'tt', render: (_, p) => <Tag color={TRANG_THAI_HOAN[p.TrangThai].mau}>{TRANG_THAI_HOAN[p.TrangThai].ten}</Tag> },
    { title: 'Số tiền', key: 'tien', align: 'right', render: (_, p) => <Typography.Text strong>{tien(p.SoTien)}</Typography.Text> },
    {
      title: '', key: 'thao_tac', align: 'right', fixed: 'right',
      render: (_, p) => {
        const viec = (p.TrangThai === 'CHO_DUYET' && laDuyet) ? 'Duyệt' : (p.TrangThai === 'CHO_HOAN' && !laDuyet) ? 'Chi tiền' : 'Xem'
        return <Button size="small" type={viec === 'Xem' ? 'default' : 'primary'} onClick={() => setMo(p.MaPHT)}>{viec}</Button>
      },
    },
  ]

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Hoàn tiền</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={tai} loading={dangTai}>Làm mới</Button>
      </Flex>
      <Row style={{ marginBottom: 4 }}>
        <Col xs={24} md={10}>
          <Input.Search allowClear placeholder="Tìm tên, mã phiếu, mã biên lai / hóa đơn" onSearch={(v) => setTuKhoa(v.trim())} />
        </Col>
      </Row>
      <Tabs activeKey={tab} onChange={setTab} items={TAB.map((t) => {
        const dong = ds.filter((p) => t.trangThai.includes(p.TrangThai))
        return {
          key: t.key,
          label: t.key === 'da-xu-ly' ? t.ten : <Badge count={dong.length} offset={[10, -2]} size="small">{t.ten}</Badge>,
          children: (
            <>
              {t.key === 'cho-duyet' && (
                <Typography.Paragraph type="secondary">Phiếu trên {tien(NGUONG_DUYET_HOAN)} phải được quản trị viên duyệt trước khi chi (BR31).</Typography.Paragraph>
              )}
              <BangThichUng soCotTieuDe={1} rowKey="MaPHT" size="middle" columns={cot} dataSource={dong} loading={dangTai}
                locale={{ emptyText: 'Không có phiếu' }} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }} />
            </>
          ),
        }
      })} />
      {mo != null && <XuLyPhieu maPht={mo} laDuyet={laDuyet} onDong={() => { setMo(null); tai() }} />}
    </Card>
  )
}

function XuLyPhieu({ maPht, laDuyet, onDong }: { maPht: number; laDuyet: boolean; onDong: () => void }) {
  const { message } = App.useApp()
  const [p, setP] = useState<PhieuHoan | null>(null)
  const [form] = Form.useForm<{ hinh_thuc: HinhThucThu; ngan_hang?: string; so_tai_khoan?: string; ten_tai_khoan?: string; ly_do?: string }>()
  const hinhThuc = Form.useWatch('hinh_thuc', form)
  const [dangGui, setDangGui] = useState(false)

  useEffect(() => {
    api.phieuHoan(maPht).then(setP).catch((e) => { message.error(e instanceof LoiApi ? e.message : 'Không tải được phiếu'); onDong() })
  }, [maPht, message, onDong])

  if (!p) return <Modal open footer={null} onCancel={onDong} title="Phiếu hoàn tiền"><Skeleton active /></Modal>

  const chay = async (viec: () => Promise<unknown>, thanhCong: string) => {
    setDangGui(true)
    try {
      await viec()
      message.success(thanhCong)
      setP(await api.phieuHoan(maPht))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Thao tác thất bại')
    } finally {
      setDangGui(false)
    }
  }

  const chiTien = async () => {
    const v = await form.validateFields()
    await chay(() => api.chiPhieuHoan(maPht, v), `Đã hoàn ${tien(p.SoTien)}`)
  }
  const tuChoi = async () => {
    const lyDo = form.getFieldValue('ly_do')?.trim()
    if (!lyDo) {
      message.warning('Nhập lý do từ chối')
      return
    }
    await chay(() => api.duyetPhieuHoan(maPht, false, lyDo), 'Đã từ chối phiếu')
  }

  const conLai = Number(p.ChungTu.DaThu) - Number(p.ChungTu.DaHoan)
  const footer = p.TrangThai === 'CHO_DUYET' && laDuyet
    ? [<Button key="tc" danger loading={dangGui} onClick={tuChoi}>Từ chối</Button>,
      <Button key="duyet" type="primary" loading={dangGui} onClick={() => chay(() => api.duyetPhieuHoan(maPht, true), 'Đã duyệt, lễ tân có thể chi tiền')}>Duyệt</Button>]
    : p.TrangThai === 'CHO_HOAN' && !laDuyet
      ? [<Button key="dong" onClick={onDong}>Đóng</Button>, <Button key="chi" type="primary" loading={dangGui} onClick={chiTien}>Xác nhận đã hoàn {tien(p.SoTien)}</Button>]
      : [p.TrangThai === 'DA_HOAN' && <Button key="in" icon={<PrinterOutlined />} onClick={() => inPhieuHoan(p)}>In phiếu</Button>,
        <Button key="dong" type="primary" onClick={onDong}>Đóng</Button>]

  return (
    <Modal open width={600} onCancel={onDong} title={`Phiếu hoàn tiền ${p.MaSoPhieu}`} footer={footer}>
      <Descriptions size="small" column={1} bordered styles={{ label: { width: 160 } }}>
        <Descriptions.Item label="Trạng thái"><Tag color={TRANG_THAI_HOAN[p.TrangThai].mau}>{TRANG_THAI_HOAN[p.TrangThai].ten}</Tag></Descriptions.Item>
        <Descriptions.Item label="Người nhận">{p.ChungTu.HoTen}{p.ChungTu.SDT && ` · ${p.ChungTu.SDT}`} · {p.ChungTu.MaLichHen}</Descriptions.Item>
        <Descriptions.Item label="Chứng từ gốc">
          {p.ChungTu.MaSo} · đã thu {tien(p.ChungTu.DaThu)}{p.ChungTu.HinhThuc && ` (${TEN_HINH_THUC[p.ChungTu.HinhThuc].toLowerCase()})`}
          <div><Typography.Text type="secondary">Đã hoàn trước đó {tien(p.ChungTu.DaHoan)} · còn hoàn được {tien(Math.max(conLai, 0))}</Typography.Text></div>
        </Descriptions.Item>
        <Descriptions.Item label="Lý do">{TEN_LY_DO_HOAN[p.LyDo]}{p.TenDV && ` · ${p.TenDV}`}{p.GhiChu && <div>{p.GhiChu}</div>}</Descriptions.Item>
        <Descriptions.Item label="Số tiền hoàn"><Typography.Text strong style={{ fontSize: 16 }}>{tien(p.SoTien)}</Typography.Text></Descriptions.Item>
        <Descriptions.Item label="Lập">{dayjs(p.ThoiDiemLap).format('HH:mm DD/MM/YYYY')} · {p.NguoiLap ?? 'Hệ thống tự tạo'}</Descriptions.Item>
        {p.ThoiDiemDuyet && <Descriptions.Item label={p.TrangThai === 'TU_CHOI' ? 'Từ chối' : 'Duyệt'}>{dayjs(p.ThoiDiemDuyet).format('HH:mm DD/MM/YYYY')} · {p.NguoiDuyet}{p.LyDoTuChoi && ` · ${p.LyDoTuChoi}`}</Descriptions.Item>}
        {p.TrangThai === 'DA_HOAN' && (
          <Descriptions.Item label="Đã hoàn">
            {dayjs(p.ThoiDiemHoan).format('HH:mm DD/MM/YYYY')} · {p.HinhThuc && TEN_HINH_THUC[p.HinhThuc]}
            {p.HinhThuc === 'CHUYEN_KHOAN' && ` · ${p.NganHang} ${p.SoTaiKhoan}`} · {p.ThuNgan}
          </Descriptions.Item>
        )}
      </Descriptions>
      {p.TrangThai === 'CHO_DUYET' && !laDuyet && <Alert style={{ marginTop: 12 }} type="warning" showIcon title="Phiếu vượt ngưỡng, đang chờ quản trị viên duyệt" />}
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ hinh_thuc: 'TIEN_MAT' }}>
        {p.TrangThai === 'CHO_DUYET' && laDuyet && (
          <Form.Item name="ly_do" label="Lý do từ chối (nếu từ chối)"><Input maxLength={255} /></Form.Item>
        )}
        {p.TrangThai === 'CHO_HOAN' && !laDuyet && (
          <>
            <Form.Item name="hinh_thuc" label="Hình thức hoàn">
              <Radio.Group optionType="button" options={[{ value: 'TIEN_MAT', label: 'Tiền mặt tại quầy' }, { value: 'CHUYEN_KHOAN', label: 'Chuyển khoản' }]} />
            </Form.Item>
            {hinhThuc === 'CHUYEN_KHOAN' && (
              <Row gutter={12}>
                <Col xs={24} md={12}><Form.Item name="ngan_hang" label="Ngân hàng" rules={[{ required: true, whitespace: true, message: 'Nhập ngân hàng' }]}><Input placeholder="VD: Vietcombank" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="so_tai_khoan" label="Số tài khoản" rules={[{ required: true, pattern: /^\d{6,20}$/, message: 'Số tài khoản 6–20 chữ số' }]}><Input inputMode="numeric" /></Form.Item></Col>
                <Col xs={24}><Form.Item name="ten_tai_khoan" label="Tên chủ tài khoản"><Input placeholder="VD: NGUYEN VAN A" /></Form.Item></Col>
              </Row>
            )}
          </>
        )}
      </Form>
    </Modal>
  )
}
