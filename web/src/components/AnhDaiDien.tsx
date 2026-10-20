import { useState } from 'react'

export function chuCaiDau(hoTen: string) {
  const tu = hoTen.trim().split(/\s+/)
  return (tu.length > 1 ? tu[tu.length - 2][0] + tu[tu.length - 1][0] : tu[0].slice(0, 2)).toUpperCase()
}

/** Ảnh đại diện tròn; chưa có ảnh hoặc ảnh lỗi thì hiện 2 chữ cái đầu của họ tên. */
export default function AnhDaiDien({ anh, hoTen, co = 36 }: { anh?: string | null; hoTen: string; co?: number }) {
  const [loi, setLoi] = useState<string | null>(null)
  const kieu = { width: co, height: co, fontSize: Math.round(co * 0.36) }
  if (anh && loi !== anh) {
    return <img className="anh-dai-dien" src={anh} alt={hoTen} style={kieu} onError={() => setLoi(anh)} />
  }
  return <span className="anh-dai-dien" style={kieu} aria-hidden>{chuCaiDau(hoTen)}</span>
}
