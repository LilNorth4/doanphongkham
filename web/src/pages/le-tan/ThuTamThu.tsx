import { LeftOutlined, PrinterOutlined, ReloadOutlined, RightOutlined, WalletOutlined } from '@ant-design/icons'
import {
  Alert, App, Badge, Button, Card, Col, DatePicker, Descriptions, Divider, Flex, Input, InputNumber, Modal, Radio,
  Row, Space, Table, Tabs, Tag, Typography, type TableProps,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BangThichUng from '@/components/BangThichUng'
import LapPhieuHoan from '@/components/LapPhieuHoan'
import {
  api, LoiApi, type BienLai, type DongBienLai, type HinhThucThu, type LuotChoTamThu, type ThongTinPhongKham,
} from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { goiYTienDua, SU_KIEN_SO_TAM_THU, TEN_HINH_THUC, tien, tuoi } from '@/lib/hangSo'
import { inTrang, thoat } from '@/lib/in'

const thongTinBn = (l: { GioiTinh: 'NAM' | 'NU' | null; NgaySinh: string | null; SDT?: string | null }) =>
  [l.GioiTinh === 'NAM' ? 'Nam' : l.GioiTinh === 'NU' ? 'Nữ' : null,
    tuoi(l.NgaySinh) != null ? `${tuoi(l.NgaySinh)} tuổi` : null, l.SDT].filter(Boolean).join(' · ')

/** In biên lai tạm thu khổ nhỏ. */
function inBienLai(bl: BienLai) {
  const dong = bl.Phieu.map((p) => `<tr><td>${thoat(p.TenDV)}<br><small>Phòng ${thoat(p.MaSoPhong)}</small></td>`
    + `<td class="so">${tien(p.GiaDichVu)}</td><td class="so">${tien(p.BHYTChiTra)}</td><td class="so">${tien(p.BenhNhanTra)}</td></tr>`).join('')
  return inTrang(bl.MaSoBienLai, `
<div class="giua"><strong>${thoat(bl.PhongKham.TenPhongKham)}</strong><br><small>${thoat(bl.PhongKham.DiaChi)} · ${thoat(bl.PhongKham.Hotline)}</small></div>
<h1>BIÊN LAI TẠM THU</h1>
<div class="giua">Số: <strong>${thoat(bl.MaSoBienLai)}</strong> · ${dayjs(bl.ThoiDiemThu).format('HH:mm DD/MM/YYYY')}</div>
<p>Bệnh nhân: <strong>${thoat(bl.HoTen)}</strong>${bl.NgaySinh ? ` (${dayjs(bl.NgaySinh).format('DD/MM/YYYY')})` : ''}<br>
Mã lịch hẹn: ${thoat(bl.MaLichHen)} · Bác sĩ chỉ định: ${thoat(bl.BacSi)}</p>
<table><thead><tr><th>Dịch vụ</th><th class="so">Giá</th><th class="so">BHYT</th><th class="so">BN trả</th></tr></thead>
<tbody>${dong}<tr class="tong"><td colspan="3">Tổng tạm thu</td><td class="so">${tien(bl.TongTien)}</td></tr></tbody></table>
<p>Hình thức: ${TEN_HINH_THUC[bl.HinhThuc]}${bl.HinhThuc === 'TIEN_MAT' && bl.TienKhachDua != null
    ? `<br>Khách đưa: ${tien(bl.TienKhachDua)} · Tiền thừa: ${tien(bl.TienThua ?? 0)}` : ''}<br>Thu ngân: ${thoat(bl.ThuNgan)}</p>
<p class="giua"><small>Vui lòng giữ biên lai để đối chiếu khi thanh toán cuối lượt khám.</small></p>`)
}

/**
 * UC10.7: lễ tân tạm thu chi phí cận lâm sàng (BR10). Mỗi lượt khám thu một lần cho các phiếu đã chọn,
 * lập biên lai; phiếu đã thu tự vào hàng chờ của phòng thực hiện.
 */
export default function ThuTamThu() {
  const { message } = App.useApp()
  const [tab, setTab] = useState('cho')
  const [tuKhoa, setTuKhoa] = useState('')
  const [ds, setDs] = useState<LuotChoTamThu[]>([])
  const [ngay, setNgay] = useState<Dayjs>(dayjs())
  const [dsBl, setDsBl] = useState<DongBienLai[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [luot, setLuot] = useState<LuotChoTamThu | null>(null)
  const [moHoan, setMoHoan] = useState(false)
  const lapHoan = !!usePhien().nguoiDung?.Quyen.includes('HOAN_TIEN.LAP')
  // Mở từ nút "Thu tạm thu CLS" ở danh sách lịch hẹn: /le-tan/tam-thu?lk=123 mở luôn hộp thu tiền của lượt đó
  const [params] = useSearchParams()
  const daMoTuLink = useRef(false)
  const [bienLai, setBienLai] = useState<BienLai | null>(null)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      const [cho, bl] = await Promise.all([api.dsChoTamThu(tuKhoa || undefined), api.dsBienLai(ngay.format('YYYY-MM-DD'))])
      setDs(cho)
      setDsBl(bl)
      const maLk = Number(params.get('lk'))
      if (maLk && !daMoTuLink.current) {
        daMoTuLink.current = true
        const l = cho.find((x) => x.MaLK === maLk)
        if (l) setLuot(l)
      }
      if (!tuKhoa) window.dispatchEvent(new CustomEvent(SU_KIEN_SO_TAM_THU, { detail: cho.length }))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được danh sách chờ thu')
    } finally {
      setDangTai(false)
    }
  }, [tuKhoa, ngay, message, params])

  useEffect(() => { tai() }, [tai])
  useEffect(() => {
    const id = setInterval(tai, 30_000)
    return () => clearInterval(id)
  }, [tai])

  const xemBienLai = async (maBl: number) => {
    try {
      setBienLai(await api.bienLai(maBl))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được biên lai')
    }
  }

  const cotCho: TableProps<LuotChoTamThu>['columns'] = [
    {
      title: 'Bệnh nhân', key: 'bn',
      render: (_, l) => (
        <div>
          <Typography.Text strong>{l.HoTen}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{thongTinBn(l)}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Lượt khám', key: 'lk', responsive: ['md'],
      render: (_, l) => (
        <div>
          {l.MaLichHen}
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {l.BacSi} · chỉ định {dayjs(l.ThoiDiemChiDinh).format('HH:mm')}
            {!dayjs(l.NgayKham).isSame(dayjs(), 'day') && ` ${dayjs(l.NgayKham).format('DD/MM')}`}
          </Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Dịch vụ', key: 'dv',
      render: (_, l) => (
        <Flex gap={4} wrap style={{ maxWidth: 360 }}>
          {l.Phieu.map((p) => <Tag key={p.MaPCD}>{p.TenDV} · {p.MaSoPhong}</Tag>)}
        </Flex>
      ),
    },
    {
      title: 'BHYT', key: 'bhyt', responsive: ['lg'],
      render: (_, l) => l.TrangThaiBHYT === 'HOP_LE' ? <Tag color="green">{l.MucHuong}%</Tag> : '—',
    },
    {
      title: 'Phải thu', key: 'thu', align: 'right',
      render: (_, l) => <Typography.Text strong>{tien(l.SoTienPhaiThu)}</Typography.Text>,
    },
    {
      title: '', key: 'thao_tac', align: 'right', fixed: 'right',
      render: (_, l) => <Button type="primary" size="small" icon={<WalletOutlined />} onClick={() => setLuot(l)}>Thu tiền</Button>,
    },
  ]

  const cotBl: TableProps<DongBienLai>['columns'] = [
    {
      title: 'Biên lai', key: 'bl',
      render: (_, b) => (
        <div>
          <Typography.Text strong>{b.MaSoBienLai}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{dayjs(b.ThoiDiemThu).format('HH:mm')}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Bệnh nhân', key: 'bn',
      render: (_, b) => <div>{b.HoTen}<div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{b.MaLichHen}</Typography.Text></div></div>,
    },
    { title: 'Số phiếu', dataIndex: 'SoPhieu', responsive: ['md'] },
    { title: 'Hình thức', dataIndex: 'HinhThuc', render: (h: HinhThucThu) => TEN_HINH_THUC[h] },
    { title: 'Thu ngân', dataIndex: 'ThuNgan', responsive: ['lg'] },
    { title: 'Số tiền', key: 'tien', align: 'right', render: (_, b) => <Typography.Text strong>{tien(b.TongTien)}</Typography.Text> },
    {
      title: '', key: 'thao_tac', align: 'right', fixed: 'right',
      render: (_, b) => <Button size="small" icon={<PrinterOutlined />} onClick={() => xemBienLai(b.MaBL)}>Xem</Button>,
    },
  ]

  const tongNgay = dsBl.filter((b) => b.TrangThai === 'DA_THU').reduce((s, b) => s + Number(b.TongTien), 0)

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Thu tạm thu cận lâm sàng</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={tai} loading={dangTai}>Làm mới</Button>
      </Flex>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'cho',
          label: <Badge count={ds.length} offset={[10, -2]} size="small">Chờ thu</Badge>,
          children: (
            <>
              <Row style={{ marginBottom: 12 }}>
                <Col xs={24} md={10}>
                  <Input.Search allowClear placeholder="Tìm tên, SĐT, mã lịch hẹn" onSearch={(v) => setTuKhoa(v.trim())} />
                </Col>
              </Row>
              <BangThichUng soCotTieuDe={1} rowKey="MaLK" size="middle" columns={cotCho} dataSource={ds} loading={dangTai}
                locale={{ emptyText: 'Không có bệnh nhân chờ tạm thu' }} pagination={{ pageSize: 20, hideOnSinglePage: true }}
                scroll={{ x: 'max-content' }} />
            </>
          ),
        },
        {
          key: 'bien-lai', label: 'Biên lai đã thu',
          children: (
            <>
              <Flex gap={12} wrap align="center" justify="space-between" style={{ marginBottom: 12 }}>
                <Space wrap>
                  <Space.Compact>
                    <Button icon={<LeftOutlined />} onClick={() => setNgay(ngay.subtract(1, 'day'))} aria-label="Ngày trước" />
                    <DatePicker value={ngay} onChange={(d) => d && setNgay(d)} format="DD/MM/YYYY" allowClear={false}
                      style={{ width: 140 }} disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
                    <Button icon={<RightOutlined />} onClick={() => setNgay(ngay.add(1, 'day'))} aria-label="Ngày sau"
                      disabled={ngay.isSame(dayjs(), 'day')} />
                  </Space.Compact>
                  {!ngay.isSame(dayjs(), 'day') && <Button type="link" onClick={() => setNgay(dayjs())}>Hôm nay</Button>}
                </Space>
                <Typography.Text>{dsBl.length} biên lai · tổng <Typography.Text strong>{tien(tongNgay)}</Typography.Text></Typography.Text>
              </Flex>
              <BangThichUng soCotTieuDe={2} rowKey="MaBL" size="middle" columns={cotBl} dataSource={dsBl} loading={dangTai}
                locale={{ emptyText: 'Chưa có biên lai trong ngày' }} pagination={{ pageSize: 30, hideOnSinglePage: true }}
                scroll={{ x: 'max-content' }} />
            </>
          ),
        },
      ]} />

      {luot && (
        <ThuTien luot={luot} onDong={() => setLuot(null)}
          onXong={(bl) => { setLuot(null); setBienLai(bl); tai() }} />
      )}

      <Modal open={!!bienLai} onCancel={() => setBienLai(null)} title={`Biên lai ${bienLai?.MaSoBienLai ?? ''}`}
        footer={[
          lapHoan && bienLai?.TrangThai === 'DA_THU' && <Button key="hoan" onClick={() => setMoHoan(true)}>Lập phiếu hoàn</Button>,
          <Button key="dong" onClick={() => setBienLai(null)}>Đóng</Button>,
          <Button key="in" type="primary" icon={<PrinterOutlined />}
            onClick={() => bienLai && !inBienLai(bienLai) && message.warning('Không mở được chức năng in của trình duyệt')}>
            In biên lai
          </Button>,
        ]}>
        {bienLai && <XemBienLai bl={bienLai} />}
      </Modal>
      {moHoan && bienLai && (
        <LapPhieuHoan maBl={bienLai.MaBL} maChungTu={bienLai.MaSoBienLai} toiDa={Number(bienLai.TongTien)}
          onDong={() => setMoHoan(false)} onXong={() => setMoHoan(false)} />
      )}
    </Card>
  )
}

function XemBienLai({ bl }: { bl: BienLai }) {
  return (
    <Flex vertical gap={12}>
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Bệnh nhân">{bl.HoTen} · {bl.MaLichHen}</Descriptions.Item>
        <Descriptions.Item label="Thời điểm thu">{dayjs(bl.ThoiDiemThu).format('HH:mm DD/MM/YYYY')} · {bl.ThuNgan}</Descriptions.Item>
        <Descriptions.Item label="Hình thức">
          {TEN_HINH_THUC[bl.HinhThuc]}
          {bl.HinhThuc === 'TIEN_MAT' && bl.TienKhachDua != null && ` · khách đưa ${tien(bl.TienKhachDua)}, trả lại ${tien(bl.TienThua ?? 0)}`}
        </Descriptions.Item>
      </Descriptions>
      <Table size="small" pagination={false} rowKey="MaPCD" dataSource={bl.Phieu}
        columns={[
          { title: 'Dịch vụ', key: 'dv', render: (_, p) => <>{p.TenDV} <Typography.Text type="secondary">· {p.MaSoPhong}</Typography.Text></> },
          { title: 'BHYT', key: 'bhyt', align: 'right', render: (_, p) => tien(p.BHYTChiTra) },
          { title: 'BN trả', key: 'tra', align: 'right', render: (_, p) => tien(p.BenhNhanTra) },
        ]}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}><Typography.Text strong>Tổng tạm thu</Typography.Text></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><Typography.Text strong>{tien(bl.TongTien)}</Typography.Text></Table.Summary.Cell>
          </Table.Summary.Row>
        )} />
      <Alert type="success" showIcon title="Các phiếu đã vào hàng chờ phòng thực hiện. Hướng dẫn bệnh nhân đến đúng phòng." />
    </Flex>
  )
}

/** Hộp thu tiền một lượt khám: chọn phiếu, hình thức, tiền khách đưa. */
function ThuTien({ luot, onDong, onXong }: { luot: LuotChoTamThu; onDong: () => void; onXong: (bl: BienLai) => void }) {
  const { message } = App.useApp()
  const [chon, setChon] = useState<number[]>(luot.Phieu.map((p) => p.MaPCD))
  const [hinhThuc, setHinhThuc] = useState<HinhThucThu>('TIEN_MAT')
  const [tienDua, setTienDua] = useState<number | null>(null)
  const [taiKhoan, setTaiKhoan] = useState<Pick<ThongTinPhongKham, 'MaNganHang' | 'SoTaiKhoan' | 'TenTaiKhoan'> | null>(null)
  const [dangGui, setDangGui] = useState(false)

  const phaiThu = useMemo(() => luot.Phieu.filter((p) => chon.includes(p.MaPCD))
    .reduce((s, p) => s + Number(p.BenhNhanTra), 0), [luot, chon])
  const thieu = hinhThuc === 'TIEN_MAT' && (tienDua == null || tienDua < phaiThu)

  useEffect(() => {
    if (hinhThuc === 'CHUYEN_KHOAN' && !taiKhoan) api.taiKhoanNhan().then(setTaiKhoan).catch(() => {})
  }, [hinhThuc, taiKhoan])

  const thu = async () => {
    setDangGui(true)
    try {
      const bl = await api.tamThu({
        ma_lk: luot.MaLK, ma_pcd: chon, hinh_thuc: hinhThuc, tien_khach_dua: hinhThuc === 'TIEN_MAT' ? tienDua : null,
      })
      message.success(`Đã thu ${tien(bl.TongTien)}, biên lai ${bl.MaSoBienLai}`)
      onXong(bl)
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Thu tiền thất bại')
    } finally {
      setDangGui(false)
    }
  }

  const nhinAn = luot.Phieu.filter((p) => chon.includes(p.MaPCD) && Number(p.YeuCauNhinAn))

  return (
    <Modal open title={`Thu tạm thu · ${luot.HoTen}`} onCancel={onDong} width={640} okText={`Xác nhận đã thu ${tien(phaiThu)}`}
      cancelText="Đóng" onOk={thu} confirmLoading={dangGui} okButtonProps={{ disabled: chon.length === 0 || thieu }}>
      <Typography.Text type="secondary">
        {luot.MaLichHen} · {thongTinBn(luot)} · {luot.BacSi}
        {luot.TrangThaiBHYT === 'HOP_LE' && <Tag color="green" style={{ marginInlineStart: 8 }}>BHYT {luot.MucHuong}%</Tag>}
      </Typography.Text>

      <Table size="small" pagination={false} rowKey="MaPCD" dataSource={luot.Phieu} style={{ marginTop: 12 }}
        scroll={{ x: 'max-content' }}
        rowSelection={{ selectedRowKeys: chon, onChange: (k) => setChon(k as number[]) }}
        columns={[
          {
            title: 'Dịch vụ', key: 'dv',
            render: (_, p) => <div>{p.TenDV}<div><Typography.Text type="secondary" style={{ fontSize: 12 }}>Phòng {p.MaSoPhong} · {p.TenPhong}</Typography.Text></div></div>,
          },
          { title: 'Giá', key: 'gia', align: 'right', render: (_, p) => tien(p.GiaDichVu) },
          { title: 'BHYT trả', key: 'bhyt', align: 'right', render: (_, p) => tien(p.BHYTChiTra) },
          { title: 'BN trả', key: 'tra', align: 'right', render: (_, p) => <Typography.Text strong>{tien(p.BenhNhanTra)}</Typography.Text> },
        ]} />
      {chon.length < luot.Phieu.length && (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Phiếu không chọn vẫn chờ thu, bệnh nhân chưa thực hiện được dịch vụ đó.
        </Typography.Text>
      )}
      {nhinAn.length > 0 && (
        <Alert type="warning" showIcon style={{ marginTop: 12 }}
          title={`${nhinAn.map((p) => p.TenDV).join(', ')} cần bệnh nhân nhịn ăn. Hỏi lại trước khi thu.`} />
      )}

      <Divider style={{ margin: '16px 0 12px' }} />
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Radio.Group value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value)} optionType="button"
          options={[{ value: 'TIEN_MAT', label: 'Tiền mặt' }, { value: 'CHUYEN_KHOAN', label: 'Chuyển khoản' }]} />
        <Typography.Text style={{ fontSize: 16 }}>Phải thu <Typography.Text strong style={{ fontSize: 18 }}>{tien(phaiThu)}</Typography.Text></Typography.Text>
      </Flex>

      {hinhThuc === 'TIEN_MAT' ? (
        <Flex vertical gap={8} style={{ marginTop: 12 }}>
          <Flex gap={8} wrap align="center">
            <Typography.Text>Khách đưa</Typography.Text>
            <InputNumber<number> min={0} step={1000} value={tienDua} onChange={setTienDua} style={{ width: 180 }} suffix="đ"
              formatter={(v) => (v == null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
              parser={(v) => Number((v ?? '').replace(/\D/g, '')) || 0} />
            {goiYTienDua(phaiThu).map((m) => (
              <Button key={m} size="small" onClick={() => setTienDua(m)}>{m.toLocaleString('vi-VN')}</Button>
            ))}
          </Flex>
          {tienDua != null && (tienDua >= phaiThu
            ? <Typography.Text>Tiền thừa trả khách: <Typography.Text strong>{tien(tienDua - phaiThu)}</Typography.Text></Typography.Text>
            : <Typography.Text type="danger">Còn thiếu {tien(phaiThu - tienDua)}</Typography.Text>)}
        </Flex>
      ) : (
        <Alert type="info" style={{ marginTop: 12 }} title="Chỉ xác nhận sau khi đã thấy tiền vào tài khoản"
          description={taiKhoan?.SoTaiKhoan ? (
            <>
              Ngân hàng {taiKhoan.MaNganHang} · STK <Typography.Text strong copyable>{taiKhoan.SoTaiKhoan}</Typography.Text>
              {' '}· {taiKhoan.TenTaiKhoan}<br />
              Nội dung chuyển khoản: <Typography.Text strong copyable>{luot.MaLichHen}</Typography.Text>
            </>
          ) : 'Phòng khám chưa khai báo tài khoản nhận (Danh mục › Thông tin phòng khám).'} />
      )}
    </Modal>
  )
}
