/** Thoát ký tự HTML khi ghép chuỗi vào trang in. */
export const thoat = (s: string | number | null | undefined) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Kiểu chung cho phiếu in khổ nhỏ (biên lai, hóa đơn). */
export const KIEU_IN = `body{font:13px/1.45 system-ui,sans-serif;margin:16px;color:#000}h1{font-size:16px;margin:8px 0;text-align:center}
.giua{text-align:center}table{width:100%;border-collapse:collapse;margin:8px 0}td,th{padding:4px 2px;border-bottom:1px dashed #999;text-align:left;vertical-align:top}
.so{text-align:right;white-space:nowrap}small{color:#555}.tong td{font-weight:700;border-bottom:none}`

/**
 * In một trang HTML qua khung ẩn ngay trong trang hiện tại: không mở cửa sổ mới nên không bị trình duyệt
 * chặn cửa sổ bật lên. Trả về false nếu trình duyệt không cho dùng khung.
 */
export function inTrang(tieuDe: string, than: string) {
  document.getElementById('khung-in')?.remove()
  const khung = document.createElement('iframe')
  khung.id = 'khung-in'
  khung.title = tieuDe
  khung.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(khung)
  const w = khung.contentWindow
  if (!w) return false
  w.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${thoat(tieuDe)}</title>
<style>${KIEU_IN}</style></head><body>${than}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
  return true
}
