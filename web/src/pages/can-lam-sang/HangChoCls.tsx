import {
  EditOutlined, HistoryOutlined, PauseCircleOutlined, ReloadOutlined, SoundOutlined,
  UploadOutlined, WarningOutlined,
} from '@ant-design/icons'
import {
  Alert, App, Badge, Button, Card, Checkbox, Col, Collapse, Descriptions, Drawer, Empty, Flex, Form, Input,
  InputNumber, Modal, Radio, Result, Row, Skeleton, Space, Table, Tabs, Tag, Tooltip, Typography, Upload,
  type TableProps, type UploadFile,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import BangThichUng from '@/components/BangThichUng'
import { DsTep } from '@/components/XemLanKham'
import { useManHinhNho } from '@/hooks/manHinh'
import {
  api, LoiApi, type ChiTietPhieuCls, type HangChoCls as DuLieuHangCho, type NhapKetQuaCls, type PhieuChoCls,
  type PhieuDaXongCls, type TepKetQua,
} from '@/lib/api'
import { SU_KIEN_SO_CLS, TEN_LOAI_DV, TRANG_THAI_LICH_HEN, tuoi } from '@/lib/hangSo'

const LY_DO_HOAN = ['Bệnh nhân không có mặt khi gọi', 'Bệnh nhân chưa nhịn ăn', 'Bệnh nhân chưa ký cam kết', 'Khác']

const thongTinBn = (p: { GioiTinh: 'NAM' | 'NU' | null; NgaySinh: string | null }) =>
  [p.GioiTinh === 'NAM' ? 'Nam' : p.GioiTinh === 'NU' ? 'Nữ' : null,
    tuoi(p.NgaySinh) != null ? `${tuoi(p.NgaySinh)} tuổi` : null].filter(Boolean).join(' · ')

const dung = (v: unknown) => v === true || v === 1

/**
 * Gói 14: bác sĩ cận lâm sàng xem hàng chờ của phòng mình (BR11), gọi bệnh nhân, hoãn khi chưa sẵn sàng,
 * nhập và trả kết quả; kết quả trong ngày vẫn điều chỉnh được khi lượt khám chưa hoàn tất (UC14.7).
 */
export default function HangChoCls() {
  const { message } = App.useApp()
  const [du, setDu] = useState<DuLieuHangCho | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [dangTai, setDangTai] = useState(false)
  const [tab, setTab] = useState('cho')
  const [moPhieu, setMoPhieu] = useState<number | null>(null)
  const [phieuHoan, setPhieuHoan] = useState<PhieuChoCls | null>(null)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      const d = await api.hangChoCls()
      setDu(d)
      setLoi(null)
      window.dispatchEvent(new CustomEvent(SU_KIEN_SO_CLS, {
        detail: d.DangCho.filter((p) => p.TrangThai === 'CHO_THUC_HIEN').length,
      }))
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Không tải được hàng chờ')
    } finally {
      setDangTai(false)
    }
  }, [])

  useEffect(() => { tai() }, [tai])
  useEffect(() => {
    const id = setInterval(tai, 20_000)
    return () => clearInterval(id)
  }, [tai])

  const batDau = async (p: PhieuChoCls) => {
    try {
      await api.batDauCls(p.MaPCD)
      message.success(`Đã gọi ${p.HoTen} vào làm ${p.TenDV}`)
      setMoPhieu(p.MaPCD)
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không gọi được bệnh nhân')
    } finally {
      tai()
    }
  }

  if (loi && !du) return <Result status="warning" title={loi} extra={<Button onClick={tai}>Thử lại</Button>} />

  const dangCho = du?.DangCho ?? []
  const tiepTheo = dangCho.find((p) => p.TrangThai === 'CHO_THUC_HIEN' && !p.CanLamTruoc)

  const cotCho: TableProps<PhieuChoCls>['columns'] = [
    {
      title: '#', key: 'stt', width: 48,
      render: (_, p, i) => p.TrangThai === 'DANG_THUC_HIEN' ? <Badge status="processing" /> : i + 1 - dangCho.filter((x) => x.TrangThai === 'DANG_THUC_HIEN').length,
    },
    {
      title: 'Bệnh nhân', key: 'bn',
      render: (_, p) => (
        <div>
          <Typography.Text strong>{p.HoTen}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{thongTinBn(p)} · {p.MaLichHen}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Dịch vụ', key: 'dv',
      render: (_, p) => (
        <div style={{ maxWidth: 340 }}>
          {p.TenDV}
          <Flex gap={4} wrap style={{ marginTop: 2 }}>
            {dung(p.YeuCauNhinAn) && <Tag color="orange">Cần nhịn ăn</Tag>}
            {p.CanLamTruoc && <Tooltip title="Dịch vụ cùng lượt phải xong trước (BR18)"><Tag color="red">Chờ {p.CanLamTruoc}</Tag></Tooltip>}
            {p.SoLanBoQua > 0 && <Tooltip title={p.GhiChu}><Tag>Đã hoãn {p.SoLanBoQua} lần</Tag></Tooltip>}
          </Flex>
          {p.YeuCau && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>Yêu cầu: {p.YeuCau}</Typography.Text></div>}
        </div>
      ),
    },
    {
      title: 'Chỉ định', key: 'cd', responsive: ['lg'],
      render: (_, p) => (
        <div style={{ maxWidth: 260 }}>
          {p.BacSiChiDinh}
          {p.ChanDoanSoBo && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.ChanDoanSoBo}</Typography.Text></div>}
        </div>
      ),
    },
    {
      title: 'Vào hàng', key: 'gio', responsive: ['md'],
      render: (_, p) => p.TrangThai === 'DANG_THUC_HIEN'
        ? <Tag color="geekblue">Đang làm từ {dayjs(p.ThoiDiemBatDau).format('HH:mm')}</Tag>
        : p.ThoiDiemVaoHangCho && (
          <div>
            {dayjs(p.ThoiDiemVaoHangCho).format('HH:mm')}
            <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>chờ {dayjs().diff(dayjs(p.ThoiDiemVaoHangCho), 'minute')} phút</Typography.Text></div>
          </div>
        ),
    },
    {
      title: '', key: 'thao_tac', align: 'right', fixed: 'right',
      render: (_, p) => (
        <Space size={4} wrap>
          {p.TrangThai === 'DANG_THUC_HIEN' ? (
            <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => setMoPhieu(p.MaPCD)}>Nhập kết quả</Button>
          ) : (
            <Tooltip title={p.CanLamTruoc ? `Cần làm ${p.CanLamTruoc} trước` : undefined}>
              <Button type="primary" size="small" icon={<SoundOutlined />} disabled={!!p.CanLamTruoc} onClick={() => batDau(p)}>Gọi vào</Button>
            </Tooltip>
          )}
          <Button size="small" icon={<PauseCircleOutlined />} onClick={() => setPhieuHoan(p)}>Hoãn</Button>
        </Space>
      ),
    },
  ]

  const cotXong: TableProps<PhieuDaXongCls>['columns'] = [
    { title: 'Giờ trả', key: 'gio', width: 80, render: (_, p) => <Typography.Text strong>{dayjs(p.ThoiDiemCoKetQua).format('HH:mm')}</Typography.Text> },
    {
      title: 'Bệnh nhân', key: 'bn',
      render: (_, p) => <div>{p.HoTen}<div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{thongTinBn(p)} · {p.MaLichHen}</Typography.Text></div></div>,
    },
    { title: 'Dịch vụ', dataIndex: 'TenDV' },
    {
      title: 'Kết luận', key: 'kl', responsive: ['md'],
      render: (_, p) => <Typography.Text ellipsis style={{ maxWidth: 280 }}>{p.KetLuan ?? p.NhanXet ?? '—'}</Typography.Text>,
    },
    {
      title: 'Lượt khám', key: 'lk', responsive: ['lg'],
      render: (_, p) => (
        <Space size={4}>
          <Tag color={TRANG_THAI_LICH_HEN[p.TrangThaiLuot].mau}>{TRANG_THAI_LICH_HEN[p.TrangThaiLuot].ten}</Tag>
          {p.PhienBan > 1 && <Tag>Bản {p.PhienBan}</Tag>}
        </Space>
      ),
    },
    {
      title: '', key: 'thao_tac', align: 'right', fixed: 'right',
      render: (_, p) => (
        <Button size="small" onClick={() => setMoPhieu(p.MaPCD)}>{p.TrangThaiLuot === 'HOAN_THANH' ? 'Xem' : 'Xem / điều chỉnh'}</Button>
      ),
    },
  ]

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 8 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Hàng chờ cận lâm sàng</Typography.Title>
          {du && <Typography.Text type="secondary">Phòng {du.Phong.MaSoPhong} · {du.Phong.TenPhong}</Typography.Text>}
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={tai} loading={dangTai} aria-label="Làm mới" />
          <Button type="primary" icon={<SoundOutlined />} disabled={!tiepTheo} onClick={() => tiepTheo && batDau(tiepTheo)}>
            Gọi người tiếp theo
          </Button>
        </Space>
      </Flex>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'cho',
          label: <Badge count={dangCho.length} offset={[10, -2]} size="small" color="blue">Đang chờ</Badge>,
          children: (
            <BangThichUng soCotTieuDe={2} rowKey="MaPCD" size="middle" columns={cotCho} dataSource={dangCho} loading={dangTai && !du}
              locale={{ emptyText: 'Không có bệnh nhân chờ' }} pagination={false} scroll={{ x: 'max-content' }}
              rowClassName={(p) => (p.TrangThai === 'DANG_THUC_HIEN' ? 'ant-table-row-selected' : '')} />
          ),
        },
        {
          key: 'xong', label: `Đã trả hôm nay (${du?.DaXong.length ?? 0})`,
          children: (
            <BangThichUng soCotTieuDe={2} rowKey="MaPCD" size="middle" columns={cotXong} dataSource={du?.DaXong ?? []}
              locale={{ emptyText: 'Chưa trả kết quả nào hôm nay' }} pagination={{ pageSize: 30, hideOnSinglePage: true }}
              scroll={{ x: 'max-content' }} />
          ),
        },
      ]} />

      {moPhieu != null && (
        <NhapKetQua maPcd={moPhieu} onDong={() => setMoPhieu(null)} onXong={() => { setMoPhieu(null); tai() }} />
      )}
      {phieuHoan && <HoanPhieu p={phieuHoan} onDong={() => setPhieuHoan(null)} onXong={() => { setPhieuHoan(null); tai() }} />}
    </Card>
  )
}

function HoanPhieu({ p, onDong, onXong }: { p: PhieuChoCls; onDong: () => void; onXong: () => void }) {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ ly_do: string; khac?: string }>()
  const [dangGui, setDangGui] = useState(false)
  const lyDo = Form.useWatch('ly_do', form)

  const gui = async (v: { ly_do: string; khac?: string }) => {
    setDangGui(true)
    try {
      await api.hoanCls(p.MaPCD, v.ly_do === 'Khác' ? v.khac!.trim() : v.ly_do)
      message.success(`Đã hoãn, ${p.HoTen} về cuối hàng chờ`)
      onXong()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không hoãn được phiếu')
    } finally {
      setDangGui(false)
    }
  }

  return (
    <Modal open title={`Hoãn ${p.TenDV} · ${p.HoTen}`} onCancel={onDong} okText="Hoãn" cancelText="Đóng"
      confirmLoading={dangGui} onOk={() => form.submit()}>
      <Typography.Paragraph type="secondary">Phiếu về cuối hàng chờ của phòng; bệnh nhân và bác sĩ điều trị thấy lý do.</Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={gui} initialValues={{ ly_do: LY_DO_HOAN[0] }}>
        <Form.Item name="ly_do">
          <Radio.Group options={LY_DO_HOAN} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} />
        </Form.Item>
        {lyDo === 'Khác' && (
          <Form.Item name="khac" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do' }]}>
            <Input maxLength={255} placeholder="Lý do hoãn" autoFocus />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

interface GiaTriKetQua {
  chi_so?: Record<number, number | null>
  mo_ta?: string
  ket_luan?: string
  nhan_xet?: string
  da_nhin_an?: boolean
  da_ky_dong_y?: boolean
  co_sinh_thiet?: boolean
  so_mau_sinh_thiet?: number | null
  vi_tri_sinh_thiet?: string
  ly_do_dieu_chinh?: string
}

function danhGia(giaTri: number | null | undefined, duoi: string | null, tren: string | null) {
  if (giaTri == null) return null
  if (duoi != null && giaTri < Number(duoi)) return <Tag color="orange">↓ Thấp</Tag>
  if (tren != null && giaTri > Number(tren)) return <Tag color="red">↑ Cao</Tag>
  return <Tag color="green">Bình thường</Tag>
}

/** Ngăn nhập / điều chỉnh kết quả một phiếu: chỉ số xét nghiệm, mô tả và kết luận, thông tin nội soi, tệp đính kèm. */
function NhapKetQua({ maPcd, onDong, onXong }: { maPcd: number; onDong: () => void; onXong: () => void }) {
  const { message } = App.useApp()
  const nho = useManHinhNho()
  const [form] = Form.useForm<GiaTriKetQua>()
  const [p, setP] = useState<ChiTietPhieuCls | null>(null)
  const [tepCho, setTepCho] = useState<UploadFile[]>([])
  const [dangGui, setDangGui] = useState(false)
  const chiSo = Form.useWatch('chi_so', form)
  const coSinhThiet = Form.useWatch('co_sinh_thiet', form)

  const tai = useCallback(async () => {
    try {
      const d = await api.chiTietPhieuCls(maPcd)
      setP(d)
      const kq = d.KetQua
      form.setFieldsValue({
        chi_so: Object.fromEntries((kq?.ChiSo ?? []).map((c) => [c.MaChiSo, Number(c.GiaTri)])),
        mo_ta: kq ? kq.MoTa ?? undefined : d.MauKetQua ?? undefined,
        ket_luan: kq?.KetLuan ?? undefined,
        nhan_xet: kq?.NhanXet ?? undefined,
        da_nhin_an: kq ? dung(kq.DaNhinAn) : dung(d.YeuCauNhinAn),
        da_ky_dong_y: kq ? dung(kq.DaKyDongY) : false,
        co_sinh_thiet: kq ? dung(kq.CoSinhThiet) : false,
        so_mau_sinh_thiet: kq?.SoMauSinhThiet ?? null,
        vi_tri_sinh_thiet: kq?.ViTriSinhThiet ?? undefined,
      })
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được phiếu')
      onDong()
    }
  }, [maPcd, form, message, onDong])

  useEffect(() => { tai() }, [tai])

  const kq = p?.KetQua ?? null
  const dieuChinh = !!kq
  const chiXem = !!p && (p.TrangThaiLuot === 'HOAN_THANH' || (p.TrangThai !== 'DANG_THUC_HIEN' && p.TrangThai !== 'CO_KET_QUA'))
  const coChiSo = (p?.MauChiSo.length ?? 0) > 0
  const laXetNghiem = p?.LoaiDV === 'XET_NGHIEM'

  const gui = async (v: GiaTriKetQua) => {
    if (!p) return
    const b: NhapKetQuaCls = {
      chi_so: Object.entries(v.chi_so ?? {}).filter(([, g]) => g != null).map(([ma, g]) => ({ ma_chi_so: Number(ma), gia_tri: g! })),
      mo_ta: v.mo_ta || null, ket_luan: v.ket_luan || null, nhan_xet: v.nhan_xet || null,
    }
    if (p.LoaiDV === 'NOI_SOI') {
      Object.assign(b, {
        da_nhin_an: dung(p.YeuCauNhinAn) ? !!v.da_nhin_an : null, da_ky_dong_y: !!v.da_ky_dong_y,
        co_sinh_thiet: !!v.co_sinh_thiet, so_mau_sinh_thiet: v.co_sinh_thiet ? v.so_mau_sinh_thiet : null,
        vi_tri_sinh_thiet: v.co_sinh_thiet ? v.vi_tri_sinh_thiet || null : null,
      })
    }
    setDangGui(true)
    try {
      if (dieuChinh) await api.capNhatKetQuaCls(p.MaPCD, { ...b, ly_do_dieu_chinh: v.ly_do_dieu_chinh?.trim() })
      else await api.traKetQuaCls(p.MaPCD, b)
      let loiTep = 0
      for (const f of tepCho) {
        try {
          await api.themTepCls(p.MaPCD, f.originFileObj as File)
        } catch {
          loiTep++
        }
      }
      if (loiTep) message.warning(`Đã lưu kết quả nhưng ${loiTep} tệp tải lên thất bại, hãy thử lại trong mục Tệp đính kèm`)
      else message.success(dieuChinh ? 'Đã điều chỉnh kết quả' : 'Đã trả kết quả cho bác sĩ chỉ định')
      onXong()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không lưu được kết quả')
    } finally {
      setDangGui(false)
    }
  }

  const xoaTep = async (t: TepKetQua) => {
    try {
      await api.xoaTepCls(t.MaTep)
      message.success('Đã xóa tệp')
      tai()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không xóa được tệp')
    }
  }

  const themTepNgay = async (f: File) => {
    if (!p) return
    try {
      await api.themTepCls(p.MaPCD, f)
      message.success('Đã thêm tệp')
      tai()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được tệp')
    }
  }

  const kiemTraTep = (f: File) => {
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(f.type)) {
      message.error('Chỉ nhận ảnh JPG, PNG hoặc tệp PDF')
      return false
    }
    if (f.size > 10 * 1024 * 1024) {
      message.error('Tệp tối đa 10 MB')
      return false
    }
    return true
  }

  const lichSu = useMemo(() => kq?.LichSu ?? [], [kq])

  return (
    <Drawer open onClose={onDong} size={nho ? '100%' : 760} destroyOnHidden
      title={p ? `${p.TenDV} · ${p.BenhNhan.HoTen}` : 'Kết quả cận lâm sàng'}
      extra={p && !chiXem && (
        <Button type="primary" loading={dangGui} onClick={() => form.submit()}>
          {dieuChinh ? 'Lưu điều chỉnh' : 'Trả kết quả'}
        </Button>
      )}>
      {!p ? <Skeleton active /> : (
        <Flex vertical gap={16}>
          {p.BenhNhan.DiUng && (
            <Alert type="error" showIcon icon={<WarningOutlined />} title={<><Typography.Text strong>Dị ứng: </Typography.Text>{p.BenhNhan.DiUng}</>} />
          )}
          <Descriptions size="small" column={nho ? 1 : 2} bordered>
            <Descriptions.Item label="Bệnh nhân">{p.BenhNhan.HoTen} · {thongTinBn(p.BenhNhan)}</Descriptions.Item>
            <Descriptions.Item label="Mã lịch hẹn">{p.MaLichHen}</Descriptions.Item>
            <Descriptions.Item label="Chỉ định">{p.BacSiChiDinh}</Descriptions.Item>
            <Descriptions.Item label="Loại">{TEN_LOAI_DV[p.LoaiDV]} · Phòng {p.MaSoPhong}</Descriptions.Item>
            {p.ChanDoanSoBo && <Descriptions.Item label="Chẩn đoán sơ bộ" span={2}>{p.ChanDoanSoBo}</Descriptions.Item>}
            {p.YeuCau && <Descriptions.Item label="Yêu cầu" span={2}>{p.YeuCau}</Descriptions.Item>}
          </Descriptions>
          {p.TrangThaiLuot === 'HOAN_THANH' && (
            <Alert type="info" showIcon title="Lượt khám đã hoàn tất, kết quả không còn điều chỉnh được." />
          )}
          {kq && (
            <Typography.Text type="secondary">
              Trả lúc {dayjs(kq.ThoiGianTra).format('HH:mm DD/MM/YYYY')} bởi {kq.BacSiThucHien}
              {kq.PhienBan > 1 && ` · bản ${kq.PhienBan}, sửa lúc ${dayjs(kq.NgayCapNhat).format('HH:mm')}`}
            </Typography.Text>
          )}

          <Form form={form} layout="vertical" onFinish={gui} disabled={chiXem}>
            {coChiSo && (
              <Table size="small" pagination={false} rowKey="MaChiSo" dataSource={p.MauChiSo} style={{ marginBottom: 16 }}
                scroll={{ x: 'max-content' }}
                columns={[
                  {
                    title: 'Chỉ số', key: 'ten',
                    render: (_, c) => <>{c.TenChiSo}{dung(c.BatBuoc) && <Typography.Text type="danger"> *</Typography.Text>}</>,
                  },
                  {
                    title: 'Kết quả', key: 'gt', width: 150,
                    render: (_, c) => (
                      <Form.Item name={['chi_so', c.MaChiSo]} noStyle
                        rules={dung(c.BatBuoc) ? [{ required: true, message: 'Bắt buộc' }] : undefined}>
                        <InputNumber step={0.1} style={{ width: 130 }} aria-label={c.TenChiSo} />
                      </Form.Item>
                    ),
                  },
                  { title: 'Đơn vị', dataIndex: 'DonVi', render: (d) => d ?? '' },
                  {
                    title: 'Tham chiếu', key: 'tc',
                    render: (_, c) => c.GioiHanDuoi != null || c.GioiHanTren != null
                      ? `${c.GioiHanDuoi != null ? Number(c.GioiHanDuoi) : ''} – ${c.GioiHanTren != null ? Number(c.GioiHanTren) : ''}` : '',
                  },
                  { title: '', key: 'dg', render: (_, c) => danhGia(chiSo?.[c.MaChiSo], c.GioiHanDuoi, c.GioiHanTren) },
                ]} />
            )}
            {!laXetNghiem && (
              <Form.Item name="mo_ta" label="Mô tả">
                <Input.TextArea autoSize={{ minRows: 4, maxRows: 14 }} />
              </Form.Item>
            )}
            {laXetNghiem && (
              <Form.Item name="nhan_xet" label="Nhận xét"
                rules={coChiSo ? undefined : [{ required: true, whitespace: true, message: 'Vui lòng nhập nhận xét kết quả' }]}>
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="VD: Bạch cầu tăng, ưu thế trung tính" />
              </Form.Item>
            )}
            <Form.Item name="ket_luan" label="Kết luận"
              rules={laXetNghiem ? undefined : [{ required: true, whitespace: true, message: 'Vui lòng nhập kết luận' }]}>
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
            </Form.Item>

            {p.LoaiDV === 'NOI_SOI' && (
              <Card size="small" title="Thông tin nội soi" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  {dung(p.YeuCauNhinAn) && (
                    <Col xs={24} md={12}>
                      <Form.Item name="da_nhin_an" valuePropName="checked" style={{ marginBottom: 8 }}
                        rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject(new Error('Chưa nhịn ăn thì hãy hoãn phiếu')) }]}>
                        <Checkbox>Bệnh nhân đã nhịn ăn</Checkbox>
                      </Form.Item>
                    </Col>
                  )}
                  <Col xs={24} md={12}>
                    <Form.Item name="da_ky_dong_y" valuePropName="checked" style={{ marginBottom: 8 }}
                      rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject(new Error('Bệnh nhân phải ký cam kết đồng ý')) }]}>
                      <Checkbox>Đã ký cam kết đồng ý</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item name="co_sinh_thiet" valuePropName="checked" style={{ marginBottom: 8 }}>
                      <Checkbox>Có sinh thiết</Checkbox>
                    </Form.Item>
                  </Col>
                  {coSinhThiet && (
                    <>
                      <Col xs={10} md={8}>
                        <Form.Item name="so_mau_sinh_thiet" label="Số mẫu" rules={[{ required: true, message: 'Nhập số mẫu' }]}>
                          <InputNumber min={1} max={20} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={14} md={16}>
                        <Form.Item name="vi_tri_sinh_thiet" label="Vị trí" rules={[{ required: true, whitespace: true, message: 'Nhập vị trí' }]}>
                          <Input maxLength={255} placeholder="VD: Hang vị" />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                </Row>
              </Card>
            )}

            {dieuChinh && !chiXem && (
              <Form.Item name="ly_do_dieu_chinh" label="Lý do điều chỉnh"
                rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do điều chỉnh' }]}
                extra="Bản cũ được lưu lại; bác sĩ điều trị nhận thông báo kèm lý do.">
                <Input maxLength={255} placeholder="VD: Nhập nhầm giá trị WBC" />
              </Form.Item>
            )}
          </Form>

          <div>
            <Typography.Title level={5}>Tệp đính kèm</Typography.Title>
            {kq && kq.Tep.length > 0 && <DsTep ds={kq.Tep} onXoa={chiXem ? undefined : xoaTep} />}
            {!chiXem && (dieuChinh ? (
              <Upload accept=".jpg,.jpeg,.png,.pdf" showUploadList={false} disabled={kq!.Tep.length >= 10}
                beforeUpload={(f) => { if (kiemTraTep(f)) themTepNgay(f); return false }}>
                <Button icon={<UploadOutlined />} disabled={kq!.Tep.length >= 10} style={{ marginTop: 8 }}>Thêm ảnh / PDF</Button>
              </Upload>
            ) : (
              <Upload accept=".jpg,.jpeg,.png,.pdf" multiple fileList={tepCho} listType="picture"
                beforeUpload={(f) => { if (kiemTraTep(f)) setTepCho((ds) => [...ds, { uid: f.uid, name: f.name, originFileObj: f, status: 'done' } as UploadFile].slice(0, 10)); return false }}
                onRemove={(f) => setTepCho((ds) => ds.filter((x) => x.uid !== f.uid))}>
                <Button icon={<UploadOutlined />}>Chọn ảnh / PDF</Button>
                <Typography.Text type="secondary" style={{ marginInlineStart: 8, fontSize: 12 }}>Tải lên khi trả kết quả · tối đa 10 tệp, mỗi tệp 10 MB</Typography.Text>
              </Upload>
            ))}
            {chiXem && (!kq || kq.Tep.length === 0) && <Typography.Text type="secondary">Không có tệp</Typography.Text>}
          </div>

          {lichSu.length > 0 && (
            <Collapse size="small" items={[{
              key: 'ls', label: <><HistoryOutlined /> Các bản trước ({lichSu.length})</>,
              children: (
                <Flex vertical gap={12}>
                  {lichSu.map((l) => <BanCu key={l.PhienBan} ban={l} mau={p.MauChiSo} />)}
                </Flex>
              ),
            }]} />
          )}
        </Flex>
      )}
    </Drawer>
  )
}

function BanCu({ ban, mau }: { ban: NonNullable<ChiTietPhieuCls['KetQua']>['LichSu'][number]; mau: ChiTietPhieuCls['MauChiSo'] }) {
  let nd: { MoTa?: string | null; KetLuan?: string | null; NhanXet?: string | null; ChiSo?: { MaChiSo: number; GiaTri: number | string }[] } = {}
  try {
    nd = JSON.parse(ban.NoiDungCu)
  } catch { /* nội dung hỏng: chỉ hiện lý do */ }
  const tenChiSo = new Map(mau.map((m) => [m.MaChiSo, m]))
  return (
    <div style={{ borderLeft: '3px solid #d9d9d9', paddingLeft: 12 }}>
      <Typography.Text strong>Bản {ban.PhienBan}</Typography.Text>
      <Typography.Text type="secondary"> · sửa bởi {ban.NguoiSua} lúc {dayjs(ban.ThoiGian).format('HH:mm DD/MM')} · {ban.LyDoDieuChinh}</Typography.Text>
      {(nd.ChiSo ?? []).length > 0 && (
        <div>{nd.ChiSo!.map((c) => `${tenChiSo.get(c.MaChiSo)?.TenChiSo ?? c.MaChiSo}: ${Number(c.GiaTri)}`).join(' · ')}</div>
      )}
      {nd.MoTa && <div style={{ whiteSpace: 'pre-line' }}>{nd.MoTa}</div>}
      {nd.NhanXet && <div>Nhận xét: {nd.NhanXet}</div>}
      {nd.KetLuan && <div>Kết luận: {nd.KetLuan}</div>}
      {!nd.MoTa && !nd.NhanXet && !nd.KetLuan && !(nd.ChiSo ?? []).length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có nội dung" />}
    </div>
  )
}
