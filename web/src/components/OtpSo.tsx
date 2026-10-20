import { Input } from 'antd'
import type { OTPProps } from 'antd/es/input/OTP'
import { useEffect, useRef } from 'react'

/**
 * Ô nhập mã OTP chỉ gồm chữ số. Input.OTP không nhận inputMode nên gắn trực tiếp vào các ô con:
 * điện thoại hiện bàn phím số, iOS/Android gợi ý điền mã từ tin nhắn/email (one-time-code).
 */
export default function OtpSo(props: OTPProps) {
  const khung = useRef<HTMLDivElement>(null)

  useEffect(() => {
    khung.current?.querySelectorAll('input').forEach((o, i) => {
      o.inputMode = 'numeric'
      o.pattern = '[0-9]*'
      if (i === 0) o.autocomplete = 'one-time-code'
    })
  })

  return (
    <div ref={khung} style={{ maxWidth: '100%' }}>
      <Input.OTP length={6} formatter={(s) => s.replace(/\D/g, '')} {...props} />
    </div>
  )
}
