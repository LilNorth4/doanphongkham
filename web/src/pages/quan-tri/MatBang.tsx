import {
  AimOutlined, DeleteOutlined, EditOutlined, NodeIndexOutlined, PictureOutlined, PlusOutlined, ReloadOutlined, SelectOutlined,
} from '@ant-design/icons'
import {
  Alert, App, Button, Card, Checkbox, Col, Descriptions, Empty, Flex, Form, Input, InputNumber, Modal, Popconfirm, Row,
  Segmented, Select, Space, Tag, Timeline, Typography, Upload,
} from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as SuKienChuot } from 'react'
import { useManHinhNho } from '@/hooks/manHinh'
import {
  api, LoiApi, type DiemNut, type DoanDuong, type DuongDi, type LoaiDiem, type PhongQuanLy, type SoDoMatBang,
} from '@/lib/api'
import { TEN_LOAI_DIEM } from '@/lib/hangSo'

type CheDo = 'chon' | 'them' | 'noi' | 'chi-duong'
const thongBaoLoi = (e: unknown) => (e instanceof LoiApi ? e.message : 'Có lỗi xảy ra')
const TEN_DOAN = { DI_BO: 'Đi bộ', CAU_THANG: 'Cầu thang bộ', THANG_MAY: 'Thang máy' }

interface GiaTriDiem { ten_diem?: string; loai_diem: LoaiDiem; ma_phong?: number | null; x: number; y: number }

/** Thời gian đi một đoạn (giây), khớp trọng số Dijkstra ở MatBangService.chiDuong (BR22). */
function thoiGianDoan(d: DoanDuong) {
  return d.LoaiDoan === 'CAU_THANG' ? 30 * d.SoTang : d.LoaiDoan === 'THANG_MAY' ? 60 : Math.round(Number(d.DoDai))
}

function phutGiay(giay: number) {
  return giay < 60 ? `${giay} giây` : `${Math.floor(giay / 60)} phút${giay % 60 ? ` ${giay % 60} giây` : ''}`
}

/**
 * UC3.9: sơ đồ mặt bằng từng tầng. Điểm nút (cửa phòng, hành lang, cầu thang...) đặt trên ảnh mặt bằng,
 * đoạn đường nối các điểm làm đồ thị chỉ đường (BR22). Kéo thả điểm để đổi vị trí, độ dài đoạn tự tính lại.
 */
export default function MatBang() {
  const nho = useManHinhNho()
  const { message } = App.useApp()
  const [soDo, setSoDo] = useState<SoDoMatBang | null>(null)
  const [dsPhong, setDsPhong] = useState<PhongQuanLy[]>([])
  const [maTang, setMaTang] = useState<number>()
  const [cheDo, setCheDo] = useState<CheDo>('chon')
  const [chon, setChon] = useState<{ diem?: number; doan?: number }>({})
  const [diemNoi, setDiemNoi] = useState<number | null>(null)
  const [diemMoi, setDiemMoi] = useState<{ x: number; y: number } | null>(null)
  const [suaTang, setSuaTang] = useState<'moi' | 'sua' | null>(null)
  const [keo, setKeo] = useState<{ ma: number; x: number; y: number } | null>(null)
  const [kichThuocAnh, setKichThuocAnh] = useState<{ w: number; h: number } | null>(null)
  const [duong, setDuong] = useState<{ tu?: number; den?: number; tranh: boolean; kq: DuongDi | null }>({ tranh: false, kq: null })
  const [formDiem] = Form.useForm<GiaTriDiem>()
  const [formTang] = Form.useForm<{ so_tang: number; ten_tang: string; ti_le: number }>()
  const svg = useRef<SVGSVGElement>(null)
  const daKeo = useRef(false)

  const tai = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.soDoMatBang(), api.qlPhong()])
      setSoDo(s)
      setDsPhong(p)
      setMaTang((m) => (m && s.Tang.some((t) => t.MaTang === m) ? m : s.Tang[0]?.MaTang))
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }, [message])
  useEffect(() => { tai() }, [tai])

  const tang = soDo?.Tang.find((t) => t.MaTang === maTang)
  const moiDiem = useMemo(() => new Map((soDo?.Tang ?? []).flatMap((t) => t.Diem.map((d) => [d.MaDiem, { ...d, TenTang: t.TenTang }]))), [soDo])
  const diemTang = useMemo(() => tang?.Diem.map((d) => (keo?.ma === d.MaDiem ? { ...d, ToaDoX: keo.x, ToaDoY: keo.y } : d)) ?? [], [tang, keo])
  const viTri = useMemo(() => new Map(diemTang.map((d) => [d.MaDiem, d])), [diemTang])
  const doanTang = (soDo?.Doan ?? []).filter((d) => viTri.has(d.MaDiemDau) && viTri.has(d.MaDiemCuoi))
  // Điểm có đoạn nối sang tầng khác (cầu thang, thang máy)
  const sangTang = useMemo(() => {
    const m = new Map<number, string[]>()
    for (const d of soDo?.Doan ?? []) {
      if (d.LoaiDoan === 'DI_BO') continue
      for (const [a, b] of [[d.MaDiemDau, d.MaDiemCuoi], [d.MaDiemCuoi, d.MaDiemDau]]) {
        const den = moiDiem.get(b)
        if (den) m.set(a, [...(m.get(a) ?? []), den.TenTang])
      }
    }
    return m
  }, [soDo, moiDiem])

  // Khung vẽ theo kích thước ảnh mặt bằng; chưa có ảnh thì đủ chứa mọi điểm
  const rong = kichThuocAnh?.w ?? Math.max(800, ...diemTang.map((d) => d.ToaDoX + 80))
  const cao = kichThuocAnh?.h ?? Math.max(600, ...diemTang.map((d) => d.ToaDoY + 80))
  useEffect(() => {
    setKichThuocAnh(null)
    if (!tang?.AnhMatBang) return
    const img = new Image()
    img.onload = () => setKichThuocAnh({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = tang.AnhMatBang
  }, [tang?.AnhMatBang])

  const duongDiem = new Set(duong.kq?.Diem ?? [])
  const duongDoan = new Set(duong.kq?.Doan ?? [])

  /** Tọa độ chuột trên khung vẽ (đơn vị điểm ảnh của ảnh mặt bằng). */
  const toaDo = (e: { clientX: number; clientY: number }) => {
    const p = svg.current!.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    const q = p.matrixTransform(svg.current!.getScreenCTM()!.inverse())
    return { x: Math.max(0, Math.round(q.x)), y: Math.max(0, Math.round(q.y)) }
  }

  const bamNen = (e: SuKienChuot<SVGSVGElement>) => {
    if (e.target !== e.currentTarget && (e.target as Element).getAttribute('data-nen') == null) return
    if (cheDo === 'them') {
      const p = toaDo(e)
      setDiemMoi(p)
      formDiem.setFieldsValue({ ten_diem: '', loai_diem: 'HANH_LANG', ma_phong: null, ...p })
    } else {
      setChon({})
    }
  }

  const bamDiem = async (d: DiemNut) => {
    if (daKeo.current) return
    if (cheDo === 'noi') {
      if (diemNoi == null) {
        setDiemNoi(d.MaDiem)
        return
      }
      if (diemNoi === d.MaDiem) {
        setDiemNoi(null)
        return
      }
      try {
        await api.themDoan({ ma_diem_dau: diemNoi, ma_diem_cuoi: d.MaDiem })
        message.success('Đã nối đoạn đường')
        setDiemNoi(d.MaDiem)
        tai()
      } catch (e) {
        message.error(thongBaoLoi(e))
      }
      return
    }
    if (cheDo === 'chi-duong') {
      setDuong((x) => (x.tu == null || x.den != null ? { ...x, tu: d.MaDiem, den: undefined, kq: null } : { ...x, den: d.MaDiem }))
      return
    }
    setChon({ diem: d.MaDiem })
  }

  // Kéo thả điểm ở chế độ Chọn
  const batDauKeo = (e: SuKienChuot, d: DiemNut) => {
    if (cheDo !== 'chon') return
    e.stopPropagation()
    daKeo.current = false
    setKeo({ ma: d.MaDiem, x: d.ToaDoX, y: d.ToaDoY })
  }
  const diChuyen = (e: SuKienChuot<SVGSVGElement>) => {
    if (!keo) return
    daKeo.current = true
    setKeo({ ...keo, ...toaDo(e) })
  }
  const thaKeo = async () => {
    if (!keo) return
    const d = moiDiem.get(keo.ma)
    const cu = keo
    setKeo(null)
    if (!d || !daKeo.current || (d.ToaDoX === cu.x && d.ToaDoY === cu.y)) {
      setTimeout(() => { daKeo.current = false })
      return
    }
    try {
      await api.suaDiem(d.MaDiem, { ten_diem: d.TenDiem, loai_diem: d.LoaiDiem, x: cu.x, y: cu.y, ma_phong: d.MaPhong })
      await tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setTimeout(() => { daKeo.current = false })
    }
  }

  const luuDiemMoi = async (v: GiaTriDiem) => {
    try {
      const { ma_diem } = await api.themDiem({ ...v, ma_tang: maTang!, ten_diem: v.ten_diem || undefined })
      message.success('Đã thêm điểm')
      setDiemMoi(null)
      setChon({ diem: ma_diem })
      tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }

  const timDuong = async () => {
    if (duong.tu == null || duong.den == null) return
    try {
      const kq = await api.chiDuong(duong.tu, duong.den, duong.tranh)
      setDuong((x) => ({ ...x, kq }))
      const dau = moiDiem.get(duong.tu)
      if (dau) setMaTang(dau.MaTang)
    } catch (e) {
      setDuong((x) => ({ ...x, kq: null }))
      message.error(thongBaoLoi(e))
    }
  }
  useEffect(() => { if (duong.tu != null && duong.den != null) timDuong() }, [duong.tu, duong.den, duong.tranh]) // eslint-disable-line react-hooks/exhaustive-deps

  const moTang = (loai: 'moi' | 'sua') => {
    setSuaTang(loai)
    formTang.setFieldsValue(loai === 'moi' || !tang
      ? { so_tang: Math.max(0, ...(soDo?.Tang ?? []).map((t) => t.SoTang)) + 1, ten_tang: '', ti_le: 0.05 }
      : { so_tang: tang.SoTang, ten_tang: tang.TenTang, ti_le: Number(tang.TiLe) })
  }
  const luuTang = async (v: { so_tang: number; ten_tang: string; ti_le: number }) => {
    try {
      if (suaTang === 'moi') {
        const { ma_tang } = await api.themTang(v)
        setMaTang(ma_tang)
      } else if (tang) {
        await api.suaTang(tang.MaTang, v)
      }
      message.success('Đã lưu tầng')
      setSuaTang(null)
      tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }
  const xoaTang = async () => {
    try {
      await api.xoaTang(tang!.MaTang)
      message.success('Đã xóa tầng')
      setMaTang(undefined)
      tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }
  const taiAnh = async (tep: File) => {
    try {
      await api.doiAnhTang(tang!.MaTang, tep)
      message.success('Đã cập nhật ảnh mặt bằng')
      tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
    return false
  }

  if (!soDo) return <Card loading />

  const diemChon = chon.diem != null ? moiDiem.get(chon.diem) : undefined
  const doanChon = chon.doan != null ? soDo.Doan.find((d) => d.MaDoan === chon.doan) : undefined
  const phongChuaCo = dsPhong.filter((p) => p.MaTang === maTang && !p.CoTrenSoDo)
  const r = Math.max(8, Math.round(Math.max(rong, cao) / 90))      // bán kính điểm theo cỡ ảnh

  const HUONG_DAN: Record<CheDo, string> = {
    chon: 'Bấm vào điểm hoặc đoạn đường để xem, sửa; kéo điểm để đổi vị trí.',
    them: 'Bấm vào chỗ trống trên sơ đồ để đặt điểm mới.',
    noi: diemNoi == null ? 'Bấm điểm đầu, rồi bấm lần lượt các điểm tiếp theo để nối thành đường đi bộ.'
      : `Đang nối từ "${moiDiem.get(diemNoi)?.TenDiem}". Bấm điểm tiếp theo, bấm lại điểm này để dừng.`,
    'chi-duong': 'Bấm điểm xuất phát rồi điểm đến (hoặc chọn ở khung bên phải) để thử chỉ đường.',
  }

  return (
    <Flex vertical gap={16}>
      <Card styles={{ body: { padding: nho ? 12 : 16 } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Space wrap>
            <Typography.Title level={4} style={{ margin: 0 }}>Sơ đồ mặt bằng</Typography.Title>
            <Segmented value={maTang} onChange={(v) => { setMaTang(v as number); setChon({}); setDiemNoi(null) }}
              options={soDo.Tang.map((t) => ({ value: t.MaTang, label: t.TenTang }))} />
          </Space>
          <Space wrap>
            <Button icon={<PlusOutlined />} onClick={() => moTang('moi')}>Thêm tầng</Button>
            {tang && (
              <>
                <Button icon={<EditOutlined />} onClick={() => moTang('sua')}>Sửa tầng</Button>
                <Upload accept="image/png,image/jpeg,image/webp" showUploadList={false} beforeUpload={taiAnh}>
                  <Button icon={<PictureOutlined />}>{tang.AnhMatBang ? 'Đổi ảnh mặt bằng' : 'Tải ảnh mặt bằng'}</Button>
                </Upload>
                <Popconfirm title={`Xóa ${tang.TenTang}?`} description="Chỉ xóa được tầng không còn phòng và điểm trên sơ đồ."
                  okText="Xóa" okButtonProps={{ danger: true }} cancelText="Đóng" onConfirm={xoaTang}>
                  <Button danger icon={<DeleteOutlined />} aria-label="Xóa tầng" />
                </Popconfirm>
              </>
            )}
            <Button icon={<ReloadOutlined />} onClick={tai} aria-label="Làm mới" />
          </Space>
        </Flex>
      </Card>

      {!tang ? <Card><Empty description="Chưa có tầng nào. Thêm tầng để bắt đầu vẽ sơ đồ." /></Card> : (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <Card size="small" styles={{ body: { padding: 8 } }}>
              <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 8 }}>
                <Segmented value={cheDo} onChange={(v) => { setCheDo(v as CheDo); setDiemNoi(null); setChon({}) }}
                  options={[
                    { value: 'chon', label: 'Chọn', icon: <SelectOutlined /> },
                    { value: 'them', label: 'Thêm điểm', icon: <PlusOutlined /> },
                    { value: 'noi', label: 'Nối đường', icon: <NodeIndexOutlined /> },
                    { value: 'chi-duong', label: 'Chỉ đường', icon: <AimOutlined /> },
                  ]} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Tỉ lệ {Number(tang.TiLe)} m / điểm ảnh
                </Typography.Text>
              </Flex>
              <Alert type="info" showIcon title={HUONG_DAN[cheDo]} style={{ marginBottom: 8 }} />
              <div style={{ overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa' }}>
                <svg ref={svg} viewBox={`0 0 ${rong} ${cao}`} width="100%" style={{ display: 'block', minWidth: 600, aspectRatio: `${rong} / ${cao}`,
                  cursor: cheDo === 'them' ? 'crosshair' : keo ? 'grabbing' : 'default', userSelect: 'none' }}
                  onClick={bamNen} onMouseMove={diChuyen} onMouseUp={thaKeo} onMouseLeave={thaKeo}>
                  <defs>
                    <pattern id="luoi" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e8e8e8" strokeWidth="1" />
                    </pattern>
                  </defs>
                  {tang.AnhMatBang
                    ? <image href={tang.AnhMatBang} x={0} y={0} width={rong} height={cao} data-nen="" />
                    : <rect x={0} y={0} width={rong} height={cao} fill="url(#luoi)" data-nen="" />}

                  {doanTang.map((d) => {
                    const a = viTri.get(d.MaDiemDau)!
                    const b = viTri.get(d.MaDiemCuoi)!
                    const tren = duongDoan.has(d.MaDoan)
                    const dangChon = chon.doan === d.MaDoan
                    return (
                      <g key={d.MaDoan} style={{ cursor: cheDo === 'chon' ? 'pointer' : undefined }}
                        onClick={(e) => { e.stopPropagation(); if (cheDo === 'chon') setChon({ doan: d.MaDoan }) }}>
                        <line x1={a.ToaDoX} y1={a.ToaDoY} x2={b.ToaDoX} y2={b.ToaDoY} stroke="transparent" strokeWidth={r * 1.6} />
                        <line x1={a.ToaDoX} y1={a.ToaDoY} x2={b.ToaDoX} y2={b.ToaDoY}
                          stroke={tren ? '#f5222d' : dangChon ? '#1677ff' : '#8c8c8c'} strokeWidth={tren || dangChon ? r / 2 : r / 4}
                          strokeLinecap="round" />
                        <text x={(a.ToaDoX + b.ToaDoX) / 2} y={(a.ToaDoY + b.ToaDoY) / 2 - r / 2} fontSize={r * 1.1}
                          textAnchor="middle" fill="#595959" style={{ pointerEvents: 'none' }}>{Number(d.DoDai)} m</text>
                      </g>
                    )
                  })}

                  {diemTang.map((d) => {
                    const loai = TEN_LOAI_DIEM[d.LoaiDiem]
                    const noi = diemNoi === d.MaDiem
                    const dangChon = chon.diem === d.MaDiem
                    const laDauCuoi = d.MaDiem === duong.tu || d.MaDiem === duong.den
                    return (
                      <g key={d.MaDiem} style={{ cursor: cheDo === 'chon' ? 'grab' : 'pointer' }}
                        onMouseDown={(e) => batDauKeo(e, d)} onClick={(e) => { e.stopPropagation(); bamDiem(d) }}>
                        {(noi || dangChon || laDauCuoi) && (
                          <circle cx={d.ToaDoX} cy={d.ToaDoY} r={r * 1.7} fill="none" strokeWidth={r / 3}
                            stroke={laDauCuoi ? '#f5222d' : noi ? '#fa8c16' : '#1677ff'} />
                        )}
                        <circle cx={d.ToaDoX} cy={d.ToaDoY} r={r} fill={loai.mau} stroke="#fff" strokeWidth={r / 4}
                          opacity={duong.kq && !duongDiem.has(d.MaDiem) ? 0.45 : 1} />
                        {sangTang.has(d.MaDiem) && (
                          <text x={d.ToaDoX} y={d.ToaDoY + r * 0.4} fontSize={r * 1.1} textAnchor="middle" fill="#fff"
                            style={{ pointerEvents: 'none' }}>↕</text>
                        )}
                        <text x={d.ToaDoX + r * 1.4} y={d.ToaDoY + r * 0.4} fontSize={r * 1.2} fill="#262626" stroke="#fff"
                          strokeWidth={r / 3} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
                          {d.MaSoPhong ?? d.TenDiem}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
              <Flex wrap gap={8} style={{ marginTop: 8 }}>
                {Object.values(TEN_LOAI_DIEM).map((l) => (
                  <Space key={l.ten} size={4} style={{ fontSize: 12 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: l.mau }} />{l.ten}
                  </Space>
                ))}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>↕ nối sang tầng khác</Typography.Text>
              </Flex>
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Flex vertical gap={16}>
              {cheDo === 'chi-duong' ? (
                <ThuChiDuong soDo={soDo} moiDiem={moiDiem} duong={duong} setDuong={setDuong} onChonTang={setMaTang} />
              ) : diemChon ? (
                <ChiTietDiem key={diemChon.MaDiem} diem={diemChon} soDo={soDo} moiDiem={moiDiem} dsPhong={dsPhong}
                  onXong={() => tai()} onXoa={() => { setChon({}); tai() }} />
              ) : doanChon ? (
                <ChiTietDoan key={doanChon.MaDoan} doan={doanChon} moiDiem={moiDiem} onXong={() => tai()}
                  onXoa={() => { setChon({}); tai() }} />
              ) : (
                <Card size="small" title={`${tang.TenTang}: ${tang.Diem.length} điểm, ${doanTang.length} đoạn đường`}>
                  {phongChuaCo.length > 0 ? (
                    <>
                      <Typography.Paragraph type="warning">
                        {phongChuaCo.length} phòng của tầng chưa có trên sơ đồ nên chưa chỉ đường tới được:
                      </Typography.Paragraph>
                      <Flex wrap gap={6}>{phongChuaCo.map((p) => <Tag key={p.MaPhong}>{p.MaSoPhong}</Tag>)}</Flex>
                      <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                        Chọn "Thêm điểm", bấm vào vị trí cửa phòng, chọn loại "Cửa phòng" rồi nối vào hành lang.
                      </Typography.Paragraph>
                    </>
                  ) : <Typography.Text type="secondary">Mọi phòng của tầng đã có trên sơ đồ.</Typography.Text>}
                </Card>
              )}
            </Flex>
          </Col>
        </Row>
      )}

      <Modal title="Thêm điểm" open={!!diemMoi} onCancel={() => setDiemMoi(null)} okText="Thêm" cancelText="Đóng"
        onOk={() => formDiem.submit()} destroyOnHidden>
        <FormDiem form={formDiem} onFinish={luuDiemMoi} dsPhong={dsPhong.filter((p) => p.MaTang === maTang && !p.CoTrenSoDo)} />
      </Modal>

      <Modal title={suaTang === 'moi' ? 'Thêm tầng' : 'Sửa tầng'} open={!!suaTang} onCancel={() => setSuaTang(null)}
        okText="Lưu" cancelText="Đóng" onOk={() => formTang.submit()} destroyOnHidden>
        <Form form={formTang} layout="vertical" onFinish={luuTang}>
          <Flex gap={12}>
            <Form.Item name="so_tang" label="Số tầng" rules={[{ required: true, message: 'Nhập số tầng' }]} extra="Âm là tầng hầm">
              <InputNumber min={-5} max={50} />
            </Form.Item>
            <Form.Item name="ten_tang" label="Tên tầng" style={{ flex: 1 }} rules={[{ required: true, whitespace: true, message: 'Nhập tên tầng' }]}>
              <Input maxLength={50} placeholder="Tầng 3" />
            </Form.Item>
          </Flex>
          <Form.Item name="ti_le" label="Tỉ lệ (mét trên 1 điểm ảnh)" rules={[{ required: true, message: 'Nhập tỉ lệ' }]}
            extra="Dùng để tính độ dài đoạn đi bộ từ khoảng cách trên ảnh. VD ảnh rộng 1000 điểm ảnh ứng với 50 m thì tỉ lệ 0,05.">
            <InputNumber min={0.0001} max={10} step={0.01} style={{ width: 160 }} />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  )
}

function FormDiem({ form, onFinish, dsPhong }: {
  form: ReturnType<typeof Form.useForm<GiaTriDiem>>[0]; onFinish: (v: GiaTriDiem) => void; dsPhong: PhongQuanLy[]
}) {
  const loai = Form.useWatch('loai_diem', form)
  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item name="loai_diem" label="Loại điểm" rules={[{ required: true }]}>
        <Select options={Object.entries(TEN_LOAI_DIEM).map(([value, l]) => ({ value, label: l.ten }))} />
      </Form.Item>
      {loai === 'PHONG' && (
        <Form.Item name="ma_phong" label="Phòng" rules={[{ required: true, message: 'Chọn phòng' }]}
          extra={dsPhong.length === 0 ? 'Mọi phòng của tầng đã có điểm trên sơ đồ' : undefined}>
          <Select options={dsPhong.map((p) => ({ value: p.MaPhong, label: `${p.MaSoPhong} – ${p.TenPhong}` }))} />
        </Form.Item>
      )}
      <Form.Item name="ten_diem" label="Tên điểm" extra={loai === 'PHONG' ? 'Để trống sẽ đặt là "Cửa <mã phòng>"' : undefined}
        rules={[{ required: loai !== 'PHONG', whitespace: true, message: 'Nhập tên điểm' }]}>
        <Input maxLength={100} />
      </Form.Item>
      <Flex gap={12}>
        <Form.Item name="x" label="X" rules={[{ required: true }]}><InputNumber min={0} max={10000} /></Form.Item>
        <Form.Item name="y" label="Y" rules={[{ required: true }]}><InputNumber min={0} max={10000} /></Form.Item>
      </Flex>
    </Form>
  )
}

type DiemCoTang = DiemNut & { TenTang: string }

/** Sửa / xóa điểm; điểm cầu thang, thang máy được nối sang điểm cùng loại ở tầng khác. */
function ChiTietDiem({ diem, soDo, moiDiem, dsPhong, onXong, onXoa }: {
  diem: DiemCoTang; soDo: SoDoMatBang; moiDiem: Map<number, DiemCoTang>; dsPhong: PhongQuanLy[]
  onXong: () => void; onXoa: () => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm<GiaTriDiem>()
  const [sangTang, setSangTang] = useState<number>()
  useEffect(() => {
    form.setFieldsValue({ ten_diem: diem.TenDiem, loai_diem: diem.LoaiDiem, ma_phong: diem.MaPhong, x: diem.ToaDoX, y: diem.ToaDoY })
  }, [diem, form])

  const luu = async (v: GiaTriDiem) => {
    try {
      await api.suaDiem(diem.MaDiem, v)
      message.success('Đã lưu điểm')
      onXong()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }
  const xoa = async () => {
    try {
      await api.xoaDiem(diem.MaDiem)
      message.success('Đã xóa điểm')
      onXoa()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }
  const noiTang = async () => {
    if (!sangTang) return
    try {
      await api.themDoan({ ma_diem_dau: diem.MaDiem, ma_diem_cuoi: sangTang, loai_doan: diem.LoaiDiem as 'CAU_THANG' | 'THANG_MAY' })
      message.success('Đã nối sang tầng khác')
      setSangTang(undefined)
      onXong()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }

  const doanNoi = soDo.Doan.filter((d) => d.MaDiemDau === diem.MaDiem || d.MaDiemCuoi === diem.MaDiem)
  const laLienTang = diem.LoaiDiem === 'CAU_THANG' || diem.LoaiDiem === 'THANG_MAY'
  const ungVien = laLienTang ? [...moiDiem.values()].filter((d) => d.LoaiDiem === diem.LoaiDiem && d.MaTang !== diem.MaTang
    && !doanNoi.some((x) => x.MaDiemDau === d.MaDiem || x.MaDiemCuoi === d.MaDiem)) : []

  return (
    <Card size="small" title={diem.TenDiem} extra={<Tag color={TEN_LOAI_DIEM[diem.LoaiDiem].mau}>{TEN_LOAI_DIEM[diem.LoaiDiem].ten}</Tag>}>
      <FormDiem form={form} onFinish={luu}
        dsPhong={dsPhong.filter((p) => p.MaTang === diem.MaTang && (!p.CoTrenSoDo || p.MaPhong === diem.MaPhong))} />
      <Space>
        <Button type="primary" onClick={() => form.submit()}>Lưu</Button>
        <Popconfirm title="Xóa điểm này?" description={doanNoi.length ? `${doanNoi.length} đoạn đường nối vào điểm cũng bị xóa.` : undefined}
          okText="Xóa" okButtonProps={{ danger: true }} cancelText="Đóng" onConfirm={xoa}>
          <Button danger icon={<DeleteOutlined />}>Xóa</Button>
        </Popconfirm>
      </Space>
      <Typography.Title level={5} style={{ marginTop: 16 }}>Nối với ({doanNoi.length})</Typography.Title>
      {doanNoi.length === 0 ? <Typography.Text type="warning">Điểm chưa nối với điểm nào</Typography.Text> : (
        <Flex vertical gap={4}>
          {doanNoi.map((d) => {
            const kia = moiDiem.get(d.MaDiemDau === diem.MaDiem ? d.MaDiemCuoi : d.MaDiemDau)
            return (
              <div key={d.MaDoan} style={{ fontSize: 13 }}>
                {kia?.TenDiem}{kia && kia.MaTang !== diem.MaTang && ` (${kia.TenTang})`} ·{' '}
                <Typography.Text type="secondary">
                  {d.LoaiDoan === 'DI_BO' ? `${Number(d.DoDai)} m` : TEN_DOAN[d.LoaiDoan]} · {phutGiay(thoiGianDoan(d))}
                </Typography.Text>
              </div>
            )
          })}
        </Flex>
      )}
      {laLienTang && (
        <>
          <Typography.Title level={5} style={{ marginTop: 16 }}>
            Nối {diem.LoaiDiem === 'CAU_THANG' ? 'cầu thang' : 'thang máy'} sang tầng khác
          </Typography.Title>
          <Space.Compact style={{ width: '100%' }}>
            <Select style={{ flex: 1 }} placeholder={ungVien.length ? 'Chọn điểm ở tầng khác' : 'Không còn điểm cùng loại để nối'}
              value={sangTang} onChange={setSangTang} disabled={!ungVien.length}
              options={ungVien.map((d) => ({ value: d.MaDiem, label: `${d.TenTang} – ${d.TenDiem}` }))} />
            <Button type="primary" disabled={!sangTang} onClick={noiTang}>Nối</Button>
          </Space.Compact>
        </>
      )}
    </Card>
  )
}

function ChiTietDoan({ doan, moiDiem, onXong, onXoa }: {
  doan: DoanDuong; moiDiem: Map<number, DiemCoTang>; onXong: () => void; onXoa: () => void
}) {
  const { message } = App.useApp()
  const [doDai, setDoDai] = useState<number | null>(Number(doan.DoDai))
  const a = moiDiem.get(doan.MaDiemDau)
  const b = moiDiem.get(doan.MaDiemCuoi)
  const luu = async () => {
    try {
      await api.suaDoDai(doan.MaDoan, doDai ?? 0)
      message.success('Đã lưu độ dài')
      onXong()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }
  const xoa = async () => {
    try {
      await api.xoaDoan(doan.MaDoan)
      message.success('Đã xóa đoạn đường')
      onXoa()
    } catch (e) {
      message.error(thongBaoLoi(e))
    }
  }
  return (
    <Card size="small" title="Đoạn đường">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Từ">{a?.TenDiem} ({a?.TenTang})</Descriptions.Item>
        <Descriptions.Item label="Đến">{b?.TenDiem} ({b?.TenTang})</Descriptions.Item>
        <Descriptions.Item label="Loại">{TEN_DOAN[doan.LoaiDoan]}</Descriptions.Item>
        <Descriptions.Item label="Thời gian đi">{phutGiay(thoiGianDoan(doan))}</Descriptions.Item>
      </Descriptions>
      {doan.LoaiDoan === 'DI_BO' && (
        <Space.Compact style={{ marginBottom: 12 }}>
          <InputNumber min={0} max={99999} step={0.5} value={doDai} onChange={setDoDai} suffix="m" style={{ width: 140 }} />
          <Button onClick={luu}>Lưu độ dài</Button>
        </Space.Compact>
      )}
      {doan.LoaiDoan === 'DI_BO' && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Độ dài tự tính theo khoảng cách trên ảnh x tỉ lệ tầng; sửa tay khi đường thực tế dài hơn (VD vòng qua cửa).
          Kéo điểm sẽ tính lại theo tọa độ.
        </Typography.Paragraph>
      )}
      <Popconfirm title="Xóa đoạn đường này?" okText="Xóa" okButtonProps={{ danger: true }} cancelText="Đóng" onConfirm={xoa}>
        <Button danger icon={<DeleteOutlined />}>Xóa đoạn</Button>
      </Popconfirm>
    </Card>
  )
}

/** Thử thuật toán chỉ đường (Dijkstra, BR22) giữa hai điểm bất kỳ, kể cả khác tầng. */
function ThuChiDuong({ soDo, moiDiem, duong, setDuong, onChonTang }: {
  soDo: SoDoMatBang; moiDiem: Map<number, DiemCoTang>
  duong: { tu?: number; den?: number; tranh: boolean; kq: DuongDi | null }
  setDuong: (f: (x: { tu?: number; den?: number; tranh: boolean; kq: DuongDi | null }) => typeof x) => void
  onChonTang: (maTang: number) => void
}) {
  const luaChon = soDo.Tang.map((t) => ({
    label: t.TenTang,
    options: t.Diem.map((d) => ({ value: d.MaDiem, label: d.MaSoPhong ? `${d.MaSoPhong} – ${d.TenPhong}` : d.TenDiem })),
  }))
  const doanTheoMa = new Map(soDo.Doan.map((d) => [d.MaDoan, d]))
  return (
    <Card size="small" title="Thử chỉ đường">
      <Flex vertical gap={8}>
        <Select showSearch optionFilterProp="label" placeholder="Điểm xuất phát" value={duong.tu} options={luaChon}
          onChange={(tu) => setDuong((x) => ({ ...x, tu, kq: null }))} />
        <Select showSearch optionFilterProp="label" placeholder="Điểm đến" value={duong.den} options={luaChon}
          onChange={(den) => setDuong((x) => ({ ...x, den, kq: null }))} />
        <Checkbox checked={duong.tranh} onChange={(e) => setDuong((x) => ({ ...x, tranh: e.target.checked }))}>
          Tránh cầu thang bộ (người đi lại khó khăn)
        </Checkbox>
      </Flex>
      {duong.kq && (
        <>
          <Typography.Paragraph style={{ marginTop: 12 }}>
            Thời gian dự kiến: <Typography.Text strong>{phutGiay(duong.kq.TongGiay)}</Typography.Text>
          </Typography.Paragraph>
          <Timeline items={duong.kq.Diem.map((ma, i) => {
            const d = moiDiem.get(ma)
            const doan = i > 0 ? doanTheoMa.get(duong.kq!.Doan[i - 1]) : undefined
            return {
              color: i === 0 ? 'green' : i === duong.kq!.Diem.length - 1 ? 'red' : 'blue',
              content: (
                <span style={{ cursor: 'pointer' }} onClick={() => d && onChonTang(d.MaTang)}>
                  {d?.TenDiem} <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {d?.TenTang}{doan && ` · ${doan.LoaiDoan === 'DI_BO' ? `${Number(doan.DoDai)} m` : TEN_DOAN[doan.LoaiDoan]}`}
                  </Typography.Text>
                </span>
              ),
            }
          })} />
        </>
      )}
    </Card>
  )
}
