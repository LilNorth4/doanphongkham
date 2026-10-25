import { CheckCircleFilled, LeftOutlined, LinkOutlined, PrinterOutlined, ReloadOutlined, RightOutlined, WalletOutlined } from '@ant-design/icons'
import {
  Alert, App, Badge, Button, Card, Col, DatePicker, Divider, Flex, Input, InputNumber, Modal, QRCode, Radio, Row, Skeleton,
  Space, Tabs, Tag, Typography, type TableProps,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BangThichUng from '@/components/BangThichUng'
import LapPhieuHoan from '@/components/LapPhieuHoan'
import XemHoaDon, { inHoaDon } from '@/components/XemHoaDon'
import { api, LoiApi, type DongHoaDon, type HinhThucThu, type HoaDon, type LenhMoMo } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { goiYTienDua, SU_KIEN_SO_HOA_DON, TEN_HINH_THUC, tien, tuoi } from '@/lib/hangSo'

const thongTinBn = (h: DongHoaDon) =>
  [h.GioiTinh === 'NAM' ? 'Nam' : h.GioiTinh === 'NU' ? 'Nữ' : null,
    tuoi(h.NgaySinh ?? null) != null ? `${tuoi(h.NgaySinh ?? null)} tuổi` : null, h.SDT].filter(Boolean).join(' · ')

/**
 * UC10.1-10.2: thu ngân thanh toán hóa đơn cuối lượt khám (khám + CLS + thuốc, trừ BHYT và tạm thu):
 * tiền mặt, chuyển khoản, hoặc mã QR ví MoMo cho bệnh nhân quét.
 */
export default function ThanhToan() {
  const { message } = App.useApp()
  const thuTien = !!usePhien().nguoiDung?.Quyen.includes('THANH_TOAN.THU')
  const [params] = useSearchParams()
  const [tab, setTab] = useState('cho')
  const [tuKhoa, setTuKhoa] = useState('')
  const [ngay, setNgay] = useState<Dayjs>(dayjs())
  const [dsCho, setDsCho] = useState<DongHoaDon[]>([])
  const [dsDaThu, setDsDaThu] = useState<DongHoaDon[]>([])
  const [dsHuy, setDsHuy] = useState<DongHoaDon[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [moHd, setMoHd] = useState<number | null>(Number(params.get('hd')) || null)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      const tk = tuKhoa || undefined
      const n = ngay.format('YYYY-MM-DD')
      const [cho, da, huy] = await Promise.all([
        api.dsHoaDon({ tu_khoa: tk }), api.dsHoaDon({ trang_thai: 'DA_THANH_TOAN', ngay: n, tu_khoa: tk }),
        api.dsHoaDon({ trang_thai: 'DA_HUY', ngay: n, tu_khoa: tk }),
      ])
      setDsCho(cho)
      setDsDaThu(da)
      setDsHuy(huy)
      if (!tk) window.dispatchEvent(new CustomEvent(SU_KIEN_SO_HOA_DON, { detail: cho.length }))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được hóa đơn')
    } finally {
      setDangTai(false)
    }
  }, [tuKhoa, ngay, message])

  useEffect(() => { tai() }, [tai])
  useEffect(() => {
    const id = setInterval(tai, 30_000)
    return () => clearInterval(id)
  }, [tai])

  const cot = (daThu: boolean): TableProps<DongHoaDon>['columns'] => [
    {
      title: 'Bệnh nhân', key: 'bn',
      render: (_, h) => (
        <div>
          <Typography.Text strong>{h.HoTen}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{thongTinBn(h)}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: 'Hóa đơn', key: 'hd',
      render: (_, h) => (
        <div>
          {h.MaSoHoaDon}
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {h.MaLichHen} · {daThu ? dayjs(h.NgayThanhToan).format('HH:mm') : dayjs(h.NgayKham).format('DD/MM')}
          </Typography.Text></div>
        </div>
      ),
    },
    { title: 'Bác sĩ', key: 'bs', responsive: ['lg'], render: (_, h) => <div>{h.BacSi}<div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{h.TenCK}</Typography.Text></div></div> },
    { title: 'Tổng / BHYT / tạm thu', key: 'tong', responsive: ['md'], render: (_, h) => <Typography.Text type="secondary">{tien(h.TongTien)} / {tien(h.BHYTChiTra)} / {tien(h.DaTamThu)}</Typography.Text> },
    daThu
      ? { title: 'Hình thức', key: 'ht', render: (_, h) => <Space size={4}>{h.HinhThuc && <Tag color={h.HinhThuc === 'MOMO' ? 'magenta' : undefined}>{TEN_HINH_THUC[h.HinhThuc]}</Tag>}{h.ThuNgan && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{h.ThuNgan}</Typography.Text>}</Space> }
      : { title: 'Còn phải thu', key: 'thu', align: 'right', render: (_, h) => <Typography.Text strong>{tien(Math.max(Number(h.ConPhaiThu), 0))}</Typography.Text> },
    {
      title: '', key: 'thao_tac', align: 'right', fixed: 'right',
      render: (_, h) => daThu || !thuTien
        ? <Button size="small" icon={<PrinterOutlined />} onClick={() => setMoHd(h.MaHD)}>Xem</Button>
        : <Button size="small" type="primary" icon={<WalletOutlined />} onClick={() => setMoHd(h.MaHD)}>Thanh toán</Button>,
    },
  ]

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{thuTien ? 'Thanh toán hóa đơn' : 'Hóa đơn'}</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={tai} loading={dangTai}>Làm mới</Button>
      </Flex>
      <Row style={{ marginBottom: 4 }}>
        <Col xs={24} md={10}>
          <Input.Search allowClear placeholder="Tìm tên, SĐT, mã lịch hẹn, mã hóa đơn" onSearch={(v) => setTuKhoa(v.trim())} />
        </Col>
      </Row>
      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'cho', label: <Badge count={dsCho.length} offset={[10, -2]} size="small">Chờ thanh toán</Badge>,
          children: (
            <BangThichUng soCotTieuDe={1} rowKey="MaHD" size="middle" columns={cot(false)} dataSource={dsCho} loading={dangTai}
              locale={{ emptyText: 'Không có hóa đơn chờ thanh toán' }} pagination={{ pageSize: 20, hideOnSinglePage: true }}
              scroll={{ x: 'max-content' }} />
          ),
        },
        {
          key: 'da-thu', label: 'Đã thanh toán',
          children: (
            <>
              <Flex gap={12} wrap align="center" justify="space-between" style={{ marginBottom: 12 }}>
                <Space.Compact>
                  <Button icon={<LeftOutlined />} onClick={() => setNgay(ngay.subtract(1, 'day'))} aria-label="Ngày trước" />
                  <DatePicker value={ngay} onChange={(d) => d && setNgay(d)} format="DD/MM/YYYY" allowClear={false}
                    style={{ width: 140 }} disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
                  <Button icon={<RightOutlined />} onClick={() => setNgay(ngay.add(1, 'day'))} aria-label="Ngày sau"
                    disabled={ngay.isSame(dayjs(), 'day')} />
                </Space.Compact>
                <Typography.Text>
                  {dsDaThu.length} hóa đơn · đã thu <Typography.Text strong>
                    {tien(dsDaThu.reduce((s, h) => s + Math.max(Number(h.ConPhaiThu), 0), 0))}</Typography.Text>
                </Typography.Text>
              </Flex>
              <BangThichUng soCotTieuDe={1} rowKey="MaHD" size="middle" columns={cot(true)} dataSource={dsDaThu} loading={dangTai}
                locale={{ emptyText: 'Chưa có hóa đơn thanh toán trong ngày' }} pagination={{ pageSize: 30, hideOnSinglePage: true }}
                scroll={{ x: 'max-content' }} />
            </>
          ),
        },
        {
          key: 'huy', label: 'Đã hủy',
          children: (
            <>
              <Typography.Paragraph type="secondary">Hóa đơn bị hủy lập trong ngày đang chọn ở tab Đã thanh toán; giữ lại để đối soát (BR26).</Typography.Paragraph>
              <BangThichUng soCotTieuDe={1} rowKey="MaHD" size="middle" dataSource={dsHuy} loading={dangTai}
                locale={{ emptyText: 'Không có hóa đơn bị hủy' }} pagination={{ pageSize: 30, hideOnSinglePage: true }}
                scroll={{ x: 'max-content' }}
                columns={[
                  ...(cot(true) ?? []).slice(0, 3),
                  { title: 'Lý do hủy', dataIndex: 'LyDoHuy', render: (l) => <Typography.Text type="danger">{l}</Typography.Text> },
                  (cot(true) ?? [])[5],
                ]} />
            </>
          ),
        },
      ]} />
      {moHd != null && <ThuHoaDon maHd={moHd} onDong={() => { setMoHd(null); tai() }} />}
    </Card>
  )
}

/** Hộp thanh toán một hóa đơn; hóa đơn đã thanh toán thì chỉ xem và in. */
function ThuHoaDon({ maHd, onDong }: { maHd: number; onDong: () => void }) {
  const { message, modal } = App.useApp()
  const quyen = usePhien().nguoiDung?.Quyen ?? []
  const thuTien = quyen.includes('THANH_TOAN.THU')
  const huyDuoc = quyen.includes('HOA_DON.HUY')
  const lapHoan = quyen.includes('HOAN_TIEN.LAP')
  const [moHoan, setMoHoan] = useState(false)
  const [hd, setHd] = useState<HoaDon | null>(null)
  const [hinhThuc, setHinhThuc] = useState<HinhThucThu | 'MOMO'>('TIEN_MAT')
  const [tienDua, setTienDua] = useState<number | null>(null)
  const [lenh, setLenh] = useState<LenhMoMo | null>(null)
  const [dangGui, setDangGui] = useState(false)

  const taiHd = useCallback(() => api.hoaDon(maHd).then(setHd).catch((e) => {
    message.error(e instanceof LoiApi ? e.message : 'Không tải được hóa đơn')
    onDong()
  }), [maHd, message, onDong])
  useEffect(() => { taiHd() }, [taiHd])

  // Đang hiện mã QR MoMo: hỏi trạng thái mỗi 3 giây đến khi bệnh nhân thanh toán xong
  useEffect(() => {
    if (!lenh) return
    const id = setInterval(async () => {
      try {
        const gd = await api.trangThaiMoMo(lenh.ma_don)
        if (gd.TrangThai === 'THANH_CONG') {
          clearInterval(id)
          message.success(`Đã nhận ${tien(gd.SoTien)} qua MoMo`)
          setLenh(null)
          taiHd()
        } else if (gd.TrangThai === 'THAT_BAI') {
          clearInterval(id)
          message.warning(`Thanh toán MoMo không thành công: ${gd.ThongDiep ?? ''}`)
          setLenh(null)
        }
      } catch { /* mạng chập chờn: lần sau hỏi lại */ }
    }, 3000)
    return () => clearInterval(id)
  }, [lenh, message, taiHd])

  if (!hd) return <Modal open footer={null} onCancel={onDong} title="Hóa đơn"><Skeleton active /></Modal>

  const daThu = hd.TrangThai === 'DA_THANH_TOAN' || hd.TrangThai === 'DA_HUY' || !thuTien
  const daHoanHoaDon = hd.PhieuHoanTien.filter((p) => p.MaChungTu === hd.MaSoHoaDon && p.TrangThai !== 'TU_CHOI')
    .reduce((t, p) => t + Number(p.SoTien), 0)
  const conHoanDuoc = Math.max(Number(hd.ConPhaiThu), 0) - daHoanHoaDon

  const huyHoaDon = () => {
    let lyDo = ''
    modal.confirm({
      title: `Hủy hóa đơn ${hd.MaSoHoaDon}?`,
      content: (
        <>
          <Typography.Paragraph type="secondary">
            Hệ thống lập hóa đơn thay thế từ dữ liệu lượt khám; hóa đơn này giữ lại để đối soát. Đã thanh toán thì phần thu thừa
            thành đề nghị hoàn tiền.
          </Typography.Paragraph>
          <Input.TextArea rows={2} maxLength={255} placeholder="Lý do hủy (bắt buộc)" onChange={(e) => { lyDo = e.target.value }} />
        </>
      ),
      okText: 'Hủy hóa đơn', okButtonProps: { danger: true }, cancelText: 'Đóng',
      onOk: async () => {
        if (!lyDo.trim()) {
          message.warning('Vui lòng nhập lý do hủy')
          throw new Error('thieu ly do')
        }
        try {
          const moi = await api.huyHoaDon(hd.MaHD, lyDo.trim())
          message.success(`Đã hủy, hóa đơn thay thế ${moi.MaSoHoaDon}`)
          setHd(moi)
        } catch (e) {
          message.error(e instanceof LoiApi ? e.message : 'Không hủy được hóa đơn')
        }
      },
    })
  }
  const phaiThu = Math.max(Number(hd.ConPhaiThu), 0)
  const thieu = hinhThuc === 'TIEN_MAT' && phaiThu > 0 && (tienDua == null || tienDua < phaiThu)

  const thu = async () => {
    setDangGui(true)
    try {
      const moi = await api.thuHoaDon(maHd, { hinh_thuc: hinhThuc as HinhThucThu, tien_khach_dua: hinhThuc === 'TIEN_MAT' ? tienDua : null })
      message.success(`Đã thanh toán hóa đơn ${moi.MaSoHoaDon}`)
      setHd(moi)
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Thanh toán thất bại')
    } finally {
      setDangGui(false)
    }
  }

  const taoMoMo = async () => {
    setDangGui(true)
    try {
      setLenh(await api.momoTaiQuay(maHd))
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tạo được mã MoMo')
    } finally {
      setDangGui(false)
    }
  }

  const nutIn = (
    <Button key="in" icon={<PrinterOutlined />} onClick={() => !inHoaDon(hd) && message.warning('Không mở được chức năng in của trình duyệt')}>
      In hóa đơn
    </Button>
  )

  return (
    <Modal open width={720} onCancel={onDong} title={`Hóa đơn ${hd.MaSoHoaDon}`}
      footer={daThu || hinhThuc === 'MOMO'
        ? [
          huyDuoc && hd.TrangThai !== 'DA_HUY' && <Button key="huy" danger onClick={huyHoaDon}>Hủy hóa đơn</Button>,
          lapHoan && hd.TrangThai === 'DA_THANH_TOAN' && conHoanDuoc >= 1000 && <Button key="hoan" onClick={() => setMoHoan(true)}>Lập phiếu hoàn</Button>,
          nutIn, <Button key="dong" type={daThu ? 'primary' : 'default'} onClick={onDong}>Đóng</Button>]
        : [nutIn, <Button key="dong" onClick={onDong}>Đóng</Button>,
          <Button key="thu" type="primary" loading={dangGui} disabled={thieu} onClick={thu}>
            {phaiThu > 0 ? `Xác nhận đã thu ${tien(phaiThu)}` : 'Xác nhận hoàn tất'}
          </Button>]}>
      <XemHoaDon hd={hd} />
      {moHoan && (
        <LapPhieuHoan maHd={hd.MaHD} maChungTu={hd.MaSoHoaDon} toiDa={conHoanDuoc} onDong={() => setMoHoan(false)}
          onXong={() => { setMoHoan(false); taiHd() }} />
      )}
      {hd.TrangThai === 'DA_HUY' || !thuTien ? null : daThu ? (
        <Alert type="success" showIcon icon={<CheckCircleFilled />} style={{ marginTop: 12 }}
          title={`Đã thanh toán${hd.HinhThuc ? ` bằng ${TEN_HINH_THUC[hd.HinhThuc].toLowerCase()}` : ''}`} />
      ) : (
        <>
          <Divider style={{ margin: '16px 0 12px' }} />
          <Radio.Group value={hinhThuc} onChange={(e) => { setHinhThuc(e.target.value); setLenh(null) }} optionType="button"
            disabled={phaiThu === 0}
            options={[{ value: 'TIEN_MAT', label: 'Tiền mặt' }, { value: 'CHUYEN_KHOAN', label: 'Chuyển khoản' }, { value: 'MOMO', label: 'Ví MoMo' }]} />
          {hinhThuc === 'TIEN_MAT' && phaiThu > 0 && (
            <Flex vertical gap={8} style={{ marginTop: 12 }}>
              <Flex gap={8} wrap align="center">
                <Typography.Text>Khách đưa</Typography.Text>
                <InputNumber<number> min={0} step={1000} value={tienDua} onChange={setTienDua} style={{ width: 180 }} suffix="đ"
                  formatter={(v) => (v == null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
                  parser={(v) => Number((v ?? '').replace(/\D/g, '')) || 0} />
                {goiYTienDua(phaiThu).map((m) => <Button key={m} size="small" onClick={() => setTienDua(m)}>{m.toLocaleString('vi-VN')}</Button>)}
              </Flex>
              {tienDua != null && (tienDua >= phaiThu
                ? <Typography.Text>Tiền thừa trả khách: <Typography.Text strong>{tien(tienDua - phaiThu)}</Typography.Text></Typography.Text>
                : <Typography.Text type="danger">Còn thiếu {tien(phaiThu - tienDua)}</Typography.Text>)}
            </Flex>
          )}
          {hinhThuc === 'CHUYEN_KHOAN' && (
            <Alert type="info" style={{ marginTop: 12 }} title="Chỉ xác nhận sau khi đã thấy tiền vào tài khoản phòng khám"
              description={<>Nội dung chuyển khoản: <Typography.Text strong copyable>{hd.MaSoHoaDon}</Typography.Text></>} />
          )}
          {hinhThuc === 'MOMO' && (
            <Flex vertical align="center" gap={8} style={{ marginTop: 16 }}>
              {hd.MoMoThu && <Tag color="orange">Môi trường thử MoMo: không trừ tiền thật</Tag>}
              {!lenh ? (
                <Button type="primary" size="large" loading={dangGui} onClick={taoMoMo} style={{ background: '#A50064' }}>
                  Tạo mã thanh toán MoMo {tien(phaiThu)}
                </Button>
              ) : (
                <>
                  <QRCode value={lenh.pay_url} size={200} color="#A50064" />
                  <Typography.Text>Bệnh nhân quét mã bằng ứng dụng MoMo hoặc camera điện thoại</Typography.Text>
                  <Typography.Link href={lenh.pay_url} target="_blank" rel="noreferrer"><LinkOutlined /> Mở trang thanh toán MoMo</Typography.Link>
                  <Typography.Text type="secondary"><Badge status="processing" /> Đang chờ thanh toán, tự cập nhật khi xong…</Typography.Text>
                </>
              )}
            </Flex>
          )}
        </>
      )}
    </Modal>
  )
}
