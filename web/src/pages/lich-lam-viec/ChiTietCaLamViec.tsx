import { LockOutlined, UnlockOutlined } from '@ant-design/icons'
import {
  Alert, App, AutoComplete, Button, Card, Checkbox, Descriptions, Drawer, Flex, Form, Modal, Select, Skeleton,
  Tag, Typography, theme,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { api, LoiApi, type ChiTietCa, type KhungGioCa, type PhongKham } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { CA_LAM, moc, thuNgay, TRANG_THAI_KHUNG_GIO, TRANG_THAI_LICH_HEN } from '@/lib/hangSo'

const LY_DO_KHOA = ['Họp chuyên môn', 'Bận việc cá nhân', 'Hội chẩn', 'Đào tạo']
const LY_DO_HUY_CA = ['Bác sĩ nghỉ ốm', 'Bác sĩ đi công tác, hội thảo', 'Bác sĩ nghỉ phép', 'Phòng khám bảo trì']

/** Một ca: khung giờ và người đặt; khóa/mở khung giờ (bác sĩ của ca hoặc quản trị viên), đổi phòng và hủy ca. */
export default function ChiTietCaLamViec({ maCa, onDong, onDoi }: {
  maCa: number | null
  onDong: () => void
  /** Ca bị thay đổi: trang cha tải lại lịch tuần */
  onDoi: () => void
}) {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const { nguoiDung } = usePhien()
  const [ca, setCa] = useState<ChiTietCa | null>(null)
  const [chon, setChon] = useState<number[]>([])
  const [dsPhong, setDsPhong] = useState<PhongKham[]>([])
  const [moKhoa, setMoKhoa] = useState(false)
  const [moHuy, setMoHuy] = useState(false)
  const [dangGui, setDangGui] = useState(false)
  const [formKhoa] = Form.useForm<{ ly_do: string }>()
  const [formHuy] = Form.useForm<{ ly_do: string }>()

  const quanLy = !!nguoiDung?.Quyen.includes('LICH_LV.QUAN_LY')
  const coQuyenKhoa = !!nguoiDung?.Quyen.includes('KHUNG_GIO.KHOA') && (quanLy || ca?.MaBS === nguoiDung?.MaNV)

  const tai = useCallback(async () => {
    if (maCa == null) return
    try {
      setCa(await api.chiTietCa(maCa))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được ca làm việc')
      onDong()
    }
  }, [maCa, message, onDong])

  useEffect(() => {
    setCa(null)
    setChon([])
    tai()
  }, [tai])

  useEffect(() => {
    if (!ca || !quanLy) return
    api.phongChoBacSi({ ma_bs: ca.MaBS, ngay: ca.NgayLam, ca_lam: ca.CaLam }).then(setDsPhong).catch(() => setDsPhong([]))
  }, [ca, quanLy])

  const chay = async (viec: () => Promise<unknown>, thanhCong: string, taiLai = true) => {
    setDangGui(true)
    try {
      await viec()
      message.success(thanhCong)
      setChon([])
      onDoi()
      return true
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Thao tác thất bại')
      return false
    } finally {
      setDangGui(false)
      if (taiLai) tai()
    }
  }

  const ketThuc = ca ? moc(ca.NgayLam, CA_LAM[ca.CaLam].ketThuc) : null
  const daKetThuc = !!ketThuc && ketThuc.isBefore(dayjs())
  const conHan = (k: KhungGioCa) => ca != null && moc(ca.NgayLam, k.GioKetThuc).isAfter(dayjs())
  const chonDuoc = (k: KhungGioCa) => coQuyenKhoa && conHan(k) && (k.TrangThai === 'TRONG' || k.TrangThai === 'DA_KHOA')
  const dsKg = ca?.KhungGio ?? []
  // Khung giờ đã bắt đầu không còn đặt được nên không tính là "Trống" (khớp SoTrong ở lịch tuần)
  const daQua = (k: KhungGioCa) => ca != null && !moc(ca.NgayLam, k.GioBatDau).isAfter(dayjs())
  const dem = (tt: KhungGioCa['TrangThai']) => dsKg.filter((k) => k.TrangThai === tt && !(tt === 'TRONG' && daQua(k))).length
  const chonTrong = chon.filter((m) => dsKg.find((k) => k.MaKG === m)?.TrangThai === 'TRONG')
  const chonKhoa = chon.filter((m) => dsKg.find((k) => k.MaKG === m)?.TrangThai === 'DA_KHOA')
  const soLichHen = dsKg.filter((k) => k.MaLK && (k.TrangThaiLichHen === 'CHO_XAC_NHAN' || k.TrangThaiLichHen === 'DA_XAC_NHAN')).length
  const daNghi = dsKg.length > 0 && dem('DA_KHOA') === dsKg.length

  return (
    <Drawer open={maCa != null} onClose={onDong} size="min(560px, 100vw)" destroyOnHidden
      title={ca ? `${CA_LAM[ca.CaLam].ten} · ${thuNgay(ca.NgayLam)}` : 'Ca làm việc'}>
      {!ca ? <Skeleton active /> : (
        <Flex vertical gap={16}>
          <Descriptions size="small" column={1} items={[
            { key: 'bs', label: 'Bác sĩ', children: <b>{ca.BacSi}</b> },
            { key: 'ck', label: 'Chuyên khoa', children: ca.TenCK },
            {
              key: 'phong', label: 'Phòng',
              children: quanLy && !daKetThuc && !daNghi ? (
                <Select size="small" style={{ minWidth: 240, maxWidth: '100%' }} value={ca.MaPhong} loading={dangGui}
                  onChange={(p) => chay(() => api.doiPhongCa(ca.MaCa, p), 'Đã đổi phòng, bệnh nhân đã đặt được báo phòng mới')}
                  options={(dsPhong.length ? dsPhong : [{ MaPhong: ca.MaPhong, MaSoPhong: ca.MaSoPhong, TenPhong: ca.TenPhong, BacSiDangDung: null }])
                    .map((p) => ({
                      value: p.MaPhong, disabled: p.MaPhong !== ca.MaPhong && !!p.BacSiDangDung,
                      label: `${p.MaSoPhong} – ${p.TenPhong}${p.MaPhong !== ca.MaPhong && p.BacSiDangDung ? ` (${p.BacSiDangDung})` : ''}`,
                    }))} />
              ) : `${ca.MaSoPhong} – ${ca.TenPhong}`,
            },
            { key: 'gio', label: 'Giờ làm', children: `${CA_LAM[ca.CaLam].batDau} – ${CA_LAM[ca.CaLam].ketThuc} · ${ca.ThoiLuongKhungGio} phút/khung` },
            ...(ca.MaDK ? [{ key: 'dk', label: 'Nguồn', children: 'Bác sĩ đăng ký, đã duyệt' }] : []),
          ]} />

          {daNghi && <Alert type="warning" showIcon title="Ca đã hủy" description={dsKg[0].LyDoKhoa} />}

          <Flex gap={6} wrap>
            {(['TRONG', 'DA_DAT', 'DANG_GIU_CHO', 'DA_KHOA'] as const).map((tt) => (
              <Tag key={tt} color={TRANG_THAI_KHUNG_GIO[tt].mau}>{TRANG_THAI_KHUNG_GIO[tt].ten}: {dem(tt)}</Tag>
            ))}
          </Flex>

          {coQuyenKhoa && !daKetThuc && !daNghi && (
            <Flex gap={8} wrap align="center">
              <Typography.Text type="secondary">Chọn khung giờ để khóa hoặc mở lại.</Typography.Text>
              <Button size="small" icon={<LockOutlined />} disabled={!chonTrong.length}
                onClick={() => { formKhoa.resetFields(); setMoKhoa(true) }}>
                Khóa{chonTrong.length ? ` ${chonTrong.length}` : ''}
              </Button>
              <Button size="small" icon={<UnlockOutlined />} disabled={!chonKhoa.length} loading={dangGui}
                onClick={() => chay(() => api.moKhungGio(chonKhoa), `Đã mở ${chonKhoa.length} khung giờ`)}>
                Mở khóa{chonKhoa.length ? ` ${chonKhoa.length}` : ''}
              </Button>
            </Flex>
          )}

          {/* Lưới 2 cột trên máy tính, 1 cột trên điện thoại */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 6 }}>
            {dsKg.map((k) => {
              const duocChon = chon.includes(k.MaKG)
              const tt = TRANG_THAI_KHUNG_GIO[k.TrangThai]
              return (
                <Card key={k.MaKG} size="small" hoverable={chonDuoc(k)}
                  onClick={() => chonDuoc(k) && setChon(duocChon ? chon.filter((m) => m !== k.MaKG) : [...chon, k.MaKG])}
                  style={{
                    cursor: chonDuoc(k) ? 'pointer' : undefined, opacity: conHan(k) ? 1 : 0.6,
                    ...(duocChon ? { borderColor: token.colorPrimary, background: token.colorPrimaryBg } : {}),
                  }}
                  styles={{ body: { padding: '8px 12px' } }}>
                  <Flex gap={8} align="center">
                    {coQuyenKhoa && !daNghi && <Checkbox checked={duocChon} disabled={!chonDuoc(k)} />}
                    <Typography.Text strong style={{ whiteSpace: 'nowrap' }}>{k.GioBatDau}–{k.GioKetThuc}</Typography.Text>
                    <Tag color={tt.mau} style={{ marginInlineEnd: 0, marginInlineStart: 'auto' }}>{tt.ten}</Tag>
                  </Flex>
                  {k.BenhNhan && (
                    <Typography.Text ellipsis style={{ display: 'block', fontSize: 13, marginTop: 2 }}>
                      {k.BenhNhan}
                      {k.TrangThaiLichHen && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {' '}· {TRANG_THAI_LICH_HEN[k.TrangThaiLichHen].ten}
                        </Typography.Text>
                      )}
                    </Typography.Text>
                  )}
                  {k.TrangThai === 'DA_KHOA' && !daNghi && (
                    <Typography.Text type="secondary" ellipsis style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                      {k.LyDoKhoa}{k.NguoiKhoa ? ` · ${k.NguoiKhoa}` : ''}
                    </Typography.Text>
                  )}
                </Card>
              )
            })}
          </div>

          {quanLy && !daKetThuc && !daNghi && (
            <Button danger block onClick={() => { formHuy.resetFields(); setMoHuy(true) }}>Hủy ca này</Button>
          )}
        </Flex>
      )}

      <Modal title={`Khóa ${chonTrong.length} khung giờ`} open={moKhoa} onCancel={() => setMoKhoa(false)}
        okText="Khóa" cancelText="Đóng" okButtonProps={{ loading: dangGui }} onOk={() => formKhoa.submit()}>
        <Typography.Paragraph type="secondary">Bệnh nhân sẽ không đặt được các khung giờ này cho đến khi mở lại.</Typography.Paragraph>
        <Form form={formKhoa} layout="vertical" onFinish={async (v) => {
          if (await chay(() => api.khoaKhungGio(chonTrong, v.ly_do.trim()), `Đã khóa ${chonTrong.length} khung giờ`)) setMoKhoa(false)
        }}>
          <Form.Item name="ly_do" label="Lý do" rules={[{ required: true, whitespace: true, message: 'Nhập lý do' }, { max: 200 }]}>
            <AutoComplete options={LY_DO_KHOA.map((l) => ({ value: l }))} placeholder="Chọn hoặc nhập lý do" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Hủy ca làm việc" open={moHuy} onCancel={() => setMoHuy(false)} okText="Hủy ca" cancelText="Đóng"
        okButtonProps={{ danger: true, loading: dangGui }} onOk={() => formHuy.submit()}>
        {soLichHen > 0 ? (
          <Alert type="warning" showIcon style={{ marginBottom: 12 }}
            title={`${soLichHen} lịch hẹn trong ca sẽ bị hủy`}
            description="Bệnh nhân nhận được thông báo kèm lý do để đặt lại lịch khác." />
        ) : (
          <Typography.Paragraph type="secondary">Ca chưa có lịch hẹn nào.</Typography.Paragraph>
        )}
        <Form form={formHuy} layout="vertical" onFinish={async (v) => {
          const lyDo = v.ly_do.trim()
          if (await chay(() => api.huyCa(ca!.MaCa, lyDo), 'Đã hủy ca làm việc', false)) {
            setMoHuy(false)
            onDong()
          }
        }}>
          <Form.Item name="ly_do" label="Lý do" rules={[{ required: true, whitespace: true, message: 'Nhập lý do' }, { max: 200 }]}>
            <AutoComplete options={LY_DO_HUY_CA.map((l) => ({ value: l }))} placeholder="Chọn hoặc nhập lý do" />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  )
}
