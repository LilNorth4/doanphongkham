import { PaperClipOutlined, PlusOutlined, ReloadOutlined, SmileOutlined } from '@ant-design/icons'
import {
  Alert, App, Button, Card, Descriptions, Drawer, Empty, Flex, Form, Input, List, Result, Segmented, Select, Skeleton, Tag,
  Typography, Upload, type UploadFile,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useManHinhNho } from '@/hooks/manHinh'
import { api, LoiApi, type DongGopY, type LoaiGopY, type PhieuGopY } from '@/lib/api'
import { CHU_DE_GOP_Y, HAN_PHAN_HOI_GOP_Y, TEN_LOAI_GOP_Y, TRANG_THAI_GOP_Y } from '@/lib/hangSo'

const SO_TEP_TOI_DA = 3
const LOAI_NHAN = ['image/jpeg', 'image/png', 'application/pdf']

/**
 * UC12.2: bệnh nhân gửi góp ý hoặc khiếu nại (chủ đề, lượt khám liên quan, tệp đính kèm), theo dõi trạng thái,
 * gửi thêm thông tin hoặc xác nhận hài lòng để đóng phiếu. Mở từ thông báo: /gop-y?phieu=123.
 */
export default function GopYCuaToi() {
  const { message } = App.useApp()
  const nho = useManHinhNho()
  const [params, setParams] = useSearchParams()
  const [ds, setDs] = useState<DongGopY[] | null>(null)
  const [moGui, setMoGui] = useState(false)
  const [xem, setXem] = useState<PhieuGopY | null>(null)

  const tai = useCallback(() => {
    api.gopYCuaToi().then(setDs).catch((e) => message.error(e instanceof LoiApi ? e.message : 'Không tải được phiếu góp ý'))
  }, [message])
  useEffect(() => { tai() }, [tai])

  const moXem = useCallback(async (ma: number) => {
    try {
      setXem(await api.phieuGopYCuaToi(ma))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được phiếu')
    }
  }, [message])

  useEffect(() => {
    const ma = Number(params.get('phieu'))
    if (ma) moXem(ma)
  }, [params, moXem])

  const dongXem = () => {
    setXem(null)
    if (params.get('phieu')) setParams({}, { replace: true })
  }

  return (
    <Card>
      <Flex justify="space-between" align="center" gap={8} wrap style={{ marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Góp ý – Khiếu nại</Typography.Title>
        <Flex gap={8}>
          <Button icon={<ReloadOutlined />} onClick={tai} aria-label="Làm mới" />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setMoGui(true)}>Gửi góp ý</Button>
        </Flex>
      </Flex>
      {ds === null ? <Skeleton active /> : ds.length === 0 ? (
        <Empty description="Bạn chưa gửi góp ý nào">
          <Button type="primary" onClick={() => setMoGui(true)}>Gửi góp ý đầu tiên</Button>
        </Empty>
      ) : (
        <List dataSource={ds} renderItem={(g) => (
          <List.Item style={{ cursor: 'pointer' }} onClick={() => moXem(g.MaPhieu)}
            extra={<Button type="link" onClick={(e) => { e.stopPropagation(); moXem(g.MaPhieu) }}>Xem</Button>}>
            <List.Item.Meta
              title={<Flex gap={8} wrap align="center">
                <span>{g.ChuDe}</span>
                <Tag color={g.Loai === 'KHIEU_NAI' ? 'volcano' : 'geekblue'}>{TEN_LOAI_GOP_Y[g.Loai]}</Tag>
                <Tag color={TRANG_THAI_GOP_Y[g.TrangThai].mau}>{TRANG_THAI_GOP_Y[g.TrangThai].ten}</Tag>
              </Flex>}
              description={<span style={{ fontSize: 13 }}>
                {g.MaSoPhieu} · gửi {dayjs(g.ThoiDiemGui).format('HH:mm DD/MM/YYYY')}
                {g.MaLichHen && ` · lượt ${g.MaLichHen}`}
                {(g.TrangThai === 'MOI' || g.TrangThai === 'DANG_XU_LY') && ` · phản hồi trước ${dayjs(g.HanPhanHoi).format('HH:mm DD/MM')}`}
              </span>} />
          </List.Item>
        )} />
      )}

      <Drawer open={moGui} onClose={() => setMoGui(false)} size={nho ? '100%' : 560} title="Gửi góp ý, khiếu nại" destroyOnHidden>
        <BieuMauGui onDaGui={(ma) => { tai(); setMoGui(false); moXem(ma) }} />
      </Drawer>

      <Drawer open={!!xem} onClose={dongXem} size={nho ? '100%' : 600} title={xem ? `Phiếu ${xem.MaSoPhieu}` : ''} destroyOnHidden>
        {xem && <ChiTiet p={xem} onDoi={() => { tai(); moXem(xem.MaPhieu) }} />}
      </Drawer>
    </Card>
  )
}

function BieuMauGui({ onDaGui }: { onDaGui: (maPhieu: number) => void }) {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<{ loai: LoaiGopY; chu_de: string; ma_lk?: number; noi_dung: string }>()
  const [luot, setLuot] = useState<{ value: number; label: string }[]>([])
  const [tep, setTep] = useState<UploadFile[]>([])
  const [dangGui, setDangGui] = useState(false)

  useEffect(() => {
    api.luotKhamGopY().then((ds) => setLuot(ds.map((l) => ({
      value: l.MaLK, label: `${dayjs(l.NgayKham).format('DD/MM/YYYY')} · ${l.BacSi}${l.TenCK ? ` (${l.TenCK})` : ''}`,
    })))).catch(() => {})
  }, [])

  const gui = async (v: { loai: LoaiGopY; chu_de: string; ma_lk?: number; noi_dung: string }) => {
    setDangGui(true)
    try {
      const kq = await api.guiGopY({ ...v, noi_dung: v.noi_dung.trim() }, tep.map((t) => t.originFileObj as File))
      modal.success({
        title: `Đã gửi phiếu ${kq.ma_so_phieu}`,
        content: `Phòng khám sẽ phản hồi trước ${dayjs(kq.han_phan_hoi).format('HH:mm DD/MM/YYYY')}. Bạn sẽ nhận thông báo khi có phản hồi.`,
      })
      onDaGui(kq.ma_phieu)
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không gửi được phiếu')
    } finally {
      setDangGui(false)
    }
  }

  return (
    <Form form={form} layout="vertical" initialValues={{ loai: 'GOP_Y' }} onFinish={gui} requiredMark="optional">
      <Form.Item name="loai" label="Loại phiếu" rules={[{ required: true }]}>
        <Segmented block options={[{ value: 'GOP_Y', label: 'Góp ý' }, { value: 'KHIEU_NAI', label: 'Khiếu nại' }]} />
      </Form.Item>
      <Form.Item name="chu_de" label="Chủ đề" rules={[{ required: true, message: 'Chọn chủ đề' }]}>
        <Select placeholder="Chọn chủ đề" options={CHU_DE_GOP_Y.map((c) => ({ value: c, label: c }))} />
      </Form.Item>
      <Form.Item name="ma_lk" label="Lượt khám liên quan" extra="Không bắt buộc, giúp phòng khám tra cứu nhanh hơn">
        <Select allowClear placeholder="Chọn lượt khám" options={luot} notFoundContent="Không có lượt khám trong 90 ngày gần đây" />
      </Form.Item>
      <Form.Item name="noi_dung" label="Nội dung" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập nội dung' }]}>
        <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} maxLength={5000} showCount
          placeholder="Mô tả cụ thể sự việc, thời gian, địa điểm để phòng khám xử lý chính xác" />
      </Form.Item>
      <Form.Item label="Tệp đính kèm" extra={`Tối đa ${SO_TEP_TOI_DA} tệp JPG, PNG hoặc PDF, mỗi tệp 5 MB`}>
        <Upload accept=".jpg,.jpeg,.png,.pdf" fileList={tep} maxCount={SO_TEP_TOI_DA} multiple
          beforeUpload={(f) => {
            if (!LOAI_NHAN.includes(f.type)) { message.error('Chỉ nhận tệp JPG, PNG, PDF'); return Upload.LIST_IGNORE }
            if (f.size > 5 * 1024 * 1024) { message.error('Tệp tối đa 5 MB'); return Upload.LIST_IGNORE }
            return false
          }}
          onChange={({ fileList }) => setTep(fileList.slice(0, SO_TEP_TOI_DA))}>
          {tep.length < SO_TEP_TOI_DA && <Button icon={<PaperClipOutlined />}>Chọn tệp</Button>}
        </Upload>
      </Form.Item>
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        title={`Phòng khám cam kết phản hồi trong vòng ${HAN_PHAN_HOI_GOP_Y} giờ.`} />
      <Button type="primary" htmlType="submit" size="large" block loading={dangGui}>Gửi</Button>
    </Form>
  )
}

function ChiTiet({ p, onDoi }: { p: PhieuGopY; onDoi: () => void }) {
  const { message, modal } = App.useApp()
  const [boSung, setBoSung] = useState('')
  const [dangGui, setDangGui] = useState(false)

  const guiBoSung = async () => {
    if (!boSung.trim()) { message.warning('Nhập nội dung cần bổ sung'); return }
    setDangGui(true)
    try {
      await api.boSungGopY(p.MaPhieu, boSung.trim())
      setBoSung('')
      message.success('Đã gửi thông tin bổ sung')
      onDoi()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không gửi được')
    } finally {
      setDangGui(false)
    }
  }

  const haiLong = () => modal.confirm({
    title: 'Xác nhận hài lòng và đóng phiếu?',
    content: 'Sau khi đóng, bạn không gửi thêm thông tin vào phiếu này được nữa.',
    okText: 'Đóng phiếu',
    onOk: async () => {
      try {
        await api.haiLongGopY(p.MaPhieu)
        message.success('Cảm ơn bạn! Phiếu đã được đóng.')
        onDoi()
      } catch (e) {
        message.error(e instanceof LoiApi ? e.message : 'Không đóng được phiếu')
      }
    },
  })

  const tt = TRANG_THAI_GOP_Y[p.TrangThai]
  return (
    <Flex vertical gap={16}>
      <Descriptions size="small" column={1} bordered items={[
        { label: 'Loại', children: <Tag color={p.Loai === 'KHIEU_NAI' ? 'volcano' : 'geekblue'}>{TEN_LOAI_GOP_Y[p.Loai]}</Tag> },
        { label: 'Chủ đề', children: p.ChuDe },
        { label: 'Trạng thái', children: <Tag color={tt.mau}>{tt.ten}</Tag> },
        { label: 'Gửi lúc', children: dayjs(p.ThoiDiemGui).format('HH:mm DD/MM/YYYY') },
        ...(p.TrangThai === 'MOI' || p.TrangThai === 'DANG_XU_LY'
          ? [{ label: 'Hạn phản hồi', children: dayjs(p.HanPhanHoi).format('HH:mm DD/MM/YYYY') }] : []),
        ...(p.MaLichHen ? [{ label: 'Lượt khám', children: `${p.MaLichHen} · ${dayjs(p.NgayKham).format('DD/MM/YYYY')} · ${p.BacSi}` }] : []),
      ]} />
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Nội dung</Typography.Text>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{p.NoiDung}</Typography.Paragraph>
      </div>
      {p.Tep.length > 0 && (
        <Flex vertical gap={4}>
          {p.Tep.map((t) => (
            <a key={t.MaTep} href={t.DuongDan} target="_blank" rel="noreferrer"><PaperClipOutlined /> {t.TenTep}</a>
          ))}
        </Flex>
      )}

      <div>
        <Typography.Title level={5} style={{ marginTop: 0 }}>Trao đổi</Typography.Title>
        {p.TraoDoi.length === 0
          ? <Typography.Text type="secondary">Phòng khám chưa phản hồi. Bạn sẽ nhận thông báo khi có phản hồi.</Typography.Text>
          : <DongTraoDoi ds={p.TraoDoi} benhNhanBenPhai />}
      </div>

      {p.TrangThai === 'DA_PHAN_HOI' && (
        <Result style={{ padding: 0 }} icon={<SmileOutlined />} title="Bạn hài lòng với phản hồi?"
          subTitle="Phiếu tự đóng sau 7 ngày nếu bạn không gửi thêm thông tin."
          extra={<Button type="primary" onClick={haiLong}>Hài lòng, đóng phiếu</Button>} />
      )}
      {p.TrangThai !== 'DA_DONG' ? (
        <Flex vertical gap={8}>
          <Input.TextArea value={boSung} onChange={(e) => setBoSung(e.target.value)} autoSize={{ minRows: 2, maxRows: 6 }}
            maxLength={5000} placeholder="Gửi thêm thông tin cho phòng khám" />
          <Button onClick={guiBoSung} loading={dangGui} disabled={!boSung.trim()}>Gửi bổ sung</Button>
        </Flex>
      ) : (
        <Typography.Text type="secondary">Phiếu đã đóng{p.ThoiDiemDong && ` lúc ${dayjs(p.ThoiDiemDong).format('HH:mm DD/MM/YYYY')}`}.</Typography.Text>
      )}
    </Flex>
  )
}

/** Dòng trao đổi dạng hội thoại; ghi chú nội bộ (chỉ quản trị viên thấy) tô vàng. */
export function DongTraoDoi({ ds, benhNhanBenPhai }: { ds: PhieuGopY['TraoDoi']; benhNhanBenPhai?: boolean }) {
  return (
    <Flex vertical gap={10}>
      {ds.map((t) => {
        const cuaBn = !!Number(t.CuaBenhNhan)
        const noiBo = t.Loai === 'GHI_CHU_NOI_BO'
        const benPhai = benhNhanBenPhai ? cuaBn : !cuaBn
        return (
          <Flex key={t.MaTD} justify={benPhai ? 'flex-end' : 'flex-start'}>
            <div style={{
              maxWidth: '85%', padding: '8px 12px', borderRadius: 10,
              background: noiBo ? '#FFF7E0' : benPhai ? '#E6F4F1' : '#F2F4F7',
              border: noiBo ? '1px dashed #E3B341' : undefined,
            }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {noiBo ? 'Ghi chú nội bộ · ' : ''}{cuaBn ? (benhNhanBenPhai ? 'Bạn' : t.NguoiGui) : (benhNhanBenPhai ? 'Phòng khám' : t.NguoiGui)}
                {' · '}{dayjs(t.ThoiGian).format('HH:mm DD/MM')}
              </Typography.Text>
              <div style={{ whiteSpace: 'pre-wrap', color: '#1D2939' }}>{t.NoiDung}</div>
            </div>
          </Flex>
        )
      })}
    </Flex>
  )
}
