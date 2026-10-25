import { useEffect, useRef, useState } from 'react'

/**
 * Màu cột duy nhất của mọi biểu đồ: cùng họ xanh với thương hiệu nhưng đủ độ bão hòa để không đọc thành xám
 * (đã kiểm tra bằng validate_palette của skill dataviz: chroma ≥ 0.1, tương phản ≥ 3:1 trên nền trắng).
 */
export const MAU_COT = '#0E9384'
const LUOI = '#EEF2F1'
const CHU_PHU = '#52615D'

export interface Cot { nhan: string; giaTri: number; chuThich?: string }

/** Làm tròn trục y lên số đẹp (1, 2, 5 × 10ⁿ) để các vạch là số chẵn. */
function tranDep(max: number) {
  if (max <= 0) return 1
  const mu = 10 ** Math.floor(Math.log10(max))
  return ([1, 2, 5, 10].map((b) => b * mu).find((b) => b >= max) ?? 10 * mu)
}

const gon = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })

/**
 * Biểu đồ cột một chuỗi số liệu (SVG thuần, không thêm thư viện): cột ≤ 24px, đầu bo 4px, gốc vuông;
 * lưới mảnh; chỉ ghi số trên cột cao nhất; rê chuột (hoặc chạm) vào cột hiện chú thích chi tiết.
 */
export default function BieuDoCot({ duLieu, dinhDang = (v) => v.toLocaleString('vi-VN'), cao = 220, tieuDe }: {
  duLieu: Cot[]; dinhDang?: (v: number) => string; cao?: number; tieuDe: string
}) {
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

  const trai = 44, duoi = 26, tren = 18, phai = 8
  const w = rong - trai - phai, h = cao - tren - duoi
  const max = tranDep(Math.max(0, ...duLieu.map((d) => d.giaTri)))
  const bang = duLieu.length ? w / duLieu.length : w
  const beRong = Math.min(24, Math.max(4, bang * 0.6))
  const buocNhan = Math.max(1, Math.ceil(duLieu.length / Math.floor(w / 52)))
  const iMax = duLieu.reduce((m, d, i) => (d.giaTri > (duLieu[m]?.giaTri ?? -1) ? i : m), 0)
  const y = (v: number) => tren + h - (Math.max(v, 0) / max) * h
  const vach = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)

  const cot = (i: number, v: number) => {
    const x = trai + i * bang + (bang - beRong) / 2
    const ch = y(0) - y(v)
    if (ch <= 0) return null
    const r = Math.min(4, ch, beRong / 2)
    const d = `M${x},${y(0)} V${y(v) + r} Q${x},${y(v)} ${x + r},${y(v)} H${x + beRong - r} Q${x + beRong},${y(v)} ${x + beRong},${y(v) + r} V${y(0)} Z`
    return <path d={d} fill={MAU_COT} opacity={chon == null || chon === i ? 1 : 0.55} />
  }

  return (
    <div ref={khung} style={{ position: 'relative', width: '100%' }} onMouseLeave={() => setChon(null)}>
      <svg width={rong} height={cao} role="img" aria-label={tieuDe} style={{ display: 'block' }}>
        {vach.map((v) => (
          <g key={v}>
            <line x1={trai} x2={rong - phai} y1={y(v)} y2={y(v)} stroke={LUOI} strokeWidth={1} />
            <text x={trai - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill={CHU_PHU}>{gon.format(v)}</text>
          </g>
        ))}
        {duLieu.map((d, i) => (
          <g key={i}>
            {cot(i, d.giaTri)}
            {i % buocNhan === 0 && (
              <text x={trai + i * bang + bang / 2} y={cao - 8} textAnchor="middle" fontSize={11} fill={CHU_PHU}>{d.nhan}</text>
            )}
            {i === iMax && d.giaTri > 0 && (
              <text x={trai + i * bang + bang / 2} y={y(d.giaTri) - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#12211E">
                {dinhDang(d.giaTri)}
              </text>
            )}
            {/* Vùng bắt chuột rộng hơn cột để dễ trỏ trúng */}
            <rect x={trai + i * bang} y={tren} width={bang} height={h} fill="transparent"
              onMouseEnter={() => setChon(i)} onClick={() => setChon(i)} />
          </g>
        ))}
      </svg>
      {chon != null && duLieu[chon] && (
        <div role="tooltip" style={{
          position: 'absolute', pointerEvents: 'none', top: Math.max(0, y(duLieu[chon].giaTri) - 52),
          left: Math.min(Math.max(trai + chon * bang + bang / 2 - 70, 0), rong - 140), width: 140,
          background: '#fff', border: '1px solid #DCE4E2', borderRadius: 8, padding: '6px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12, lineHeight: 1.4,
        }}>
          <div style={{ color: CHU_PHU }}>{duLieu[chon].chuThich ?? duLieu[chon].nhan}</div>
          <div style={{ fontWeight: 600, color: '#12211E' }}>{dinhDang(duLieu[chon].giaTri)}</div>
        </div>
      )}
    </div>
  )
}
