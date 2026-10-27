import { CameraOutlined, ReloadOutlined, StarFilled } from '@ant-design/icons'
import {
  Alert, App, Avatar, Button, Card, Drawer, Empty, Flex, Image, Input, List, Rate, Result, Skeleton, Tag, Typography, Upload,
  type UploadFile,
} from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useManHinhNho } from '@/hooks/manHinh'
import { api, LoiApi, type BieuMauDanhGia, type CotTieuChi, type DanhGia, type LuotChoDanhGia } from '@/lib/api'
import { SU_KIEN_SO_DANH_GIA, TIEU_CHI_DANH_GIA } from '@/lib/hangSo'

const NHAN_SAO = ['Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt']
const SO_ANH_TOI_DA = 3

/**
 * UC12.1: bệnh nhân đánh giá bác sĩ và 6 tiêu chí dịch vụ (BR24) cho lượt khám đã thanh toán, trong 7 ngày.
 * Tiêu chí không sử dụng có thể bỏ trống. Mở từ lời mời đánh giá: /danh-gia?luot=123.
 */
export default function DanhGiaCuaToi() {
  const { message } = App.useApp()
  const nho = useManHinhNho()
  const [params, setParams] = useSearchParams()
  const [du, setDu] = useState<{ ChoDanhGia: LuotChoDanhGia[]; DaDanhGia: DanhGia[] } | null>(null)
  const [mau, setMau] = useState<BieuMauDanhGia | null>(null)

  const tai = useCallback(() => {
    api.danhGiaCuaToi().then((d) => {
      setDu(d)
      window.dispatchEvent(new CustomEvent(SU_KIEN_SO_DANH_GIA, { detail: d.ChoDanhGia.length }))
    }).catch((e) => message.error(e instanceof LoiApi ? e.message : 'Không tải được đánh giá'))
  }, [message])
  useEffect(() => { tai() }, [tai])

  const moMau = useCallback(async (maLk: number) => {
    try {
      setMau(await api.bieuMauDanhGia(maLk))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không mở được biểu mẫu')
    }
  }, [message])

  useEffect(() => {
    const ma = Number(params.get('luot'))
    if (ma) moMau(ma)
  }, [params, moMau])

  const dong = () => {
    setMau(null)
    if (params.get('luot')) setParams({}, { replace: true })
  }

  return (
    <Flex vertical gap={16}>
      <Card>
        <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Đánh giá sau khám</Typography.Title>
          <Button icon={<ReloadOutlined />} onClick={tai} aria-label="Làm mới" />
        </Flex>
        {du === null ? <Skeleton active /> : du.ChoDanhGia.length === 0 ? (
          <Empty description="Không có lượt khám nào đang chờ đánh giá" />
        ) : (
          <List dataSource={du.ChoDanhGia} renderItem={(l) => {
            const conGio = dayjs(l.HanDanhGia).diff(dayjs(), 'hour')
            return (
              <List.Item style={{ display: 'block' }}>
                <Flex justify="space-between" gap={12} wrap align="center">
                  <div>
                    <Typography.Text strong>{l.BacSi}</Typography.Text>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        {dayjs(l.NgayKham).format('DD/MM/YYYY')}{l.TenCK && ` · ${l.TenCK}`} · {l.MaLichHen}
                      </Typography.Text>
                    </div>
                    <Tag color={conGio < 24 ? 'orange' : 'default'} style={{ marginTop: 4 }}>
                      Hạn đánh giá {dayjs(l.HanDanhGia).format('HH:mm DD/MM')}
                    </Tag>
                  </div>
                  <Button type="primary" icon={<StarFilled />} onClick={() => moMau(l.MaLK)} block={nho}>Đánh giá</Button>
                </Flex>
              </List.Item>
            )
          }} />
        )}
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
          Mỗi lượt khám được đánh giá một lần trong vòng 7 ngày sau khi thanh toán. Ý kiến của bạn giúp phòng khám phục vụ tốt hơn.
        </Typography.Paragraph>
      </Card>

      {du && du.DaDanhGia.length > 0 && (
        <Card title="Đánh giá đã gửi">
          <List dataSource={du.DaDanhGia} renderItem={(d) => (
            <List.Item style={{ display: 'block' }}>
              <XemDanhGia d={d} />
            </List.Item>
          )} />
        </Card>
      )}

      <Drawer open={!!mau} onClose={dong} size={nho ? '100%' : 560} title="Đánh giá lượt khám" destroyOnHidden>
        {mau && <BieuMau mau={mau} onXong={() => { tai() }} onDong={dong} />}
      </Drawer>
    </Flex>
  )
}

/** Một đánh giá đã gửi: sao bác sĩ, các tiêu chí đã chấm, nhận xét và ảnh. */
export function XemDanhGia({ d, hienBenhNhan }: { d: DanhGia; hienBenhNhan?: boolean }) {
  const tieuChi = TIEU_CHI_DANH_GIA.filter((t) => d[t.cot] != null)
  return (
    <Flex vertical gap={6}>
      <Flex justify="space-between" wrap gap={8}>
        <div>
          <Typography.Text strong>{d.BacSi}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {d.NgayKham && ` · khám ${dayjs(d.NgayKham).format('DD/MM/YYYY')}`}{d.TenCK && ` · ${d.TenCK}`}
            {hienBenhNhan && d.BenhNhan && ` · ${d.BenhNhan}`}
          </Typography.Text>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Gửi {dayjs(d.ThoiGian).format('HH:mm DD/MM/YYYY')}</Typography.Text>
      </Flex>
      <Flex align="center" gap={8}>
        <Typography.Text style={{ minWidth: 70 }}>Bác sĩ</Typography.Text>
        <Rate disabled value={d.DiemBacSi ?? 0} style={{ fontSize: 16 }} />
      </Flex>
      {d.NhanXetBacSi && <Typography.Paragraph style={{ margin: 0 }}>“{d.NhanXetBacSi}”</Typography.Paragraph>}
      {tieuChi.length > 0 && (
        <Flex wrap gap={6}>
          {tieuChi.map((t) => <Tag key={t.cot}>{t.ten}: {d[t.cot]}★</Tag>)}
        </Flex>
      )}
      {d.NhanXetDichVu && <Typography.Paragraph style={{ margin: 0 }}>“{d.NhanXetDichVu}”</Typography.Paragraph>}
      {d.Anh.length > 0 && (
        <Image.PreviewGroup>
          <Flex gap={8} wrap>
            {d.Anh.map((a) => <Image key={a.MaTep} src={a.DuongDan} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 6 }} />)}
          </Flex>
        </Image.PreviewGroup>
      )}
    </Flex>
  )
}

function BieuMau({ mau, onXong, onDong }: { mau: BieuMauDanhGia; onXong: () => void; onDong: () => void }) {
  const { message } = App.useApp()
  const [diemBs, setDiemBs] = useState(0)
  const [nxBs, setNxBs] = useState('')
  const [diem, setDiem] = useState<Partial<Record<CotTieuChi, number>>>({})
  const [nxDv, setNxDv] = useState('')
  const [anh, setAnh] = useState<UploadFile[]>([])
  const [loi, setLoi] = useState<string | null>(null)
  const [dangGui, setDangGui] = useState(false)
  const [xong, setXong] = useState(false)

  if (mau.DanhGia) {
    return <><Alert type="info" showIcon title="Bạn đã đánh giá lượt khám này. Cảm ơn bạn!" style={{ marginBottom: 16 }} />
      <XemDanhGia d={{ ...mau.DanhGia, BacSi: mau.BacSi, NgayKham: mau.NgayKham, TenCK: mau.TenCK }} /></>
  }
  if (mau.LyDoKhongDuoc) {
    return <Result status="info" title={mau.LyDoKhongDuoc} extra={<Button onClick={onDong}>Đóng</Button>} />
  }
  if (xong) {
    return (
      <Result status="success" title="Cảm ơn bạn đã đánh giá!"
        subTitle="Ý kiến của bạn đã được ghi nhận và sẽ giúp phòng khám cải thiện chất lượng phục vụ."
        extra={<Button type="primary" onClick={onDong}>Xong</Button>} />
    )
  }

  const gui = async () => {
    if (!diemBs) { setLoi('Vui lòng chấm điểm bác sĩ'); return }
    setLoi(null)
    setDangGui(true)
    try {
      await api.guiDanhGia(mau.MaLK, { diem_bac_si: diemBs, nhan_xet_bac_si: nxBs.trim(), nhan_xet_dich_vu: nxDv.trim(), diem },
        anh.map((a) => a.originFileObj as File))
      setXong(true)
      onXong()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không gửi được đánh giá')
    } finally {
      setDangGui(false)
    }
  }

  return (
    <Flex vertical gap={20}>
      <Flex gap={12} align="center">
        <Avatar size={52} src={mau.AnhDaiDien || undefined}>{mau.BacSi.split(' ').pop()?.[0]}</Avatar>
        <div>
          <Typography.Text strong style={{ fontSize: 16 }}>{mau.BacSi}</Typography.Text>
          <div><Typography.Text type="secondary">{mau.TenCK} · khám {dayjs(mau.NgayKham).format('DD/MM/YYYY')}</Typography.Text></div>
          {mau.HanDanhGia && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Đánh giá trước {dayjs(mau.HanDanhGia).format('HH:mm DD/MM/YYYY')}
            </Typography.Text>
          )}
        </div>
      </Flex>

      <section>
        <Typography.Title level={5} style={{ marginTop: 0 }}>Bác sĩ <Typography.Text type="danger">*</Typography.Text></Typography.Title>
        <Flex align="center" gap={12} wrap>
          <Rate value={diemBs} onChange={setDiemBs} style={{ fontSize: 30 }} aria-label="Điểm bác sĩ" />
          {diemBs > 0 && <Typography.Text type="secondary">{NHAN_SAO[diemBs - 1]}</Typography.Text>}
        </Flex>
        <Input.TextArea value={nxBs} onChange={(e) => setNxBs(e.target.value)} maxLength={2000} showCount
          autoSize={{ minRows: 2, maxRows: 5 }} placeholder="Chia sẻ về sự tận tâm, cách tư vấn của bác sĩ (không bắt buộc)"
          style={{ marginTop: 8 }} />
      </section>

      <section>
        <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 2 }}>Dịch vụ phòng khám</Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Không bắt buộc: chấm tiêu chí bạn muốn, bỏ trống tiêu chí còn lại (bấm lại vào sao để bỏ chọn).
        </Typography.Text>
        <Flex vertical gap={4} style={{ marginTop: 8 }}>
          {TIEU_CHI_DANH_GIA.map((t) => (
            <Flex key={t.cot} justify="space-between" align="center" gap={8} wrap>
              <Typography.Text>
                {t.ten}
                {t.cot === 'DiemDichVuCLS' && mau.SoCLS === 0 && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}> (lượt này không làm CLS)</Typography.Text>
                )}
              </Typography.Text>
              <Rate value={diem[t.cot] ?? 0} onChange={(v) => setDiem((d) => ({ ...d, [t.cot]: v || undefined }))}
                style={{ fontSize: 22 }} aria-label={t.ten} />
            </Flex>
          ))}
        </Flex>
        <Input.TextArea value={nxDv} onChange={(e) => setNxDv(e.target.value)} maxLength={2000} showCount
          autoSize={{ minRows: 2, maxRows: 5 }} placeholder="Góp ý về thời gian chờ, tiếp đón, cơ sở vật chất… (không bắt buộc)"
          style={{ marginTop: 8 }} />
      </section>

      <section>
        <Upload listType="picture-card" accept="image/jpeg,image/png" fileList={anh} maxCount={SO_ANH_TOI_DA}
          beforeUpload={(f) => {
            if (!['image/jpeg', 'image/png'].includes(f.type)) { message.error('Chỉ nhận ảnh JPG, PNG'); return Upload.LIST_IGNORE }
            if (f.size > 2 * 1024 * 1024) { message.error('Ảnh tối đa 2 MB'); return Upload.LIST_IGNORE }
            return false
          }}
          onChange={({ fileList }) => setAnh(fileList)}>
          {anh.length < SO_ANH_TOI_DA && (
            <Flex vertical align="center" gap={4}><CameraOutlined /><span style={{ fontSize: 12 }}>Thêm ảnh</span></Flex>
          )}
        </Upload>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Tối đa {SO_ANH_TOI_DA} ảnh JPG/PNG, mỗi ảnh 2 MB.</Typography.Text>
      </section>

      {loi && <Alert type="error" showIcon title={loi} />}
      <Button type="primary" size="large" block loading={dangGui} onClick={gui}>Gửi đánh giá</Button>
    </Flex>
  )
}
