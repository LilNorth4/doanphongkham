import { CheckOutlined, TeamOutlined } from '@ant-design/icons'
import {
  Alert, App, Avatar, Button, Card, Col, Descriptions, Flex, Form, Input, Modal, Rate, Result, Row, Segmented,
  Skeleton, Steps, Tag, Typography, theme,
} from 'antd'
import type { Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useKieuBuoc, useManHinhNho } from '@/hooks/manHinh'
import { anhChuyenKhoa } from '@/lib/anh'
import { api, LoiApi, type BacSi, type ChuyenKhoa, type DangKyCho, type KhungGio } from '@/lib/api'
import AnhDaiDien from '@/components/AnhDaiDien'
import ChonKhungGio from '@/components/ChonKhungGio'
import { LICH_CON_HIEU_LUC, TEN_BUOI, thuNgay, tien } from '@/lib/hangSo'

const BAT_KY = 0 // "Bác sĩ bất kỳ" trong chuyên khoa

/** Thẻ lựa chọn có viền nổi bật khi được chọn, có thể kèm ảnh đầu thẻ. */
function TheChon({ chon, onClick, anh, children }: {
  chon: boolean; onClick: () => void; anh?: string; children: React.ReactNode
}) {
  const { token } = theme.useToken()
  return (
    <Card hoverable onClick={onClick} cover={anh && <img src={anh} alt="" loading="lazy" className="the-anh" />} style={{
      height: '100%', overflow: 'hidden', borderColor: chon ? token.colorPrimary : undefined,
      boxShadow: chon ? `0 0 0 2px ${token.colorPrimaryBg}` : undefined,
    }}>
      {chon && <CheckOutlined style={{
        position: 'absolute', top: 12, right: 12, padding: 6, borderRadius: '50%', zIndex: 1,
        color: '#fff', background: token.colorPrimary,
      }} />}
      {children}
    </Card>
  )
}

/** UC6.1: bệnh nhân đặt lịch khám trên web, lịch chờ lễ tân xác nhận. */
export default function DatLich() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [buoc, setBuoc] = useState(0)
  const kieuBuoc = useKieuBuoc()
  const nho = useManHinhNho()
  const [dsCk, setDsCk] = useState<ChuyenKhoa[] | null>(null)
  const [dsBs, setDsBs] = useState<BacSi[] | null>(null)
  const [ck, setCk] = useState<ChuyenKhoa | null>(null)
  const [maBs, setMaBs] = useState<number | null>(null)
  const [kg, setKg] = useState<KhungGio | null>(null)
  const [soLichHieuLuc, setSoLichHieuLuc] = useState(0)
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const [maLichHen, setMaLichHen] = useState<string | null>(null)
  const [form] = Form.useForm<{ ly_do?: string; trieu_chung?: string }>()
  const [cho, setCho] = useState<{ ngay: Dayjs } | null>(null)
  const [formCho] = Form.useForm<{ buoi: DangKyCho['Buoi']; ly_do?: string }>()

  useEffect(() => {
    api.dsChuyenKhoa().then(setDsCk).catch((e) => setLoi(e.message))
    api.lichHenCuaToi()
      .then((ds) => setSoLichHieuLuc(ds.filter((l) => LICH_CON_HIEU_LUC.includes(l.TrangThai)).length))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!ck) return
    setDsBs(null)
    api.dsBacSi(ck.MaCK).then(setDsBs).catch((e) => setLoi(e.message))
  }, [ck])

  const bacSi = dsBs?.find((b) => b.MaBS === maBs)

  const datLich = async (v: { ly_do?: string; trieu_chung?: string }) => {
    if (!kg) return
    setDangGui(true)
    setLoi(null)
    try {
      const { ma_lk } = await api.datLich({ ma_kg: kg.MaKG, ly_do: v.ly_do?.trim(), trieu_chung: v.trieu_chung?.trim() })
      const lh = (await api.lichHenCuaToi()).find((l) => l.MaLK === ma_lk)
      setMaLichHen(lh?.MaLichHen ?? '')
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Đặt lịch thất bại')
      // Khung giờ vừa bị người khác đặt (BR01): quay lại bước chọn giờ
      if (e instanceof LoiApi && e.message.includes('không còn trống')) {
        setKg(null)
        setBuoc(2)
      }
    } finally {
      setDangGui(false)
    }
  }

  const dangKyCho = async (v: { buoi: DangKyCho['Buoi']; ly_do?: string }) => {
    if (!ck || !cho) return
    try {
      await api.dangKyCho({ ma_ck: ck.MaCK, ngay: cho.ngay.format('YYYY-MM-DD'), buoi: v.buoi,
        ma_bs: maBs || undefined, ly_do: v.ly_do?.trim() })
      setCho(null)
      message.success('Đã đăng ký danh sách chờ. Khi có chỗ trống, hệ thống sẽ giữ chỗ 15 phút và báo cho bạn.')
      navigate('/lich-hen-cua-toi?tab=cho')
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Đăng ký thất bại')
    }
  }

  if (maLichHen !== null) {
    return (
      <Card>
        <Result status="success" title="Đặt lịch thành công!"
          subTitle={<>Mã lịch hẹn <b>{maLichHen}</b> · {kg && `${kg.GioBatDau} ${thuNgay(kg.NgayKham)}`}.
            Lịch đang chờ lễ tân xác nhận, bạn sẽ nhận được thông báo khi lịch được xác nhận.</>}
          extra={[
            <Button type="primary" key="xem" onClick={() => navigate('/lich-hen-cua-toi')}>Xem lịch hẹn của tôi</Button>,
            <Button key="moi" onClick={() => { setMaLichHen(null); setKg(null); setBuoc(0); form.resetFields() }}>
              Đặt lịch khác
            </Button>,
          ]} />
      </Card>
    )
  }

  const duocTiep = [!!ck, maBs !== null, !!kg][buoc] ?? true

  return (
    <Card>
      <Typography.Title level={4} style={{ marginTop: 0 }}>Đặt lịch khám</Typography.Title>
      <Steps current={buoc} size="small" style={{ margin: '8px 0 24px' }} {...kieuBuoc}
        items={[{ title: 'Chuyên khoa' }, { title: 'Bác sĩ' }, { title: 'Ngày giờ' }, { title: 'Xác nhận' }]} />

      {soLichHieuLuc >= 3 && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          title="Bạn đã có 3 lịch hẹn chưa hoàn thành"
          description={<>Mỗi bệnh nhân có tối đa 3 lịch hẹn cùng lúc. Hãy hoàn thành hoặc hủy bớt
            trong <Link to="/lich-hen-cua-toi">Lịch hẹn của tôi</Link> trước khi đặt thêm.</>} />
      )}
      {loi && <Alert type="error" showIcon title={loi} style={{ marginBottom: 16 }} closable={{ onClose: () => setLoi(null) }} />}

      {buoc === 0 && (dsCk === null ? <Skeleton active /> : (
        <Row gutter={[16, 16]}>
          {dsCk.map((c) => (
            <Col xs={24} sm={12} lg={8} key={c.MaCK}>
              <TheChon chon={ck?.MaCK === c.MaCK} anh={anhChuyenKhoa(c.MaCK, c.AnhDaiDien)}
                onClick={() => { setCk(c); setMaBs(null); setKg(null); setBuoc(1) }}>
                <Typography.Title level={5} style={{ marginTop: 0 }}>{c.TenCK}</Typography.Title>
                <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>
                  {c.MoTa}
                </Typography.Paragraph>
                <Typography.Text>Phí khám từ <b>{tien(c.PhiKhamCoBan)}</b></Typography.Text>
              </TheChon>
            </Col>
          ))}
        </Row>
      ))}

      {buoc === 1 && (dsBs === null ? <Skeleton active /> : (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <TheChon chon={maBs === BAT_KY} onClick={() => { setMaBs(BAT_KY); setKg(null); setBuoc(2) }}>
              <Flex gap={12} align="center">
                <Avatar size={48} icon={<TeamOutlined />} />
                <div>
                  <Typography.Text strong>Bác sĩ bất kỳ</Typography.Text>
                  <div><Typography.Text type="secondary">Xem lịch trống của tất cả bác sĩ {ck?.TenCK}</Typography.Text></div>
                </div>
              </Flex>
            </TheChon>
          </Col>
          {dsBs.map((b) => (
            <Col xs={24} sm={12} lg={8} key={b.MaBS}>
              <TheChon chon={maBs === b.MaBS} onClick={() => { setMaBs(b.MaBS); setKg(null); setBuoc(2) }}>
                <Flex gap={12} align="flex-start">
                  <AnhDaiDien anh={b.AnhDaiDien} hoTen={b.HoTen} co={48} />
                  <div style={{ minWidth: 0 }}>
                    {b.HocHamHocVi && <Tag style={{ marginBottom: 4 }}>{b.HocHamHocVi}</Tag>}
                    <div><Typography.Text strong>{b.HoTen}</Typography.Text></div>
                    {b.SoNamKinhNghiem != null && (
                      <Typography.Text type="secondary">{b.SoNamKinhNghiem} năm kinh nghiệm</Typography.Text>
                    )}
                    <Flex align="center" gap={6}>
                      <Rate disabled allowHalf value={Number(b.DiemDanhGiaTB ?? 0)} style={{ fontSize: 13 }} />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {b.SoLuotDanhGia ? `${Number(b.DiemDanhGiaTB).toFixed(1)} (${b.SoLuotDanhGia})` : 'Chưa có đánh giá'}
                      </Typography.Text>
                    </Flex>
                    {b.GioiThieu && (
                      <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: '4px 0 0', fontSize: 13 }}>
                        {b.GioiThieu}
                      </Typography.Paragraph>
                    )}
                  </div>
                </Flex>
              </TheChon>
            </Col>
          ))}
        </Row>
      ))}

      {buoc === 2 && ck && (
        <ChonKhungGio maCk={ck.MaCK} maBs={maBs || undefined} value={kg}
          onChange={(k) => { setKg(k); if (k) setBuoc(3) }}
          khiHetCho={(ngay) => (
            <Flex justify="center" style={{ marginTop: 12 }}>
              <Button disabled={!ngay} onClick={() => {
                if (!ngay) return
                formCho.resetFields()
                setCho({ ngay })
              }}>
                Đăng ký danh sách chờ{ngay ? ` ngày ${ngay.format('DD/MM')}` : ''}
              </Button>
            </Flex>
          )} />
      )}

      {buoc === 3 && ck && kg && (
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={11}>
            <Descriptions bordered column={1} size="small" items={[
              { key: 'ck', label: 'Chuyên khoa', children: ck.TenCK },
              { key: 'bs', label: 'Bác sĩ', children: bacSi?.HoTen ?? kg.BacSi },
              { key: 'tg', label: 'Thời gian', children: <b>{kg.GioBatDau} – {kg.GioKetThuc}, {thuNgay(kg.NgayKham)}</b> },
              { key: 'p', label: 'Phòng', children: `${kg.MaSoPhong} – ${kg.TenPhong}` },
              { key: 'phi', label: 'Phí khám cơ bản', children: tien(ck.PhiKhamCoBan) },
            ]} />
            <Alert type="info" showIcon style={{ marginTop: 16 }} title="Lưu ý" description={
              <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                <li>Lịch đặt trên web cần lễ tân xác nhận.</li>
                <li>Chỉ hủy hoặc đổi lịch trước giờ khám ít nhất 4 giờ, đổi tối đa 2 lần.</li>
                <li>Vui lòng đến trước giờ hẹn 15 phút, mang theo CCCD và thẻ BHYT (nếu có).</li>
              </ul>
            } />
          </Col>
          <Col xs={24} lg={13}>
            <Form form={form} layout="vertical" onFinish={datLich} disabled={soLichHieuLuc >= 3}>
              <Form.Item name="ly_do" label="Lý do khám" rules={[{ max: 500 }]}>
                <Input placeholder="VD: Khám sức khỏe định kỳ, tái khám huyết áp..." />
              </Form.Item>
              <Form.Item name="trieu_chung" label="Triệu chứng (nếu có)" rules={[{ max: 500 }]}
                extra="Giúp bác sĩ chuẩn bị trước khi khám.">
                <Input.TextArea rows={4} placeholder="VD: Ho, sốt nhẹ 3 ngày nay..." showCount maxLength={500} />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={dangGui}>
                Xác nhận đặt lịch
              </Button>
            </Form>
          </Col>
        </Row>
      )}

      <Flex justify="space-between" className={nho ? 'thanh-duoi-mobile' : undefined} style={{ marginTop: 24 }}>
        <Button disabled={buoc === 0} onClick={() => setBuoc(buoc - 1)}>Quay lại</Button>
        {buoc < 3 && <Button type="primary" disabled={!duocTiep} onClick={() => setBuoc(buoc + 1)}>Tiếp tục</Button>}
      </Flex>

      <Modal title={`Đăng ký danh sách chờ – ${ck?.TenCK ?? ''}`} open={!!cho} onCancel={() => setCho(null)}
        okText="Đăng ký" onOk={() => formCho.submit()} destroyOnHidden>
        <Typography.Paragraph type="secondary">
          Ngày {cho && thuNgay(cho.ngay)}{bacSi ? `, ${bacSi.HoTen}` : ', bác sĩ bất kỳ'}. Khi có người hủy lịch,
          khung giờ phù hợp sẽ được giữ cho bạn 15 phút. Mỗi người tối đa 2 đăng ký chờ.
        </Typography.Paragraph>
        <Form form={formCho} layout="vertical" onFinish={dangKyCho} initialValues={{ buoi: 'CA_NGAY' }}>
          <Form.Item name="buoi" label="Buổi mong muốn">
            <Segmented block options={(['CA_NGAY', 'SANG', 'CHIEU'] as const).map((b) => ({ value: b, label: TEN_BUOI[b] }))} />
          </Form.Item>
          <Form.Item name="ly_do" label="Lý do khám" rules={[{ max: 500 }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
