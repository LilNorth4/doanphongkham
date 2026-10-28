import { DeleteOutlined, FilePdfOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Descriptions, Empty, Flex, Image, List, Popconfirm, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import BangThichUng from '@/components/BangThichUng'
import type { HoSoBenhAn, LanKham, PhieuChiDinh, TepKetQua } from '@/lib/api'
import { TEN_LOAI_DV, thuNgay, TRANG_THAI_PHIEU_CLS } from '@/lib/hangSo'

const MAU_DANH_GIA = { BINH_THUONG: undefined, CAO: 'red', THAP: 'orange' } as const
const TEN_DANH_GIA = { BINH_THUONG: '', CAO: '↑ Cao', THAP: '↓ Thấp' } as const

/**
 * Ảnh (xem phóng to) và PDF đính kèm kết quả cận lâm sàng; có onXoa thì hiện nút xóa. Đường dẫn có chữ ký hết hạn sau
 * 2 giờ: ảnh không tải được thì báo lỗi và cho tải lại để lấy đường dẫn mới (UC11.2 4a).
 */
export function DsTep({ ds, onXoa }: { ds: TepKetQua[]; onXoa?: (t: TepKetQua) => void }) {
  const [loi, setLoi] = useState(false)
  const anh = ds.filter((t) => t.LoaiTep !== 'PDF')
  const pdf = ds.filter((t) => t.LoaiTep === 'PDF')
  return (
    <Flex vertical gap={8}>
      {loi && (
        <Alert type="warning" showIcon title="Không tải được ảnh kết quả (đường dẫn có thể đã hết hạn)"
          action={<Button size="small" icon={<ReloadOutlined />} onClick={() => window.location.reload()}>Tải lại</Button>} />
      )}
      {anh.length > 0 && (
        <Image.PreviewGroup>
          <Flex gap={8} wrap>
            {anh.map((t) => (
              <div key={t.MaTep} style={{ position: 'relative' }}>
                <Image src={t.DuongDan} alt={t.MoTa ?? t.TenTep} width={104} height={104} style={{ objectFit: 'cover', borderRadius: 6 }}
                  onError={() => setLoi(true)} />
                {t.MoTa && <div style={{ width: 104, fontSize: 11, color: '#52615D' }}>{t.MoTa}</div>}
                {onXoa && (
                  <Popconfirm title="Xóa ảnh này?" okText="Xóa" cancelText="Đóng" onConfirm={() => onXoa(t)}>
                    <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Xóa ${t.TenTep}`}
                      style={{ position: 'absolute', top: 4, right: 4 }} />
                  </Popconfirm>
                )}
              </div>
            ))}
          </Flex>
        </Image.PreviewGroup>
      )}
      {pdf.map((t) => (
        <Flex key={t.MaTep} gap={8} align="center">
          <FilePdfOutlined style={{ color: '#d4380d' }} />
          <Typography.Link href={t.DuongDan} target="_blank" rel="noreferrer">{t.TenTep}</Typography.Link>
          {onXoa && (
            <Popconfirm title="Xóa tệp này?" okText="Xóa" cancelText="Đóng" onConfirm={() => onXoa(t)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`Xóa ${t.TenTep}`} />
            </Popconfirm>
          )}
        </Flex>
      ))}
    </Flex>
  )
}

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
            {(p.PhienBan ?? 1) > 1 && <Tag color="gold">Đã đính chính</Tag>}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Phòng {p.MaSoPhong}</Typography.Text>
          </Flex>
          {p.TrangThai === 'DA_HUY' && p.LyDoHuy && <Typography.Text type="secondary">Lý do hủy: {p.LyDoHuy}</Typography.Text>}
          {!anTrangThai && p.GhiChu && (p.TrangThai === 'CHO_THUC_HIEN' || p.TrangThai === 'DANG_THUC_HIEN') && (
            <div><Typography.Text type="warning">Phòng CLS hoãn: {p.GhiChu}</Typography.Text></div>
          )}
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
          {(p.CoSinhThiet === true || p.CoSinhThiet === 1) && (
            <div><Typography.Text type="secondary">Sinh thiết: </Typography.Text>{p.SoMauSinhThiet} mẫu · {p.ViTriSinhThiet}</div>
          )}
          {p.Tep && p.Tep.length > 0 && <div style={{ marginTop: 6 }}><DsTep ds={p.Tep} /></div>}
          {p.BacSiThucHien && p.TrangThai === 'CO_KET_QUA' && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {p.BacSiThucHien}{p.ThoiDiemCoKetQua && ` · ${dayjs(p.ThoiDiemCoKetQua).format('HH:mm DD/MM/YYYY')}`}
              {(p.PhienBan ?? 1) > 1 && p.NgayCapNhat && ` · điều chỉnh lúc ${dayjs(p.NgayCapNhat).format('HH:mm DD/MM')}`}
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
    // Điện thoại: mỗi thuốc một thẻ (BangThichUng), không phải vuốt ngang để xem cách dùng
    <BangThichUng size="small" pagination={false} rowKey="MaThuoc" dataSource={don} scroll={{ x: 'max-content' }}
      columns={[
        {
          title: 'Thuốc', key: 't',
          render: (_, t) => (
            <div>
              <Typography.Text strong>{t.TenThuoc}</Typography.Text> {t.HamLuong}
              {t.HoatChat && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{t.HoatChat}</Typography.Text></div>}
              {t.LyDoBoQuaCanhBao && (
                <div><Typography.Text type="danger" style={{ fontSize: 12 }}>Kê dù trùng dị ứng: {t.LyDoBoQuaCanhBao}</Typography.Text></div>
              )}
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
