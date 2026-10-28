import { Flex, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { MAU_COT } from '@/components/BieuDoCot'
import type { DayChiSo } from '@/lib/api'

/** Dãy thứ hai (tâm trương): cặp với MAU_COT đã chạy validate_palette của skill dataviz (CVD ΔE 13.2, tương phản ≥ 3:1). */
const MAU_2 = '#C2410C'
const LUOI = '#EEF2F1'
const CHU_PHU = '#52615D'
const NEN = '#FFFFFF'

const so = (v: string | number | undefined) => (v == null ? NaN : Number(v))
const dinhDang = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 2 })

/** Vạch trục y: bước đẹp (1, 2, 2.5, 5 × 10ⁿ), khoảng 4-6 vạch. */
function vachTruc(min: number, max: number) {
  const khoang = max - min || Math.abs(max) || 1
  const tho = khoang / 5
  const mu = 10 ** Math.floor(Math.log10(tho))
  const buoc = [1, 2, 2.5, 5, 10].map((b) => b * mu).find((b) => b >= tho) ?? 10 * mu
  const dau = Math.floor(min / buoc) * buoc
  const cuoi = Math.ceil(max / buoc) * buoc
  const ds: number[] = []
  for (let v = dau; v <= cuoi + buoc / 2; v += buoc) ds.push(Number(v.toFixed(6)))
  return ds
}

/** Đánh giá một giá trị so với khoảng tham chiếu (chữ, không dùng màu trạng thái). */
export function danhGia(v: number, duoi: number | null | undefined, tren: number | null | undefined) {
  if (tren != null && v > tren) return '↑ Cao'
  if (duoi != null && v < duoi) return '↓ Thấp'
  return duoi != null || tren != null ? 'Bình thường' : ''
}

/**
 * UC11.3: biểu đồ đường giá trị một chỉ số qua các lần khám (SVG thuần). Vùng nền nhạt + đường đứt = khoảng tham chiếu.
 * Huyết áp vẽ hai đường (tâm thu, tâm trương) có chú giải và nhãn trực tiếp. Rê chuột / chạm hiện chi tiết lần khám.
 */
export default function BieuDoChiSo({ day, cao = 260 }: { day: DayChiSo; cao?: number }) {
  const khung = useRef<HTMLDivElement>(null)
  const [rong, setRong] = useState(600)
  const [chon, setChon] = useState<number | null>(null)
  useEffect(() => {
    const el = khung.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setRong(Math.max(280, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const haiDuong = day.Diem.some((d) => d.GiaTri2 != null)
  const v1 = day.Diem.map((d) => so(d.GiaTri))
  const v2 = day.Diem.map((d) => so(d.GiaTri2))
  const moc = [...v1, ...(haiDuong ? v2 : []), day.Duoi, day.Tren, haiDuong ? day.Tren2 : null]
    .filter((v): v is number => v != null && !Number.isNaN(Number(v))).map(Number)
  const vach = vachTruc(Math.min(...moc), Math.max(...moc))
  const yMin = vach[0]
  const yMax = vach[vach.length - 1]

  const trai = 44, phai = haiDuong ? 76 : 20, tren = 12, duoi = 28
  const w = rong - trai - phai
  const h = cao - tren - duoi
  const n = day.Diem.length
  const x = (i: number) => trai + (n === 1 ? w / 2 : (i * w) / (n - 1))
  const y = (v: number) => tren + h - ((v - yMin) / (yMax - yMin || 1)) * h
  const duong = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  // Nhãn ngày thưa ra khi nhiều lần khám để không chồng nhau
  const buocNhan = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(w / 70))))
  const d = chon == null ? null : day.Diem[chon]

  const chonTheoChuot = (cx: number) => {
    const i = Math.round(((cx - trai) / (w || 1)) * (n - 1))
    setChon(Math.min(n - 1, Math.max(0, n === 1 ? 0 : i)))
  }

  return (
    <div ref={khung} style={{ position: 'relative' }}>
      {haiDuong && (
        <Flex gap={16} style={{ marginBottom: 4, fontSize: 12, color: CHU_PHU }}>
          <span><svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={MAU_COT} strokeWidth="2" /></svg> Tâm thu</span>
          <span><svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={MAU_2} strokeWidth="2" /></svg> Tâm trương</span>
        </Flex>
      )}
      <svg width={rong} height={cao} role="img" aria-label={`Biểu đồ ${day.Ten} qua ${n} lần khám`} style={{ display: 'block', touchAction: 'pan-y' }}
        onMouseMove={(e) => chonTheoChuot(e.clientX - e.currentTarget.getBoundingClientRect().left)}
        onMouseLeave={() => setChon(null)}
        onTouchStart={(e) => chonTheoChuot(e.touches[0].clientX - e.currentTarget.getBoundingClientRect().left)}>
        {/* Khoảng tham chiếu (một đường) */}
        {!haiDuong && day.Duoi != null && day.Tren != null && (
          <rect x={trai} width={w} y={y(day.Tren)} height={y(day.Duoi) - y(day.Tren)} fill={MAU_COT} opacity={0.07} />
        )}
        {vach.map((v) => (
          <g key={v}>
            <line x1={trai} x2={trai + w} y1={y(v)} y2={y(v)} stroke={LUOI} />
            <text x={trai - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill={CHU_PHU}>{dinhDang(v)}</text>
          </g>
        ))}
        {[
          { v: day.Tren, nhan: haiDuong ? 'Tâm thu ≤' : 'Trên' }, { v: haiDuong ? null : day.Duoi, nhan: 'Dưới' },
          { v: haiDuong ? day.Tren2 : null, nhan: 'Tâm trương ≤' },
        ].filter((g) => g.v != null).map((g) => (
          <g key={g.nhan}>
            <line x1={trai} x2={trai + w} y1={y(g.v!)} y2={y(g.v!)} stroke={CHU_PHU} strokeDasharray="4 4" strokeWidth={1} opacity={0.7} />
            <text x={trai + w - 4} y={y(g.v!) - 4} textAnchor="end" fontSize={10} fill={CHU_PHU}>{g.nhan} {dinhDang(g.v!)}</text>
          </g>
        ))}
        {day.Diem.map((p, i) => i % buocNhan === 0 || i === n - 1 ? (
          <text key={i} x={x(i)} y={cao - 8} textAnchor="middle" fontSize={11} fill={CHU_PHU}>{dayjs(p.NgayKham).format('DD/MM/YY')}</text>
        ) : null)}
        {chon != null && <line x1={x(chon)} x2={x(chon)} y1={tren} y2={tren + h} stroke={CHU_PHU} strokeWidth={1} opacity={0.4} />}
        {[{ vs: v1, mau: MAU_COT, ten: 'Tâm thu' }, ...(haiDuong ? [{ vs: v2, mau: MAU_2, ten: 'Tâm trương' }] : [])].map((s) => (
          <g key={s.mau}>
            <path d={duong(s.vs)} fill="none" stroke={s.mau} strokeWidth={2} strokeLinejoin="round" />
            {s.vs.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={chon === i ? 5.5 : 4} fill={s.mau} stroke={NEN} strokeWidth={2} />
            ))}
            {/* Nhãn trực tiếp ở điểm cuối (hai đường) */}
            {haiDuong && (
              <text x={x(n - 1) + 8} y={y(s.vs[n - 1])} dy="0.32em" fontSize={11} fill={CHU_PHU}>{s.ten}</text>
            )}
          </g>
        ))}
      </svg>
      {d && chon != null && (
        <div style={{
          position: 'absolute', top: haiDuong ? 28 : 6, left: Math.min(Math.max(x(chon) - 80, 0), rong - 170), width: 170,
          background: NEN, border: `1px solid ${LUOI}`, borderRadius: 8, padding: '6px 10px', fontSize: 12,
          boxShadow: '0 4px 12px rgba(16,24,40,.12)', pointerEvents: 'none',
        }}>
          <Typography.Text strong style={{ fontSize: 12 }}>{dayjs(d.NgayKham).format('DD/MM/YYYY')}</Typography.Text>
          {haiDuong ? (
            <div>{dinhDang(so(d.GiaTri))}/{dinhDang(so(d.GiaTri2))} {day.DonVi}
              <div style={{ color: CHU_PHU }}>{[danhGia(so(d.GiaTri), day.Duoi, day.Tren), danhGia(so(d.GiaTri2), day.Duoi2, day.Tren2)]
                .every((t) => t === 'Bình thường') ? 'Trong khoảng tham chiếu' : 'Ngoài khoảng tham chiếu'}</div>
            </div>
          ) : (
            <div>{dinhDang(so(d.GiaTri))} {day.DonVi ?? ''}
              {danhGia(so(d.GiaTri), day.Duoi, day.Tren) && <div style={{ color: CHU_PHU }}>{danhGia(so(d.GiaTri), day.Duoi, day.Tren)}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
