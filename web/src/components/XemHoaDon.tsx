import { Descriptions, Flex, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import type { HoaDon } from '@/lib/api'
import { TEN_HINH_THUC, TEN_LOAI_MUC, TEN_LY_DO_HOAN, tien, TRANG_THAI_HOAN } from '@/lib/hangSo'
import { inTrang, thoat } from '@/lib/in'

export const TRANG_THAI_HOA_DON: Record<HoaDon['TrangThai'], { ten: string; mau: string }> = {
  CHUA_THANH_TOAN: { ten: 'Chưa thanh toán', mau: 'gold' },
  DA_THANH_TOAN: { ten: 'Đã thanh toán', mau: 'green' },
  DA_HUY: { ten: 'Đã hủy', mau: 'default' },
}

const dung = (v: unknown) => v === true || v === 1

/** Các dòng hóa đơn (khám, CLS, thuốc) và phần tổng: tổng tiền, BHYT trả, đã tạm thu, còn phải thu. */
export default function XemHoaDon({ hd }: { hd: HoaDon }) {
  const conPhaiThu = Number(hd.ConPhaiThu)
  return (
    <Flex vertical gap={12}>
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Bệnh nhân">{hd.HoTen} · {hd.MaLichHen}</Descriptions.Item>
        <Descriptions.Item label="Khám">{dayjs(hd.NgayKham).format('DD/MM/YYYY')} · {hd.BacSi}{hd.TenCK && ` · ${hd.TenCK}`}</Descriptions.Item>
        <Descriptions.Item label="BHYT">{hd.TrangThaiBHYT === 'HOP_LE' ? `Có, mức hưởng ${hd.MucHuong}%` : 'Không'}</Descriptions.Item>
        {hd.MaSoHoaDonGoc && <Descriptions.Item label="Thay thế cho">{hd.MaSoHoaDonGoc} (đã hủy)</Descriptions.Item>}
        {hd.TrangThai === 'DA_HUY' && (
          <Descriptions.Item label="Đã hủy">
            <Typography.Text type="danger">{hd.LyDoHuy}</Typography.Text>
            {hd.NguoiHuy && ` · ${hd.NguoiHuy}`}{hd.HoaDonThayThe && ` · thay bằng ${hd.HoaDonThayThe}`}
          </Descriptions.Item>
        )}
        {hd.TrangThai === 'DA_THANH_TOAN' && (
          <Descriptions.Item label="Đã thanh toán">
            {dayjs(hd.NgayThanhToan).format('HH:mm DD/MM/YYYY')} · {hd.HinhThuc && TEN_HINH_THUC[hd.HinhThuc]}
            {hd.ThuNgan && ` · ${hd.ThuNgan}`}
          </Descriptions.Item>
        )}
      </Descriptions>
      <Table size="small" pagination={false} rowKey="MaCTHD" dataSource={hd.ChiTiet} scroll={{ x: 'max-content' }}
        columns={[
          {
            title: 'Khoản', key: 'nd',
            render: (_, c) => (
              <div>
                {c.NoiDung}{c.SoLuong > 1 && <Typography.Text type="secondary"> × {c.SoLuong}</Typography.Text>}
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{TEN_LOAI_MUC[c.LoaiMuc]}</Typography.Text>
                  {dung(c.DaTamThu) && <Tag color="blue" style={{ marginInlineStart: 6, fontSize: 11 }}>Đã tạm thu</Tag>}
                </div>
              </div>
            ),
          },
          { title: 'Thành tiền', key: 'tt', align: 'right', render: (_, c) => tien(c.ThanhTien) },
          { title: 'BHYT trả', key: 'bhyt', align: 'right', render: (_, c) => tien(c.BHYTChiTra) },
          { title: 'Bệnh nhân trả', key: 'bn', align: 'right', render: (_, c) => tien(c.BenhNhanTra) },
        ]} />
      <Flex vertical gap={4} style={{ alignSelf: 'flex-end', minWidth: 260 }}>
        <Flex justify="space-between"><span>Tổng chi phí</span><span>{tien(hd.TongTien)}</span></Flex>
        <Flex justify="space-between"><span>BHYT chi trả</span><span>− {tien(hd.BHYTChiTra)}</span></Flex>
        <Flex justify="space-between"><span>Đã tạm thu (CLS)</span><span>− {tien(hd.DaTamThu)}</span></Flex>
        <Flex justify="space-between" style={{ borderTop: '1px solid #DCE4E2', paddingTop: 6, marginTop: 2 }}>
          <Typography.Text strong>{conPhaiThu < 0 ? 'Trả lại bệnh nhân' : hd.TrangThai === 'DA_THANH_TOAN' ? 'Đã thu' : 'Còn phải thu'}</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18 }}>{tien(Math.abs(conPhaiThu))}</Typography.Text>
        </Flex>
      </Flex>
      {hd.PhieuHoanTien?.length > 0 && (
        <div>
          <Typography.Text strong>Phiếu hoàn tiền của lượt khám</Typography.Text>
          {hd.PhieuHoanTien.map((p) => (
            <Flex key={p.MaPHT} justify="space-between" gap={8} wrap style={{ padding: '6px 0', borderBottom: '1px solid #EEF2F1' }}>
              <span>
                {p.MaSoPhieu} · {TEN_LY_DO_HOAN[p.LyDo]}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}> · {p.MaChungTu}</Typography.Text>
              </span>
              <span>
                <Tag color={TRANG_THAI_HOAN[p.TrangThai].mau}>{TRANG_THAI_HOAN[p.TrangThai].ten}</Tag>
                <Typography.Text strong>{tien(p.SoTien)}</Typography.Text>
              </span>
            </Flex>
          ))}
        </div>
      )}
    </Flex>
  )
}

/** In hóa đơn khổ nhỏ. */
export function inHoaDon(hd: HoaDon) {
  const dong = hd.ChiTiet.map((c) => `<tr><td>${thoat(c.NoiDung)}${c.SoLuong > 1 ? ` × ${c.SoLuong}` : ''}`
    + `${dung(c.DaTamThu) ? '<br><small>Đã tạm thu</small>' : ''}</td><td class="so">${tien(c.ThanhTien)}</td>`
    + `<td class="so">${tien(c.BHYTChiTra)}</td><td class="so">${tien(c.BenhNhanTra)}</td></tr>`).join('')
  return inTrang(hd.MaSoHoaDon, `
<div class="giua"><strong>${thoat(hd.PhongKham.TenPhongKham)}</strong><br><small>${thoat(hd.PhongKham.DiaChi)} · ${thoat(hd.PhongKham.Hotline)}</small></div>
<h1>HÓA ĐƠN KHÁM BỆNH</h1>
<div class="giua">Số: <strong>${thoat(hd.MaSoHoaDon)}</strong> · ${dayjs(hd.NgayLap).format('HH:mm DD/MM/YYYY')}</div>
<p>Bệnh nhân: <strong>${thoat(hd.HoTen)}</strong>${hd.NgaySinh ? ` (${dayjs(hd.NgaySinh).format('DD/MM/YYYY')})` : ''}<br>
Mã lịch hẹn: ${thoat(hd.MaLichHen)} · ${thoat(hd.BacSi)}${hd.TrangThaiBHYT === 'HOP_LE' ? `<br>BHYT mức hưởng ${hd.MucHuong}%` : ''}</p>
<table><thead><tr><th>Khoản</th><th class="so">Thành tiền</th><th class="so">BHYT</th><th class="so">BN trả</th></tr></thead>
<tbody>${dong}
<tr><td colspan="3">Tổng chi phí</td><td class="so">${tien(hd.TongTien)}</td></tr>
<tr><td colspan="3">BHYT chi trả</td><td class="so">− ${tien(hd.BHYTChiTra)}</td></tr>
<tr><td colspan="3">Đã tạm thu</td><td class="so">− ${tien(hd.DaTamThu)}</td></tr>
<tr class="tong"><td colspan="3">${Number(hd.ConPhaiThu) < 0 ? 'Trả lại bệnh nhân' : 'Thanh toán'}</td><td class="so">${tien(Math.abs(Number(hd.ConPhaiThu)))}</td></tr></tbody></table>
${hd.TrangThai === 'DA_THANH_TOAN' ? `<p>Hình thức: ${hd.HinhThuc ? TEN_HINH_THUC[hd.HinhThuc] : ''} · ${dayjs(hd.NgayThanhToan).format('HH:mm DD/MM/YYYY')}`
    + `${hd.HinhThuc === 'TIEN_MAT' && hd.TienKhachDua != null ? `<br>Khách đưa: ${tien(hd.TienKhachDua)} · Tiền thừa: ${tien(Number(hd.TienKhachDua) - Number(hd.ConPhaiThu))}` : ''}`
    + `${hd.ThuNgan ? `<br>Thu ngân: ${thoat(hd.ThuNgan)}` : ''}</p>` : '<p><strong>CHƯA THANH TOÁN</strong></p>'}
<p class="giua"><small>Cảm ơn quý khách. Hóa đơn đã thanh toán không thể sửa (BR26).</small></p>`)
}
