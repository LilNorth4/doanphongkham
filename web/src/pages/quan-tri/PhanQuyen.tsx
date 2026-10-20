import {
  CheckOutlined, LockOutlined, SafetyCertificateOutlined, StopOutlined, UndoOutlined, UserOutlined,
} from '@ant-design/icons'
import {
  Alert, App, Badge, Button, Card, Checkbox, Col, Collapse, Empty, Flex, Modal, Row, Skeleton, Space, Spin, Table, Tabs, Tag,
  Tooltip, Typography, theme, type TableProps,
} from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, LoiApi, type BangPhanQuyen, type QuyenDong, type TaiKhoan, type VaiTro } from '@/lib/api'
import { usePhien } from '@/lib/auth'
import { MAU_VAI_TRO } from '@/lib/hangSo'

// Bỏ các quyền này khỏi quản trị viên sẽ khóa luôn màn hình quản trị (khớp cap_nhat_quyen_vai_tro)
const QUYEN_GIU_CHO_QUAN_TRI = ['TAI_KHOAN.QUAN_LY', 'VAI_TRO.QUAN_LY']

function theoNhom(quyen: QuyenDong[]) {
  const nhom = new Map<string, QuyenDong[]>()
  quyen.forEach((q) => nhom.set(q.NhomChucNang, [...(nhom.get(q.NhomChucNang) ?? []), q]))
  return [...nhom.entries()]
}

/** Phân quyền riêng một tài khoản: chỉ bật/tắt trong các quyền vai trò của người đó đang có. */
function QuyenTaiKhoan({ tk, quyenVaiTro, boRieng, onDong, onDaLuu }: {
  tk: TaiKhoan
  quyenVaiTro: QuyenDong[]
  boRieng: string[]
  onDong: () => void
  onDaLuu: () => Promise<void>
}) {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const goc = useMemo(() => new Set(quyenVaiTro.map((q) => q.MaCode).filter((m) => !boRieng.includes(m))),
    [quyenVaiTro, boRieng])
  const [chon, setChon] = useState<Set<string>>(goc)
  const [dangLuu, setDangLuu] = useState(false)
  const khoa = (ma: string) => tk.VaiTro === 'QUAN_TRI' && QUYEN_GIU_CHO_QUAN_TRI.includes(ma)
  const doi = chon.size !== goc.size || [...chon].some((q) => !goc.has(q))
  const bat = (ma: string, co: boolean) => setChon((c) => {
    const m = new Set(c)
    if (co) m.add(ma)
    else m.delete(ma)
    return m
  })

  const luu = async () => {
    setDangLuu(true)
    try {
      await api.luuQuyenTaiKhoan(tk.MaTK, [...chon])
      message.success(`Đã cập nhật quyền của ${tk.HoTen ?? tk.Email}`)
      await onDaLuu()
      onDong()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Lưu thất bại')
    } finally {
      setDangLuu(false)
    }
  }

  return (
    <Modal open width={640} onCancel={onDong} title={<><UserOutlined /> Quyền của {tk.HoTen ?? tk.Email ?? tk.SDT}</>}
      footer={[
        <Button key="dat-lai" icon={<UndoOutlined />} disabled={chon.size === quyenVaiTro.length}
          onClick={() => setChon(new Set(quyenVaiTro.map((q) => q.MaCode)))}>Theo đủ quyền vai trò</Button>,
        <Button key="huy" onClick={onDong}>Hủy</Button>,
        <Button key="luu" type="primary" disabled={!doi} loading={dangLuu} onClick={luu}>Lưu</Button>,
      ]}>
      <Typography.Paragraph type="secondary">
        {tk.TenVaiTro} · {[tk.Email, tk.SDT].filter(Boolean).join(' · ')}<br />
        Chỉ chọn trong {quyenVaiTro.length} quyền của vai trò {tk.TenVaiTro}. Bỏ tích là người này không dùng
        được chức năng đó, các người khác cùng vai trò không bị ảnh hưởng.
      </Typography.Paragraph>
      {quyenVaiTro.length === 0 ? <Empty description="Vai trò này chưa có quyền nào" /> : (
        <Flex vertical gap={12}>
          {theoNhom(quyenVaiTro).map(([ten, ds]) => (
            <Card key={ten} size="small" title={ten}>
              <Flex vertical gap={8}>
                {ds.map((q) => {
                  const biBo = goc.has(q.MaCode) && !chon.has(q.MaCode)
                  const moi = !goc.has(q.MaCode) && chon.has(q.MaCode)
                  return (
                    <Checkbox key={q.MaCode} checked={chon.has(q.MaCode)} disabled={khoa(q.MaCode)}
                      onChange={(e) => bat(q.MaCode, e.target.checked)}>
                      <span style={{
                        color: moi ? token.colorSuccess : biBo ? token.colorError : undefined,
                        textDecoration: biBo ? 'line-through' : undefined,
                      }}>{q.TenQuyen}</span>{' '}
                      {khoa(q.MaCode) && (
                        <Tooltip title="Quản trị viên luôn giữ quyền này để không tự khóa mình khỏi hệ thống">
                          <LockOutlined style={{ color: token.colorTextTertiary }} />
                        </Tooltip>
                      )}
                    </Checkbox>
                  )
                })}
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Modal>
  )
}

/** UC2.7: bảng quyền theo vai trò. Mỗi tài khoản nhận quyền của vai trò, có hiệu lực ngay ở yêu cầu kế tiếp. */
export default function PhanQuyen() {
  const { message, modal } = App.useApp()
  const { token } = theme.useToken()
  const { nguoiDung, taiLai } = usePhien()
  const [bang, setBang] = useState<BangPhanQuyen | null>(null)
  // Vai trò đang mở trong danh sách (null: đóng hết)
  const [vaiTro, setVaiTro] = useState<VaiTro | null>(null)
  const [chon, setChon] = useState<Set<string>>(new Set())
  const [dangLuu, setDangLuu] = useState(false)
  const [thanhVien, setThanhVien] = useState<Partial<Record<VaiTro, TaiKhoan[]>>>({})
  const [suaTk, setSuaTk] = useState<TaiKhoan | null>(null)

  const tai = useCallback(async () => {
    try {
      setBang(await api.bangPhanQuyen())
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không tải được bảng phân quyền')
    }
  }, [message])

  useEffect(() => { tai() }, [tai])
  useEffect(() => { if (bang && vaiTro) setChon(new Set(bang.gan[vaiTro])) }, [bang, vaiTro])

  // Mở vai trò nào thì tải tên các tài khoản thuộc vai trò đó (một lần)
  useEffect(() => {
    if (!vaiTro || thanhVien[vaiTro]) return
    api.dsTaiKhoan({ vai_tro: vaiTro })
      .then((ds) => setThanhVien((m) => ({ ...m, [vaiTro]: ds })))
      .catch((e) => message.error(e instanceof LoiApi ? e.message : 'Không tải được danh sách tài khoản'))
  }, [vaiTro, thanhVien, message])

  const nhom = useMemo(() => theoNhom(bang?.quyen ?? []), [bang])
  const goc = useMemo(() => new Set(vaiTro ? bang?.gan[vaiTro] ?? [] : []), [bang, vaiTro])
  const them = [...chon].filter((q) => !goc.has(q))
  const bo = [...goc].filter((q) => !chon.has(q))
  const doi = them.length + bo.length > 0
  const tenQuyen = (ma: string) => bang?.quyen.find((q) => q.MaCode === ma)?.TenQuyen ?? ma
  const vt = bang?.vai_tro.find((v) => v.MaCode === vaiTro)
  const khoa = (ma: string) => vaiTro === 'QUAN_TRI' && QUYEN_GIU_CHO_QUAN_TRI.includes(ma)

  const doiVaiTro = (moi: VaiTro | null) => {
    if (!doi) {
      setVaiTro(moi)
      return
    }
    modal.confirm({
      title: 'Bỏ các thay đổi chưa lưu?', okText: 'Bỏ thay đổi', cancelText: 'Ở lại',
      onOk: () => setVaiTro(moi),
    })
  }

  const bat = (ma: string, co: boolean) => setChon((c) => {
    const m = new Set(c)
    if (co) m.add(ma)
    else m.delete(ma)
    return m
  })

  const luu = () => modal.confirm({
    title: `Lưu phân quyền cho ${vt?.TenVaiTro}?`,
    width: 520,
    content: (
      <div>
        <p>Thay đổi áp dụng ngay cho <b>{vt?.SoTaiKhoan} tài khoản</b> thuộc vai trò này.</p>
        {them.length > 0 && <p><Typography.Text type="success">Thêm:</Typography.Text> {them.map(tenQuyen).join(', ')}</p>}
        {bo.length > 0 && <p><Typography.Text type="danger">Bỏ:</Typography.Text> {bo.map(tenQuyen).join(', ')}</p>}
      </div>
    ),
    okText: 'Lưu',
    cancelText: 'Hủy',
    onOk: async () => {
      setDangLuu(true)
      try {
        await api.luuPhanQuyen(vaiTro!, [...chon])
        message.success('Đã cập nhật phân quyền')
        await tai()
        if (nguoiDung?.VaiTro === vaiTro) await taiLai() // menu của chính mình đổi theo
      } catch (e) {
        message.error(e instanceof LoiApi ? e.message : 'Lưu thất bại')
      } finally {
        setDangLuu(false)
      }
    },
  })

  if (!bang) return <Card><Skeleton active paragraph={{ rows: 10 }} /></Card>

  const phamVi = new Set(vaiTro ? bang.nhom_vai_tro[vaiTro] ?? [] : [])
  const nhomCo = nhom.filter(([ten]) => phamVi.has(ten))
  const nhomKhong = nhom.filter(([ten]) => !phamVi.has(ten))

  const noiDungVaiTro = () => {
    const ds = vaiTro ? thanhVien[vaiTro] : undefined
    return (
      <Flex vertical gap={16}>
        {vt?.MoTa && <Typography.Text type="secondary">{vt.MoTa}</Typography.Text>}

        <div>
          <Typography.Text strong><UserOutlined /> Tài khoản thuộc vai trò ({vt?.SoTaiKhoan})</Typography.Text>{' '}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>· bấm vào tên để phân quyền riêng người đó</Typography.Text>
          <div style={{ marginTop: 8 }}>
            {!ds ? <Spin size="small" /> : ds.length === 0
              ? <Typography.Text type="secondary">Chưa có tài khoản nào</Typography.Text>
              : (
                <Flex wrap gap={6}>
                  {ds.map((tk) => {
                    const soBo = bang.bo_rieng[tk.MaTK]?.length ?? 0
                    return (
                      <Tooltip key={tk.MaTK} title={[tk.Email, tk.SDT].filter(Boolean).join(' · ')
                        + (soBo ? ` · bớt ${soBo} quyền so với vai trò` : '')}>
                        <Tag color={tk.TrangThai === 'BI_KHOA' ? 'error' : tk.TrangThai === 'CHUA_KICH_HOAT' ? 'default' : 'processing'}
                          style={{ marginInlineEnd: 0, cursor: 'pointer' }} onClick={() => setSuaTk(tk)}>
                          {tk.HoTen ?? tk.Email ?? tk.SDT}
                          {tk.TrangThai === 'BI_KHOA' && ' (bị khóa)'}
                          {tk.TrangThai === 'CHUA_KICH_HOAT' && ' (chưa kích hoạt)'}
                          {soBo > 0 && <Typography.Text type="warning" style={{ fontSize: 12 }}> −{soBo} quyền</Typography.Text>}
                        </Tag>
                      </Tooltip>
                    )
                  })}
                </Flex>
              )}
          </div>
        </div>

        {vaiTro === 'BENH_NHAN' && (
          <Alert type="warning" showIcon
            title="Vai trò Bệnh nhân áp dụng cho mọi tài khoản bệnh nhân tự đăng ký, hãy cân nhắc trước khi thay đổi." />
        )}

        <Flex justify="space-between" align="center" wrap gap={12}>
          <Typography.Text strong>
            <SafetyCertificateOutlined /> Quyền ({chon.size}/{nhomCo.reduce((n, [, ds]) => n + ds.length, 0)})
          </Typography.Text>
          <Space>
            <Button icon={<UndoOutlined />} disabled={!doi} onClick={() => setChon(new Set(goc))}>Hoàn tác</Button>
            <Button type="primary" disabled={!doi} loading={dangLuu} onClick={luu}>
              Lưu thay đổi{doi ? ` (${them.length + bo.length})` : ''}
            </Button>
          </Space>
        </Flex>

        {nhomCo.length === 0 ? <Empty description="Vai trò này chưa được giao nhóm chức năng nào" /> : (
          <Row gutter={[16, 16]}>
            {nhomCo.map(([ten, dsQuyen]) => {
              const coTrongNhom = dsQuyen.filter((q) => chon.has(q.MaCode)).length
              const moKhoa = dsQuyen.filter((q) => !khoa(q.MaCode))
              return (
                <Col xs={24} md={12} xl={8} key={ten}>
                  <Card size="small" style={{ height: '100%' }} title={
                    <Checkbox
                      checked={coTrongNhom === dsQuyen.length}
                      indeterminate={coTrongNhom > 0 && coTrongNhom < dsQuyen.length}
                      onChange={(e) => moKhoa.forEach((q) => bat(q.MaCode, e.target.checked))}>
                      {ten} <Typography.Text type="secondary">({coTrongNhom}/{dsQuyen.length})</Typography.Text>
                    </Checkbox>
                  }>
                    <Flex vertical gap={8}>
                      {dsQuyen.map((q) => {
                        const moi = them.includes(q.MaCode)
                        const biBo = bo.includes(q.MaCode)
                        return (
                          <Checkbox key={q.MaCode} checked={chon.has(q.MaCode)} disabled={khoa(q.MaCode)}
                            onChange={(e) => bat(q.MaCode, e.target.checked)}>
                            <span style={{
                              color: moi ? token.colorSuccess : biBo ? token.colorError : undefined,
                              textDecoration: biBo ? 'line-through' : undefined,
                            }}>{q.TenQuyen}</span>{' '}
                            {khoa(q.MaCode) && (
                              <Tooltip title="Quản trị viên luôn giữ quyền này để không tự khóa mình khỏi hệ thống">
                                <LockOutlined style={{ color: token.colorTextTertiary }} />
                              </Tooltip>
                            )}
                            <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{q.MaCode}</Typography.Text></div>
                          </Checkbox>
                        )
                      })}
                    </Flex>
                  </Card>
                </Col>
              )
            })}
          </Row>
        )}

        {nhomKhong.length > 0 && (
          <div>
            <Typography.Text type="secondary">
              Nhóm chức năng không thuộc vai trò {vt?.TenVaiTro} ({nhomKhong.length}):
            </Typography.Text>
            <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
              {nhomKhong.map(([ten, dsQuyen]) => (
                <Col xs={24} md={12} xl={8} key={ten}>
                  <Card size="small" style={{ height: '100%', background: token.colorFillQuaternary }}>
                    <Flex justify="space-between" align="center" gap={8}>
                      <Typography.Text type="secondary" strong>{ten}</Typography.Text>
                      <Tag icon={<StopOutlined />} style={{ marginInlineEnd: 0 }}>Không có quyền</Tag>
                    </Flex>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {dsQuyen.map((q) => q.TenQuyen).join(' · ')}
                    </Typography.Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Flex>
    )
  }

  const cotMaTran: TableProps<QuyenDong>['columns'] = [
    {
      title: 'Quyền', dataIndex: 'TenQuyen', fixed: 'left', width: 260,
      render: (ten, q) => (
        <div>
          {ten}
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{q.MaCode}</Typography.Text></div>
        </div>
      ),
    },
    ...bang.vai_tro.map((v) => ({
      title: <Tag color={MAU_VAI_TRO[v.MaCode]} style={{ marginInlineEnd: 0 }}>{v.TenVaiTro}</Tag>,
      key: v.MaCode, align: 'center' as const, width: 120,
      render: (_: unknown, q: QuyenDong) => !q.MaCode ? null
        : bang.gan[v.MaCode].includes(q.MaCode)
          ? <CheckOutlined style={{ color: token.colorSuccess, fontSize: 16 }} />
          : !bang.nhom_vai_tro[v.MaCode]?.includes(q.NhomChucNang)
            ? <Tooltip title="Nhóm chức năng không thuộc vai trò"><Typography.Text type="secondary">—</Typography.Text></Tooltip>
            : null,
    })),
  ]
  const dongMaTran = nhom.flatMap(([ten, ds]) => [{ MaQuyen: -ds[0].MaQuyen, MaCode: '', TenQuyen: ten, NhomChucNang: ten }, ...ds])

  return (
    <Card>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}><SafetyCertificateOutlined /> Phân quyền</Typography.Title>
      </Flex>
      <Tabs items={[
        {
          key: 'vai-tro', label: 'Theo vai trò',
          children: (
            <Collapse accordion activeKey={vaiTro ?? undefined} destroyOnHidden
              onChange={(k) => doiVaiTro(((Array.isArray(k) ? k[0] : k) as VaiTro) ?? null)}
              items={bang.vai_tro.map((v) => ({
                key: v.MaCode,
                label: (
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text strong>{v.TenVaiTro}</Typography.Text>
                    <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {v.SoTaiKhoan} tài khoản · {bang.gan[v.MaCode].length} quyền
                    </Typography.Text></div>
                  </div>
                ),
                extra: v.MaCode === vaiTro && doi ? <Badge status="warning" text="Chưa lưu" /> : null,
                children: v.MaCode === vaiTro ? noiDungVaiTro() : null,
              }))} />
          ),
        },
        {
          key: 'ma-tran', label: 'Ma trận quyền',
          children: (
            <Table rowKey="MaQuyen" size="small" columns={cotMaTran} dataSource={dongMaTran} pagination={false}
              scroll={{ x: 'max-content' }}
              onRow={(q) => q.MaQuyen < 0 ? { style: { background: token.colorFillQuaternary, fontWeight: 600 } } : {}} />
          ),
        },
      ]} />
      {suaTk && (
        <QuyenTaiKhoan tk={suaTk} onDong={() => setSuaTk(null)}
          quyenVaiTro={bang.quyen.filter((q) => bang.gan[suaTk.VaiTro].includes(q.MaCode))}
          boRieng={bang.bo_rieng[suaTk.MaTK] ?? []}
          onDaLuu={async () => {
            await tai()
            if (nguoiDung?.MaTK === suaTk.MaTK) await taiLai() // menu của chính mình đổi theo
          }} />
      )}
    </Card>
  )
}
