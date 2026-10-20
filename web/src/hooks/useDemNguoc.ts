import { useCallback, useEffect, useState } from 'react'

/** Đếm ngược theo giây, dùng cho nút "Gửi lại mã" (backend chặn gửi lại trong 60 giây). */
export function useDemNguoc(giayBanDau = 0) {
  const [con, setCon] = useState(giayBanDau)

  useEffect(() => {
    if (con <= 0) return
    const id = setTimeout(() => setCon((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [con])

  const batDau = useCallback((giay = 60) => setCon(giay), [])
  return { con, batDau }
}
