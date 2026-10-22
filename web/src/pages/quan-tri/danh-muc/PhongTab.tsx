import { EditOutlined, EnvironmentOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Button, Flex, Form, Input, Modal, Select, Space, Tag, Tooltip, Typography, type TableProps } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import BangThichUng from '@/components/BangThichUng'
import { api, type ChuyenKhoaQuanLy, type LoaiPhong, type PhongQuanLy } from '@/lib/api'
import { quyTac, TEN_LOAI_PHONG } from '@/lib/hangSo'
import { CongTacTrangThai, TagTrangThai, thongBaoLoi } from './chung'

interface GiaTri { ma_so_phong: string; ten_phong: string; ma_tang: number; loai_phong: LoaiPhong; ma_ck?: number | null }

/** Phòng khám bệnh (thuộc chuyên khoa) và phòng cận lâm sàng; vị trí phòng vẽ ở trang Sơ đồ mặt bằng. */
export default function PhongTab() {
  const { message } = App.useApp()
  const [ds, setDs] = useState<PhongQuanLy[]>([])
  const [dsTang, setDsTang] = useState<{ MaTang: number; TenTang: string }[]>([])
  const [dsCk, setDsCk] = useState<ChuyenKhoaQuanLy[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [loc, setLoc] = useState<{ tang?: number; loai?: LoaiPhong }>({})
  const [sua, setSua] = useState<PhongQuanLy | 'moi' | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const [form] = Form.useForm<GiaTri>()
  const loaiPhong = Form.useWatch('loai_phong', form)

  const tai = useCallback(async () => {
    setDangTai(true)
    try {
      const [p, t, c] = await Promise.all([api.qlPhong(), api.dsTang(), api.qlChuyenKhoa()])
      setDs(p)
      setDsTang(t)
      setDsCk(c)
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangTai(false)
    }
  }, [message])
  useEffect(() => { tai() }, [tai])

  const hienThi = useMemo(() => ds.filter((p) => (!loc.tang || p.MaTang === loc.tang) && (!loc.loai || p.LoaiPhong === loc.loai)),
    [ds, loc])

  const mo = (p: PhongQuanLy | 'moi') => {
    setSua(p)
    form.setFieldsValue(p === 'moi'
      ? { ma_so_phong: '', ten_phong: '', ma_tang: loc.tang ?? dsTang[0]?.MaTang, loai_phong: 'KHAM_BENH', ma_ck: null }
      : { ma_so_phong: p.MaSoPhong, ten_phong: p.TenPhong, ma_tang: p.MaTang, loai_phong: p.LoaiPhong, ma_ck: p.MaCK })
  }

  const luu = async (v: GiaTri) => {
    setDangLuu(true)
    try {
      const b = { ...v, ma_ck: v.loai_phong === 'KHAM_BENH' ? v.ma_ck : null }
      if (sua === 'moi') await api.themPhong(b)
      else if (sua) await api.suaPhong(sua.MaPhong, b)
      message.success('Đã lưu phòng')
      setSua(null)
      tai()
    } catch (e) {
      message.error(thongBaoLoi(e))
    } finally {
      setDangLuu(false)
    }
  }

  const cot: TableProps<PhongQuanLy>['columns'] = [
    {
      title: 'Phòng', key: 'phong',
      render: (_, p) => (
        <div>
          <Typography.Text strong>{p.MaSoPhong}</Typography.Text> – {p.TenPhong}
          {!p.CoTrenSoDo && (
            <Tooltip title="Phòng chưa có điểm trên sơ đồ mặt bằng nên chưa chỉ đường tới được">
              <Tag color="warning" style={{ marginInlineStart: 8 }}><EnvironmentOutlined /> Chưa có trên sơ đồ</Tag>
            </Tooltip>
          )}
        </div>
      ),
    },
    { title: 'Tầng', dataIndex: 'TenTang', width: 90 },
    { title: 'Loại', dataIndex: 'LoaiPhong', render: (l: LoaiPhong) => TEN_LOAI_PHONG[l], width: 120 },
    { title: 'Chuyên khoa', dataIndex: 'TenCK', render: (t) => t ?? '—' },
    { title: 'Trạng thái', dataIndex: 'TrangThai', render: (t) => <TagTrangThai tt={t} />, width: 110 },
    {
      title: '', key: 'thao_tac', width: 110, align: 'right',
      render: (_, p) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => mo(p)} aria-label="Sửa" />
          <CongTacTrangThai loai="phong" ma={p.MaPhong} tt={p.TrangThai} ten={`phòng ${p.MaSoPhong}`} onXong={tai} />
        </Space>
      ),
    },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 12 }}>
        <Space wrap>
          <Select allowClear placeholder="Tất cả tầng" style={{ width: 140 }} value={loc.tang}
            onChange={(tang) => setLoc({ ...loc, tang })} options={dsTang.map((t) => ({ value: t.MaTang, label: t.TenTang }))} />
          <Select allowClear placeholder="Tất cả loại phòng" style={{ width: 170 }} value={loc.loai}
            onChange={(loai) => setLoc({ ...loc, loai })}
            options={Object.entries(TEN_LOAI_PHONG).map(([value, label]) => ({ value, label }))} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => mo('moi')} disabled={dsTang.length === 0}>Thêm phòng</Button>
      </Flex>
      <BangThichUng rowKey="MaPhong" columns={cot} dataSource={hienThi} loading={dangTai} pagination={{ pageSize: 15 }} />

      <Modal title={sua === 'moi' ? 'Thêm phòng' : `Sửa phòng ${sua?.MaSoPhong ?? ''}`} open={!!sua}
        onCancel={() => setSua(null)} okText="Lưu" cancelText="Đóng" confirmLoading={dangLuu} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={luu}>
          <Flex gap={12}>
            <Form.Item name="ma_so_phong" label="Mã số phòng" style={{ width: 140 }}
              rules={[quyTac.batBuoc('mã số phòng'), { pattern: /^[A-Za-z0-9-]{1,10}$/, message: 'VD P101' }]}>
              <Input maxLength={10} placeholder="P101" />
            </Form.Item>
            <Form.Item name="ten_phong" label="Tên phòng" style={{ flex: 1 }} rules={[quyTac.batBuoc('tên phòng')]}>
              <Input maxLength={100} />
            </Form.Item>
          </Flex>
          <Flex gap={12}>
            <Form.Item name="ma_tang" label="Tầng" style={{ width: 140 }} rules={[{ required: true, message: 'Chọn tầng' }]}>
              <Select options={dsTang.map((t) => ({ value: t.MaTang, label: t.TenTang }))} />
            </Form.Item>
            <Form.Item name="loai_phong" label="Loại phòng" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Select options={Object.entries(TEN_LOAI_PHONG).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
          </Flex>
          {loaiPhong === 'KHAM_BENH' && (
            <Form.Item name="ma_ck" label="Chuyên khoa" rules={[{ required: true, message: 'Phòng khám bệnh phải thuộc một chuyên khoa' }]}>
              <Select placeholder="Chọn chuyên khoa"
                options={dsCk.filter((c) => c.TrangThai === 'HOAT_DONG').map((c) => ({ value: c.MaCK, label: c.TenCK }))} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  )
}
