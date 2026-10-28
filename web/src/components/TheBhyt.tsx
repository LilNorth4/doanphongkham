import { IdcardOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, App, Button, Col, Descriptions, Empty, Flex, Form, Input, Modal, Row, Space, Tag, Typography, type InputRef } from 'antd'
import ONhapNgay from '@/components/ONhapNgay'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { api, LoiApi, type TheBHYT, type TraCuuBhyt } from '@/lib/api'

/** Độ dài 4 ô của số thẻ: mã đối tượng, mức hưởng, mã tỉnh, mã số BHXH. */
const O = [2, 1, 2, 10]
const MAU_O = [/[^A-Za-z]/g, /[^1-5]/g, /[^0-9]/g, /[^0-9]/g]
export const DINH_DANG_THE = /^[A-Z]{2}[1-5]\d{2}\d{10}$/

/** Ý nghĩa mã mức hưởng (ô 2) theo QĐ 1351/QĐ-BHXH. */
export const MUC_HUONG: Record<number, string> = {
  1: '100%, không giới hạn tỷ lệ thuốc, dịch vụ kỹ thuật',
  2: '100% trong phạm vi BHYT (có giới hạn tỷ lệ)',
  3: '95%; 100% nếu chi phí một lần khám dưới 15% lương cơ sở',
  4: '80%; 100% nếu chi phí một lần khám dưới 15% lương cơ sở',
  5: '100%, kể cả chi phí ngoài phạm vi BHYT',
}

/** Tách số thẻ 15 ký tự thành 4 ô để hiển thị: "DN 4 19 0123456789". */
export const tachThe = (s: string) => {
  let i = 0
  return O.map((n) => { const p = s.slice(i, i + n); i += n; return p })
}

/** Ô nhập số thẻ BHYT chia 4 ô như in trên thẻ, tự nhảy ô; dán cả chuỗi 15 ký tự cũng được. Dùng trong Form.Item. */
export function ONhapSoThe({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  // Giữ riêng từng ô: ô trước chưa đủ ký tự thì không thể tách lại từ chuỗi ghép
  const [o, setO] = useState(() => tachThe((value ?? '').toUpperCase()))
  useEffect(() => {
    if ((value ?? '') !== o.join('')) setO(tachThe((value ?? '').toUpperCase()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const refs = useRef<(InputRef | null)[]>([])
  const doi = (i: number, raw: string) => {
    const sach = raw.replace(/[\s.-]/g, '').toUpperCase()
    // Dán nguyên số thẻ vào ô đầu
    if (i === 0 && sach.length > O[0]) {
      const moi = tachThe(sach.slice(0, 15))
      setO(moi)
      onChange?.(moi.join(''))
      return
    }
    const moi = [...o]
    moi[i] = sach.replace(MAU_O[i], '').slice(0, O[i])
    setO(moi)
    onChange?.(moi.join(''))
    if (moi[i].length === O[i] && i < 3) refs.current[i + 1]?.focus()
  }
  const cls = { textAlign: 'center' as const, fontFamily: 'monospace', letterSpacing: 1 }
  return (
    <Space.Compact style={{ width: '100%' }}>
      {O.map((n, i) => (
        <Input key={i} ref={(r) => { refs.current[i] = r }} value={o[i]} onChange={(e) => doi(i, e.target.value)}
          placeholder={['DN', '4', '19', '0123456789'][i]} maxLength={i === 0 ? 15 : n}
          inputMode={i === 0 ? 'text' : 'numeric'} aria-label={['Mã đối tượng', 'Mức hưởng', 'Mã tỉnh', 'Mã số BHXH'][i]}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !o[i] && i > 0) refs.current[i - 1]?.focus() }}
          style={{ ...cls, width: i === 3 ? '46%' : i === 1 ? '14%' : '20%' }} />
      ))}
    </Space.Compact>
  )
}

export interface GiaTriThe {
  so_the?: string; tu_ngay?: Dayjs; den_ngay?: Dayjs; noi_dkkcb?: string
  ngay_du_5_nam?: Dayjs | null; mien_cung_chi_tra_tu?: Dayjs | null
}

/** Chuyển giá trị form sang dữ liệu gửi API (null nếu không nhập số thẻ). */
export function theGuiApi(v?: GiaTriThe) {
  if (!v?.so_the) return null
  const ngay = (d?: Dayjs | null) => (d ? d.format('YYYY-MM-DD') : null)
  return {
    so_the: v.so_the, tu_ngay: ngay(v.tu_ngay), den_ngay: ngay(v.den_ngay), noi_dkkcb: v.noi_dkkcb?.trim() || null,
    ngay_du_5_nam: ngay(v.ngay_du_5_nam), mien_cung_chi_tra_tu: ngay(v.mien_cung_chi_tra_tu),
  }
}

/**
 * Các trường thẻ BHYT trong một Form (đặt dưới tiền tố `ten`, VD ['the_bhyt']). Nhập đủ 15 ký tự thì tra cổng giám định
 * giả lập để giải mã 4 ô; thẻ đã có trên cổng thì điền sẵn hạn thẻ, nơi đăng ký. batBuoc = false: bỏ trống nếu không có thẻ.
 */
export function CacTruongThe({ ten = [], batBuoc = true }: { ten?: string[]; batBuoc?: boolean }) {
  const form = Form.useFormInstance()
  const soThe: string | undefined = Form.useWatch([...ten, 'so_the'], form)
  const [tc, setTc] = useState<TraCuuBhyt | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  useEffect(() => {
    setTc(null)
    setLoi(null)
    if (!soThe || soThe.length !== 15) return
    let huy = false
    api.traCuuBhyt(soThe).then((d) => {
      if (huy) return
      setTc(d)
      if (d.TrenCong) {
        form.setFieldValue([...ten, 'tu_ngay'], dayjs(d.TrenCong.NgayBatDau))
        form.setFieldValue([...ten, 'den_ngay'], dayjs(d.TrenCong.NgayHetHan))
        form.setFieldValue([...ten, 'noi_dkkcb'], d.TrenCong.NoiDKKCB ?? undefined)
      }
    }).catch((e) => { if (!huy) setLoi(e instanceof LoiApi ? e.message : 'Không tra cứu được thẻ') })
    return () => { huy = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soThe])

  const coThe = !!soThe
  const canNhap = batBuoc || coThe
  return (
    <Row gutter={12}>
      <Col span={24}>
        <Form.Item name={[...ten, 'so_the']} label="Số thẻ BHYT (15 ký tự)"
          extra="Mã đối tượng · mức hưởng (1-5) · mã tỉnh · mã số BHXH 10 số, như in trên thẻ hoặc VssID"
          rules={[
            { required: batBuoc, message: 'Nhập số thẻ BHYT' },
            { pattern: DINH_DANG_THE, message: 'Số thẻ gồm 2 chữ, 1 số mức hưởng (1-5), 2 số mã tỉnh, 10 số mã BHXH' },
            { validator: () => (loi ? Promise.reject(new Error(loi)) : Promise.resolve()) },
          ]}>
          <ONhapSoThe />
        </Form.Item>
      </Col>
      {loi && <Col span={24}><Alert type="error" showIcon title={loi} style={{ marginBottom: 12 }} /></Col>}
      {tc && (
        <Col span={24}>
          <Alert type={tc.TrenCong ? 'success' : 'info'} showIcon style={{ marginBottom: 12 }}
            title={<>{tc.TenDoiTuong} ({tc.MaDoiTuong}) · mức {tc.MaMucHuong}: hưởng {MUC_HUONG[tc.MaMucHuong]}</>}
            description={<>Tỉnh phát hành {tc.MaTinh} · mã số BHXH {tc.MaSoBHXH}.{' '}
              {tc.TrenCong ? `Đã có trên cổng giám định (giả lập), thẻ của ${tc.TrenCong.HoTen}.`
                : 'Chưa có trên cổng giám định (giả lập): nhập hạn thẻ theo thẻ giấy.'}</>} />
        </Col>
      )}
      <Col xs={12}>
        <Form.Item name={[...ten, 'tu_ngay']} label="Giá trị từ ngày" rules={[{ required: canNhap, message: 'Nhập ngày bắt đầu' }]}>
          <ONhapNgay style={{ width: '100%' }} disabled={!coThe} />
        </Form.Item>
      </Col>
      <Col xs={12}>
        <Form.Item name={[...ten, 'den_ngay']} label="Đến ngày" dependencies={[[...ten, 'tu_ngay']]}
          rules={[{ required: canNhap, message: 'Nhập ngày hết hạn' }, ({ getFieldValue }) => ({
            validator: (_, v?: Dayjs) => {
              const tu: Dayjs | undefined = getFieldValue([...ten, 'tu_ngay'])
              return !v || !tu || !v.isBefore(tu) ? Promise.resolve() : Promise.reject(new Error('Phải sau ngày bắt đầu'))
            },
          })]}>
          <ONhapNgay style={{ width: '100%' }} disabled={!coThe} />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name={[...ten, 'noi_dkkcb']} label="Nơi đăng ký KCB ban đầu">
          <Input maxLength={150} disabled={!coThe} placeholder="VD: Phòng khám Đa khoa Việt Bắc" />
        </Form.Item>
      </Col>
      <Col xs={12}>
        <Form.Item name={[...ten, 'ngay_du_5_nam']} label="Thời điểm đủ 5 năm liên tục" extra="In trên thẻ, nếu có">
          <ONhapNgay style={{ width: '100%' }} disabled={!coThe} />
        </Form.Item>
      </Col>
      <Col xs={12}>
        <Form.Item name={[...ten, 'mien_cung_chi_tra_tu']} label="Giấy miễn cùng chi trả từ ngày"
          extra="Hiệu lực đến 31/12 cùng năm; chỉ mức 3, 4">
          <ONhapNgay style={{ width: '100%' }} disabled={!coThe || (tc != null && tc.MaMucHuong !== 3 && tc.MaMucHuong !== 4)} />
        </Form.Item>
      </Col>
    </Row>
  )
}

/** Thẻ BHYT dạng chỉ đọc: 4 ô số thẻ, đối tượng, mức hưởng, hạn thẻ. */
export function XemThe({ the }: { the: TheBHYT }) {
  return (
    <Descriptions size="small" column={1} bordered styles={{ label: { width: 170 } }} items={[
      {
        key: 'so', label: 'Số thẻ',
        children: <Flex gap={6} wrap align="center">
          {tachThe(the.MaThe).map((p, i) => <Tag key={i} style={{ fontFamily: 'monospace', fontSize: 14, marginInlineEnd: 0 }}>{p}</Tag>)}
          {the.ConHan ? <Tag color="green">Còn hạn</Tag> : <Tag color="red">Hết hạn / chưa có hiệu lực</Tag>}
        </Flex>,
      },
      { key: 'dt', label: 'Đối tượng', children: `${the.TenDoiTuong} (${the.MaDoiTuong})` },
      { key: 'mh', label: 'Mức hưởng', children: <>Mức {the.MaMucHuong}: {MUC_HUONG[the.MaMucHuong]}</> },
      { key: 'hl', label: 'Giá trị sử dụng', children: `${dayjs(the.NgayBatDau).format('DD/MM/YYYY')} - ${dayjs(the.NgayHetHan).format('DD/MM/YYYY')}` },
      { key: 'nd', label: 'Nơi ĐK KCB ban đầu', children: the.NoiDKKCB ?? '—' },
      ...(the.NgayDu5NamLienTuc ? [{ key: '5n', label: 'Đủ 5 năm liên tục', children: dayjs(the.NgayDu5NamLienTuc).format('DD/MM/YYYY') }] : []),
      ...(the.MienCungChiTraTu ? [{
        key: 'mien', label: 'Miễn cùng chi trả',
        children: <>Từ {dayjs(the.MienCungChiTraTu).format('DD/MM/YYYY')} đến 31/12/{dayjs(the.MienCungChiTraTu).year()}
          {the.MienCungChiTra && <Tag color="green" style={{ marginInlineStart: 6 }}>Đang hiệu lực</Tag>}</>,
      }] : []),
    ]} />
  )
}

/** Nút mở hộp quản lý thẻ BHYT của một bệnh nhân (lễ tân): xem các thẻ, nhập thẻ mới, gia hạn / sửa thẻ. */
export function NutTheBhyt({ maBn, hoTen, onXong, size = 'small' }: {
  maBn: number; hoTen: string; onXong?: () => void; size?: 'small' | 'middle'
}) {
  const { message } = App.useApp()
  const [mo, setMo] = useState(false)
  const [ds, setDs] = useState<TheBHYT[]>([])
  const [nhap, setNhap] = useState(false)
  const [dangLuu, setDangLuu] = useState(false)
  const [form] = Form.useForm<GiaTriThe>()
  const tai = () => api.theBhyt(maBn).then(setDs).catch(() => setDs([]))
  const moHop = () => { setMo(true); setNhap(false); tai() }
  const sua = (t?: TheBHYT) => {
    form.resetFields()
    if (t) {
      form.setFieldsValue({
        so_the: t.MaThe, tu_ngay: dayjs(t.NgayBatDau), den_ngay: dayjs(t.NgayHetHan), noi_dkkcb: t.NoiDKKCB ?? undefined,
        ngay_du_5_nam: t.NgayDu5NamLienTuc ? dayjs(t.NgayDu5NamLienTuc) : null,
        mien_cung_chi_tra_tu: t.MienCungChiTraTu ? dayjs(t.MienCungChiTraTu) : null,
      })
    }
    setNhap(true)
  }
  const luu = async (v: GiaTriThe) => {
    setDangLuu(true)
    try {
      await api.luuTheBhyt(maBn, theGuiApi(v)!)
      message.success('Đã lưu thẻ BHYT')
      setNhap(false)
      await tai()
      onXong?.()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không lưu được thẻ')
    } finally {
      setDangLuu(false)
    }
  }
  return (
    <>
      <Button size={size} icon={<IdcardOutlined />} onClick={(e) => { e.stopPropagation(); moHop() }}>Thẻ BHYT</Button>
      <Modal title={`Thẻ BHYT · ${hoTen}`} open={mo} onCancel={() => setMo(false)} width={620} destroyOnHidden
        footer={nhap
          ? [<Button key="h" onClick={() => setNhap(false)}>Quay lại</Button>,
            <Button key="l" type="primary" loading={dangLuu} onClick={() => form.submit()}>Lưu thẻ</Button>]
          : [<Button key="d" onClick={() => setMo(false)}>Đóng</Button>]}>
        {nhap ? (
          <Form form={form} layout="vertical" onFinish={luu} requiredMark="optional">
            <CacTruongThe />
          </Form>
        ) : (
          <Flex vertical gap={12}>
            {ds.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thẻ BHYT" />}
            {ds.map((t) => (
              <div key={t.MaThe}>
                <XemThe the={t} />
                <Button type="link" size="small" style={{ paddingInline: 0 }} onClick={() => sua(t)}>Gia hạn / sửa thẻ này</Button>
              </div>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => sua()}>Nhập thẻ mới</Button>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Cổng giám định BHXH đang giả lập: hệ thống kiểm tra định dạng, mã đối tượng khớp mức hưởng và hạn thẻ khi check-in.
            </Typography.Text>
          </Flex>
        )}
      </Modal>
    </>
  )
}
