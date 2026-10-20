import { App, Checkbox, DatePicker, Form, InputNumber, Modal, Select, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { api, LoiApi, type BacSi, type CaLam, type PhongKham } from '@/lib/api'
import { CA_LAM, DS_CA_LAM, quyTac, soKhungGio, thuNgay } from '@/lib/hangSo'

export interface MacDinhTaoCa { ma_bs?: number; ngay?: Dayjs; ca?: CaLam }

interface GiaTri {
  ma_bs: number
  ma_phong: number
  ca_lam: CaLam[]
  khoang: [Dayjs, Dayjs]
  thu: number[]
  thoi_luong: number
}

const THU = [1, 2, 3, 4, 5, 6].map((t) => ({ value: t, label: `T${t + 1}` }))

/** UC4.1: quản trị viên xếp ca cho bác sĩ theo khoảng ngày và các thứ trong tuần, khung giờ sinh tự động (UC4.3). */
export default function TaoCaLamViec({ macDinh, dsBs, onDong, onXong }: {
  macDinh: MacDinhTaoCa | null
  dsBs: BacSi[]
  onDong: () => void
  onXong: () => void
}) {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<GiaTri>()
  const [dsPhong, setDsPhong] = useState<PhongKham[]>([])
  const [dangGui, setDangGui] = useState(false)
  const maBs = Form.useWatch('ma_bs', form)
  const khoang = Form.useWatch('khoang', form)
  const caLam = Form.useWatch('ca_lam', form)
  const thoiLuong = Form.useWatch('thoi_luong', form)

  useEffect(() => {
    if (!macDinh) return
    const ngay = macDinh.ngay ?? dayjs().add(1, 'day')
    form.resetFields()
    form.setFieldsValue({
      ma_bs: macDinh.ma_bs, ca_lam: macDinh.ca ? [macDinh.ca] : ['SANG', 'CHIEU'],
      khoang: [ngay, macDinh.ngay ? ngay : ngay.add(6, 'day')], thu: [1, 2, 3, 4, 5, 6], thoi_luong: 15,
    })
  }, [macDinh, form])

  // Một ngày, một ca: hiện luôn phòng nào đang có bác sĩ khác dùng
  const motCa = khoang && khoang[0].isSame(khoang[1], 'day') && caLam?.length === 1
  const ngayKiemTra = motCa ? khoang[0].format('YYYY-MM-DD') : undefined
  const caKiemTra = motCa ? caLam[0] : undefined
  useEffect(() => {
    if (!maBs) {
      setDsPhong([])
      return
    }
    api.phongChoBacSi({ ma_bs: maBs, ngay: ngayKiemTra, ca_lam: caKiemTra }).then((ds) => {
      setDsPhong(ds)
      const hienTai = form.getFieldValue('ma_phong')
      if (!ds.some((p) => p.MaPhong === hienTai)) {
        form.setFieldValue('ma_phong', ds.find((p) => !p.BacSiDangDung)?.MaPhong)
      }
    }).catch(() => setDsPhong([]))
  }, [maBs, ngayKiemTra, caKiemTra, form])

  const gui = async (v: GiaTri) => {
    setDangGui(true)
    try {
      const kq = await api.taoCa({
        ma_bs: v.ma_bs, ma_phong: v.ma_phong, ca_lam: v.ca_lam, tu_ngay: v.khoang[0].format('YYYY-MM-DD'),
        den_ngay: v.khoang[1].format('YYYY-MM-DD'), thu: v.thu, thoi_luong: v.thoi_luong,
      })
      const boQua = kq.bo_qua.length > 0 && (
        <ul style={{ paddingInlineStart: 18, margin: '8px 0 0', maxHeight: 260, overflow: 'auto' }}>
          {kq.bo_qua.map((b) => (
            <li key={b.ngay + b.ca_lam}>{CA_LAM[b.ca_lam].ten} {thuNgay(b.ngay)}: {b.ly_do}</li>
          ))}
        </ul>
      )
      if (kq.so_ca === 0) {
        modal.warning({ title: 'Không tạo được ca nào', content: boQua || 'Không có ngày nào khớp các thứ đã chọn' })
        return
      }
      message.success(`Đã tạo ${kq.so_ca} ca, ${kq.so_khung_gio} khung giờ`)
      if (boQua) modal.info({ title: `Bỏ qua ${kq.bo_qua.length} ca`, content: boQua, width: 520 })
      onXong()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tạo được ca')
    } finally {
      setDangGui(false)
    }
  }

  return (
    <Modal title="Tạo ca làm việc" open={!!macDinh} onCancel={onDong} okText="Tạo ca" cancelText="Đóng"
      okButtonProps={{ loading: dangGui }} onOk={() => form.submit()} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={gui} requiredMark={false}>
        <Form.Item name="ma_bs" label="Bác sĩ" rules={[{ required: true, message: 'Chọn bác sĩ' }]}>
          <Select showSearch={{ optionFilterProp: 'label' }} placeholder="Chọn bác sĩ"
            options={dsBs.map((b) => ({ value: b.MaBS, label: `${b.HoTen} – ${b.TenCK}` }))} />
        </Form.Item>
        <Form.Item name="ma_phong" label="Phòng khám" rules={[{ required: true, message: 'Chọn phòng' }]}
          extra={maBs && dsPhong.length === 0 ? 'Chuyên khoa của bác sĩ chưa có phòng khám bệnh' : undefined}>
          <Select placeholder="Chọn phòng" disabled={!maBs} options={dsPhong.map((p) => ({
            value: p.MaPhong, disabled: !!p.BacSiDangDung,
            label: `${p.MaSoPhong} – ${p.TenPhong}${p.BacSiDangDung ? ` (đã xếp cho ${p.BacSiDangDung})` : ''}`,
          }))} />
        </Form.Item>
        <Form.Item name="ca_lam" label="Ca" rules={[{ required: true, message: 'Chọn ít nhất một ca' }]}>
          <Checkbox.Group options={DS_CA_LAM.map((c) => ({
            value: c, label: `${CA_LAM[c].ten} (${CA_LAM[c].batDau} – ${CA_LAM[c].ketThuc})`,
          }))} />
        </Form.Item>
        <Form.Item name="khoang" label="Từ ngày – đến ngày" rules={[{ required: true, message: 'Chọn khoảng ngày' }]}>
          <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} allowClear={false}
            disabledDate={(d) => d.isBefore(dayjs(), 'day') || d.isAfter(dayjs().add(90, 'day'))} />
        </Form.Item>
        <Form.Item name="thu" label="Các thứ trong tuần" rules={[{ required: true, message: 'Chọn ít nhất một thứ' }]}>
          <Checkbox.Group options={THU} />
        </Form.Item>
        <Form.Item name="thoi_luong" label="Thời lượng mỗi khung giờ"
          rules={[{ required: true, message: 'Nhập thời lượng' }, quyTac.thoiLuongKhung]}
          extra={thoiLuong ? DS_CA_LAM.map((c) => `${CA_LAM[c].ten}: ${soKhungGio(c, thoiLuong)} khung giờ`).join(' · ') : undefined}>
          <InputNumber min={5} max={60} step={5} suffix="phút" style={{ width: 140 }} />
        </Form.Item>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Ngày bác sĩ đã có ca hoặc phòng đã xếp cho người khác sẽ được bỏ qua. Bác sĩ nhận thông báo lịch mới.
        </Typography.Text>
      </Form>
    </Modal>
  )
}
