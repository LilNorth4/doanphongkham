import { Descriptions, Empty, Flex, List, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import type { HoSoBenhAn, LanKham, PhieuChiDinh } from '@/lib/api'
import { TEN_LOAI_DV, thuNgay, TRANG_THAI_PHIEU_CLS } from '@/lib/hangSo'

const MAU_DANH_GIA = { BINH_THUONG: undefined, CAO: 'red', THAP: 'orange' } as const
const TEN_DANH_GIA = { BINH_THUONG: '', CAO: '↑ Cao', THAP: '↓ Thấp' } as const

/** Kết quả cận lâm sàng của từng phiếu: chỉ số xét nghiệm (đánh dấu bất thường) hoặc mô tả, kết luận. */
export function DsKetQuaCls({ ds, anTrangThai }: { ds: PhieuChiDinh[]; anTrangThai?: boolean }) {
  if (ds.length === 0) return <Typography.Text type="secondary">Không có chỉ định cận lâm sàng</Typography.Text>
  return (
    <Flex vertical gap={12}>
      {ds.map((p) => (
        <div key={p.MaPCD} style={{ borderLeft: '3px solid #d9d9d9', paddingLeft: 12 }}>
          <Flex gap={8} wrap align="center">
            <Typography.Text strong>{p.TenDV}</Typography.Text>
            <Tag>{TEN_LOAI_DV[p.LoaiDV]}</Tag>
            {!anTrangThai && <Tag color={TRANG_THAI_PHIEU_CLS[p.TrangThai].mau}>{TRANG_THAI_PHIEU_CLS[p.TrangThai].ten}</Tag>}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Phòng {p.MaSoPhong}</Typography.Text>
          </Flex>
          {p.TrangThai === 'DA_HUY' && p.LyDoHuy && <Typography.Text type="secondary">Lý do hủy: {p.LyDoHuy}</Typography.Text>}
          {p.ChiSo.length > 0 && (
            <Table size="small" pagination={false} rowKey="TenChiSo" style={{ marginTop: 8 }} dataSource={p.ChiSo}
              columns={[
                { title: 'Chỉ số', dataIndex: 'TenChiSo' },
                {
                  title: 'Kết quả', key: 'kq',
                  render: (_, c) => (
                    <Typography.Text strong={c.DanhGia !== 'BINH_THUONG'} style={{ color: MAU_DANH_GIA[c.DanhGia] }}>
                      {Number(c.GiaTri)} {TEN_DANH_GIA[c.DanhGia]}
                    </Typography.Text>
                  ),
                },
                { title: 'Đơn vị', dataIndex: 'DonVi', render: (d) => d ?? '' },
                {
                  title: 'Tham chiếu', key: 'tc',
                  render: (_, c) => c.GioiHanDuoi != null || c.GioiHanTren != null
                    ? `${c.GioiHanDuoi != null ? Number(c.GioiHanDuoi) : ''} – ${c.GioiHanTren != null ? Number(c.GioiHanTren) : ''}` : '',
                },
              ]} />
          )}
          {p.MoTa && <Typography.Paragraph style={{ whiteSpace: 'pre-line', margin: '6px 0 0' }}>{p.MoTa}</Typography.Paragraph>}
          {p.NhanXet && <div><Typography.Text type="secondary">Nhận xét: </Typography.Text>{p.NhanXet}</div>}
          {p.KetLuan && <div><Typography.Text type="secondary">Kết luận: </Typography.Text><Typography.Text strong>{p.KetLuan}</Typography.Text></div>}
          {p.BacSiThucHien && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {p.BacSiThucHien}{p.ThoiDiemCoKetQua && ` · ${dayjs(p.ThoiDiemCoKetQua).format('HH:mm DD/MM/YYYY')}`}
            </Typography.Text>
          )}
        </div>
      ))}
    </Flex>
  )
}

export function BangDonThuoc({ don }: { don: HoSoBenhAn['DonThuoc'] }) {
  if (don.length === 0) return <Typography.Text type="secondary">Không kê đơn thuốc</Typography.Text>
  return (
    <Table size="small" pagination={false} rowKey="MaThuoc" dataSource={don} scroll={{ x: 'max-content' }}
      columns={[
        {
          title: 'Thuốc', key: 't',
          render: (_, t) => (
            <div>
              <Typography.Text strong>{t.TenThuoc}</Typography.Text> {t.HamLuong}
              {t.HoatChat && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.HoatChat}</Typography.Text></div>}
            </div>
          ),
        },
        { title: 'Số lượng', key: 'sl', render: (_, t) => `${t.SoLuong} ${t.DonViTinh}` },
        {
          title: 'Cách dùng', key: 'cd',
          render: (_, t) => [t.LieuDung, t.CachDung, t.SoNgayDung ? `${t.SoNgayDung} ngày` : null].filter(Boolean).join(' · '),
        },
      ]} />
  )
}

/** Sinh hiệu, chẩn đoán, lời dặn của hồ sơ (chỉ đọc). */
export function ThongTinHoSo({ hs }: { hs: HoSoBenhAn }) {
  const sinhHieu = [
    hs.Mach != null && `Mạch ${hs.Mach} l/p`, hs.HuyetAp && `HA ${hs.HuyetAp} mmHg`,
    hs.NhietDo != null && `Nhiệt độ ${Number(hs.NhietDo)} °C`, hs.CanNang != null && `Cân nặng ${Number(hs.CanNang)} kg`,
    hs.ChieuCao != null && `Chiều cao ${Number(hs.ChieuCao)} cm`,
  ].filter(Boolean).join(' · ')
  return (
    <Descriptions column={1} size="small" bordered styles={{ label: { width: 150 } }}>
      {sinhHieu && <Descriptions.Item label="Sinh hiệu">{sinhHieu}</Descriptions.Item>}
      {hs.TrieuChung && <Descriptions.Item label="Triệu chứng"><span style={{ whiteSpace: 'pre-line' }}>{hs.TrieuChung}</span></Descriptions.Item>}
      {hs.KhamLamSang && <Descriptions.Item label="Khám lâm sàng"><span style={{ whiteSpace: 'pre-line' }}>{hs.KhamLamSang}</span></Descriptions.Item>}
      <Descriptions.Item label="Chẩn đoán">
        {hs.MaICD && <Tag color="blue">{hs.MaICD}</Tag>}
        <Typography.Text strong>{hs.ChanDoan ?? '—'}</Typography.Text>
        {hs.TenBenh && hs.TenBenh !== hs.ChanDoan && <div><Typography.Text type="secondary">{hs.TenBenh}</Typography.Text></div>}
      </Descriptions.Item>
      {hs.LoiDan && <Descriptions.Item label="Lời dặn"><span style={{ whiteSpace: 'pre-line' }}>{hs.LoiDan}</span></Descriptions.Item>}
      {hs.NgayTaiKham && <Descriptions.Item label="Hẹn tái khám">{thuNgay(hs.NgayTaiKham)}</Descriptions.Item>}
    </Descriptions>
  )
}

export function DsGhiChu({ ds }: { ds: HoSoBenhAn['GhiChu'] }) {
  return (
    <List size="small" dataSource={ds} renderItem={(g) => (
      <List.Item>
        <div>
          <div style={{ whiteSpace: 'pre-line' }}>{g.NoiDung}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {g.BacSi} · {dayjs(g.ThoiGian).format('HH:mm DD/MM/YYYY')}
          </Typography.Text>
        </div>
      </List.Item>
    )} />
  )
}

/** Toàn bộ một lần khám đã hoàn tất. */
export default function XemLanKham({ lk }: { lk: LanKham }) {
  const hs = lk.HoSo
  return (
    <Flex vertical gap={16}>
      <Typography.Text type="secondary">
        {thuNgay(lk.NgayKham)} · {lk.BacSi}{lk.HocHamHocVi && ` (${lk.HocHamHocVi})`}{lk.TenCK && ` · ${lk.TenCK}`} · Mã {lk.MaLichHen}
      </Typography.Text>
      {lk.LyDoKham && <div><Typography.Text type="secondary">Lý do khám: </Typography.Text>{lk.LyDoKham}</div>}
      {!hs ? <Empty description="Chưa có hồ sơ" /> : (
        <>
          <ThongTinHoSo hs={hs} />
          <div>
            <Typography.Title level={5}>Kết quả cận lâm sàng</Typography.Title>
            <DsKetQuaCls ds={lk.ChiDinh} anTrangThai />
          </div>
          <div>
            <Typography.Title level={5}>Đơn thuốc</Typography.Title>
            <BangDonThuoc don={hs.DonThuoc} />
          </div>
          {hs.GhiChu.length > 0 && (
            <div>
              <Typography.Title level={5}>Ghi chú bổ sung của bác sĩ</Typography.Title>
              <DsGhiChu ds={hs.GhiChu} />
            </div>
          )}
        </>
      )}
    </Flex>
  )
}
