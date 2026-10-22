import { EditOutlined, ExperimentOutlined, PlusOutlined } from '@ant-design/icons'
import {
  App, Button, Checkbox, Col, Drawer, Flex, Form, Input, InputNumber, Modal, Row, Segmented, Select, Space, Table, Tag,
  Typography, type TableProps,
} from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import BangThichUng from '@/components/BangThichUng'
import {
  api, type ChuyenKhoaQuanLy, type DichVuQuanLy, type LoaiDichVu, type MauChiSo, type PhongQuanLy,
} from '@/lib/api'
import { PHONG_CUA_DICH_VU, quyTac, TEN_LOAI_DV, tien } from '@/lib/hangSo'
import { CongTacTrangThai, ONhapTien, so, TagTrangThai, thongBaoLoi } from './chung'

const TEN_LOAI: Record<LoaiDichVu, string> = { KHAM: 'Khám', ...TEN_LOAI_DV }

interface GiaTri {
  ten_dv: string; loai_dv: LoaiDichVu; ma_ck?: number | null; ma_phong?: number | null; gia_dich_vu: number
  gia_bhyt?: number | null; mau_ket_qua?: string; yeu_cau_nhin_an?: boolean; thoi_gian_thuc_hien?: number | null
  thoi_gian_tra_ket_qua?: number | null; lam_truoc?: number[]
}

/** UC3.3: dịch vụ khám và cận lâm sàng, giá, giá BHYT; BR18 dịch vụ phải làm trước; UC3.7 mẫu chỉ số xét nghiệm. */
export default function DichVuTab() {
  const { message } = App.useApp()
  const [ds, setDs] = useState<DichVuQuanLy[]>([])
  const [dsCk, setDsCk] = useState<ChuyenKhoaQuanLy[]>([])
  const [dsPhong, setDsPhong] = useState<PhongQuanLy[]>([])
  const [loai, setLoai] = useState<LoaiDichVu | 'TAT_CA'>('TAT_CA')
  const [dangTai, setDangTai] = useState(false)
  const [sua, setSua] = useState<DichVuQuanLy | 'moi' | null>(null)
  const [chiSo, setChiSo] = useState<DichVuQuanLy | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const [form] = Form.useForm<GiaTri>()
  const loaiForm = Form.useWatch('loai_dv', form)
  const giaForm = Form.useWatch('gia_dich_vu', form)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      const [d, c, p] = await Promise.all([api.qlDichVu(), api.qlChuyenKhoa(), api.qlPhong()])
      setDs(d)
      setDsCk(c)
      setDsPhong(p)
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangTai(false)
    }
  }, [message])
  useEffect(() => { tai() }, [tai])

  const tenDv = useMemo(() => new Map(ds.map((d) => [d.MaDV, d.TenDV])), [ds])
  const hienThi = loai === 'TAT_CA' ? ds : ds.filter((d) => d.LoaiDV === loai)

  const mo = (d: DichVuQuanLy | 'moi') => {
    setSua(d)
    form.resetFields()
    form.setFieldsValue(d === 'moi'
      ? { loai_dv: loai === 'TAT_CA' ? 'XET_NGHIEM' : loai, gia_dich_vu: 0, yeu_cau_nhin_an: false, lam_truoc: [] }
      : {
          ten_dv: d.TenDV, loai_dv: d.LoaiDV, ma_ck: d.MaCK, ma_phong: d.MaPhong, gia_dich_vu: Number(d.GiaDichVu),
          gia_bhyt: so(d.GiaBHYT), mau_ket_qua: d.MauKetQua ?? '', yeu_cau_nhin_an: !!Number(d.YeuCauNhinAn),
          thoi_gian_thuc_hien: d.ThoiGianThucHien, thoi_gian_tra_ket_qua: d.ThoiGianTraKetQua, lam_truoc: d.LamTruoc,
        })
  }

  const luu = async (v: GiaTri) => {
    setDangLuu(true)
    try {
      const { lam_truoc, ...b } = v
      const body = {
        ...b, gia_bhyt: v.gia_bhyt ?? null, mau_ket_qua: v.mau_ket_qua || null,
        ma_ck: v.loai_dv === 'KHAM' ? v.ma_ck : null, ma_phong: v.loai_dv === 'KHAM' ? null : v.ma_phong,
      }
      let ma: number
      if (sua === 'moi') {
        ma = (await api.themDichVu(body)).ma_dv
      } else {
        ma = (sua as DichVuQuanLy).MaDV
        await api.suaDichVu(ma, body)
      }
      const cu = sua === 'moi' ? [] : (sua as DichVuQuanLy).LamTruoc
      const moi = lam_truoc ?? []
      if (v.loai_dv !== 'KHAM' && (cu.length !== moi.length || cu.some((x) => !moi.includes(x)))) {
        await api.luuRangBuoc(ma, moi)
      }
      message.success('Đã lưu dịch vụ')
      setSua(null)
      tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangLuu(false)
    }
  }

  const cot: TableProps<DichVuQuanLy>['columns'] = [
    {
      title: 'Dịch vụ', key: 'ten',
      render: (_, d) => (
        <div>
          <Typography.Text strong>{d.TenDV}</Typography.Text>
          {!!Number(d.YeuCauNhinAn) && <Tag color="orange" style={{ marginInlineStart: 6 }}>Nhịn ăn</Tag>}
          {d.LamTruoc.length > 0 && (
            <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Làm sau: {d.LamTruoc.map((m) => tenDv.get(m)).join(', ')}
            </Typography.Text></div>
          )}
        </div>
      ),
    },
    { title: 'Loại', dataIndex: 'LoaiDV', render: (l: LoaiDichVu) => <Tag>{TEN_LOAI[l]}</Tag>, width: 150 },
    {
      title: 'Nơi thực hiện', key: 'noi',
      render: (_, d) => d.LoaiDV === 'KHAM' ? `Chuyên khoa ${d.TenCK}` : `${d.MaSoPhong} – ${d.TenPhong}`,
    },
    {
      title: 'Giá', key: 'gia', width: 150,
      render: (_, d) => (
        <div>
          <div>{tien(d.GiaDichVu)}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {d.GiaBHYT == null ? 'Ngoài BHYT' : `BHYT ${tien(d.GiaBHYT)}`}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Trạng thái', dataIndex: 'TrangThai', render: (t) => <TagTrangThai tt={t} />, width: 110 },
    {
      title: '', key: 'thao_tac', width: 150, align: 'right',
      render: (_, d) => (
        <Space>
          {d.LoaiDV === 'XET_NGHIEM' && (
            <Button size="small" icon={<ExperimentOutlined />} onClick={() => setChiSo(d)}>{d.SoChiSo} chỉ số</Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => mo(d)} aria-label="Sửa" />
          <CongTacTrangThai loai="dich-vu" ma={d.MaDV} tt={d.TrangThai} ten={d.TenDV} onXong={tai} />
        </Space>
      ),
    },
  ]

  const phongHopLe = loaiForm && loaiForm !== 'KHAM'
    ? dsPhong.filter((p) => p.TrangThai === 'HOAT_DONG' && PHONG_CUA_DICH_VU[loaiForm].includes(p.LoaiPhong)) : []

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
        <Segmented value={loai} onChange={(v) => setLoai(v as LoaiDichVu | 'TAT_CA')}
          options={[{ value: 'TAT_CA', label: 'Tất cả' }, ...Object.entries(TEN_LOAI).map(([value, label]) => ({ value, label }))]} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => mo('moi')}>Thêm dịch vụ</Button>
      </Flex>
      <BangThichUng rowKey="MaDV" columns={cot} dataSource={hienThi} loading={dangTai} pagination={{ pageSize: 15 }} />

      <Modal title={sua === 'moi' ? 'Thêm dịch vụ' : 'Sửa dịch vụ'} open={!!sua} onCancel={() => setSua(null)} width={640}
        okText="Lưu" cancelText="Đóng" confirmLoading={dangLuu} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={luu}>
          <Row gutter={12}>
            <Col xs={24} md={16}>
              <Form.Item name="ten_dv" label="Tên dịch vụ" rules={[quyTac.batBuoc('tên dịch vụ')]}><Input maxLength={150} /></Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="loai_dv" label="Loại" rules={[{ required: true }]}>
                <Select disabled={sua !== 'moi'} onChange={() => form.setFieldsValue({ ma_phong: null, ma_ck: null })}
                  options={Object.entries(TEN_LOAI).map(([value, label]) => ({ value, label }))} />
              </Form.Item>
            </Col>
          </Row>
          {loaiForm === 'KHAM' ? (
            <Form.Item name="ma_ck" label="Chuyên khoa" rules={[{ required: true, message: 'Chọn chuyên khoa' }]}
              extra="Giá dịch vụ khám cũng là phí khám cơ bản của chuyên khoa">
              <Select options={dsCk.map((c) => ({ value: c.MaCK, label: c.TenCK }))} />
            </Form.Item>
          ) : (
            <Form.Item name="ma_phong" label="Phòng thực hiện" rules={[{ required: true, message: 'Chọn phòng thực hiện' }]}
              extra="Chỉ hiện phòng đúng loại với dịch vụ (BR11)">
              <Select options={phongHopLe.map((p) => ({ value: p.MaPhong, label: `${p.MaSoPhong} – ${p.TenPhong}` }))} />
            </Form.Item>
          )}
          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item name="gia_dich_vu" label="Giá dịch vụ" rules={[{ required: true, message: 'Nhập giá' }]}><ONhapTien /></Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item name="gia_bhyt" label="Giá BHYT" extra="Để trống nếu ngoài danh mục BHYT"
                rules={[{ validator: (_, v) => v == null || v <= (giaForm ?? 0) ? Promise.resolve()
                  : Promise.reject(new Error('Không vượt giá dịch vụ')) }]}>
                <ONhapTien />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item name="thoi_gian_thuc_hien" label="Thời gian thực hiện (phút)">
                <InputNumber min={1} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            {loaiForm !== 'KHAM' && (
              <Col xs={12}>
                <Form.Item name="thoi_gian_tra_ket_qua" label="Trả kết quả sau (phút)">
                  <InputNumber min={1} max={1440} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            )}
          </Row>
          {loaiForm !== 'KHAM' && (
            <>
              <Form.Item name="yeu_cau_nhin_an" valuePropName="checked">
                <Checkbox>Bệnh nhân phải nhịn ăn trước khi làm</Checkbox>
              </Form.Item>
              <Form.Item name="lam_truoc" label="Phải làm sau các dịch vụ" extra="BR18: lộ trình gợi ý sẽ xếp các dịch vụ này trước">
                <Select mode="multiple" optionFilterProp="label"
                  options={ds.filter((d) => d.LoaiDV !== 'KHAM' && (sua === 'moi' || d.MaDV !== sua?.MaDV))
                    .map((d) => ({ value: d.MaDV, label: d.TenDV }))} />
              </Form.Item>
              {loaiForm !== 'XET_NGHIEM' && (
                <Form.Item name="mau_ket_qua" label="Mẫu kết quả" extra="Khung mô tả gợi sẵn cho bác sĩ khi trả kết quả">
                  <Input.TextArea rows={4} placeholder={'Gan:\nMật:\nKết luận:'} />
                </Form.Item>
              )}
            </>
          )}
        </Form>
      </Modal>

      <ChiSoXetNghiem dv={chiSo} onDong={() => { setChiSo(null); tai() }} />
    </>
  )
}

interface GiaTriChiSo {
  ten_chi_so: string; don_vi?: string; gioi_han_duoi?: number | null; gioi_han_tren?: number | null; bat_buoc: boolean; thu_tu?: number
}

/** UC3.7: mẫu chỉ số của một xét nghiệm, khoảng tham chiếu dùng để đánh dấu Cao / Thấp khi trả kết quả. */
function ChiSoXetNghiem({ dv, onDong }: { dv: DichVuQuanLy | null; onDong: () => void }) {
  const { message } = App.useApp()
  const [ds, setDs] = useState<MauChiSo[]>([])
  const [sua, setSua] = useState<MauChiSo | 'moi' | null>(null)
  const [form] = Form.useForm<GiaTriChiSo>()

  const tai = useCallback(async () => {
    if (!dv) return
    try {
      setDs(await api.dsMauChiSo(dv.MaDV))
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }, [dv, message])
  useEffect(() => { tai() }, [tai])

  const mo = (c: MauChiSo | 'moi') => {
    setSua(c)
    form.setFieldsValue(c === 'moi'
      ? { ten_chi_so: '', don_vi: '', gioi_han_duoi: null, gioi_han_tren: null, bat_buoc: true, thu_tu: ds.length + 1 }
      : { ten_chi_so: c.TenChiSo, don_vi: c.DonVi ?? '', gioi_han_duoi: so(c.GioiHanDuoi), gioi_han_tren: so(c.GioiHanTren),
          bat_buoc: !!Number(c.BatBuoc), thu_tu: c.ThuTu })
  }

  const luu = async (v: GiaTriChiSo) => {
    try {
      const b = { ...v, don_vi: v.don_vi || null }
      if (sua === 'moi') await api.themChiSo(dv!.MaDV, b)
      else if (sua) await api.suaChiSo(sua.MaChiSo, b)
      message.success('Đã lưu chỉ số')
      setSua(null)
      tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }

  return (
    <Drawer open={!!dv} onClose={onDong} size="min(720px, 100vw)" title={dv ? `Chỉ số: ${dv.TenDV}` : ''} destroyOnHidden
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => mo('moi')}>Thêm chỉ số</Button>}>
      <Table<MauChiSo> rowKey="MaChiSo" size="small" pagination={false} dataSource={ds} scroll={{ x: 'max-content' }}
        columns={[
          { title: '#', dataIndex: 'ThuTu', width: 40 },
          {
            title: 'Chỉ số', key: 'ten',
            render: (_, c) => <>{c.TenChiSo}{!Number(c.BatBuoc) && <Tag style={{ marginInlineStart: 6 }}>Không bắt buộc</Tag>}</>,
          },
          { title: 'Đơn vị', dataIndex: 'DonVi', render: (d) => d ?? '' },
          {
            title: 'Tham chiếu', key: 'tc',
            render: (_, c) => `${c.GioiHanDuoi != null ? Number(c.GioiHanDuoi) : '…'} – ${c.GioiHanTren != null ? Number(c.GioiHanTren) : '…'}`,
          },
          {
            title: '', key: 'thao_tac', align: 'right',
            render: (_, c) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => mo(c)} aria-label="Sửa" />
                <CongTacTrangThai loai="chi-so" ma={c.MaChiSo} tt={c.TrangThai} ten={`chỉ số ${c.TenChiSo}`} onXong={tai} />
              </Space>
            ),
          },
        ]} />
      <Modal title={sua === 'moi' ? 'Thêm chỉ số' : 'Sửa chỉ số'} open={!!sua} onCancel={() => setSua(null)}
        okText="Lưu" cancelText="Đóng" onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={luu}>
          <Row gutter={12}>
            <Col xs={16}><Form.Item name="ten_chi_so" label="Tên chỉ số" rules={[quyTac.batBuoc('tên chỉ số')]}><Input maxLength={100} /></Form.Item></Col>
            <Col xs={8}><Form.Item name="don_vi" label="Đơn vị"><Input maxLength={30} placeholder="mmol/L" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col xs={8}><Form.Item name="gioi_han_duoi" label="Giới hạn dưới"><InputNumber style={{ width: '100%' }} step={0.1} /></Form.Item></Col>
            <Col xs={8}>
              <Form.Item name="gioi_han_tren" label="Giới hạn trên" dependencies={['gioi_han_duoi']}
                rules={[({ getFieldValue }) => ({
                  validator: (_, v) => v == null || getFieldValue('gioi_han_duoi') == null || v >= getFieldValue('gioi_han_duoi')
                    ? Promise.resolve() : Promise.reject(new Error('Phải ≥ giới hạn dưới')),
                })]}>
                <InputNumber style={{ width: '100%' }} step={0.1} />
              </Form.Item>
            </Col>
            <Col xs={8}><Form.Item name="thu_tu" label="Thứ tự"><InputNumber min={0} max={999} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="bat_buoc" valuePropName="checked"><Checkbox>Bắt buộc nhập khi trả kết quả</Checkbox></Form.Item>
        </Form>
      </Modal>
    </Drawer>
  )
}
