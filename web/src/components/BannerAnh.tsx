import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { useEffect, useState, type ReactNode } from 'react'

const CHU_KY = 5000 // ms giữa hai lần tự đổi ảnh

/**
 * Banner trình chiếu: ảnh nền tự đổi sau mỗi 5 giây (mờ dần), có mũi tên và chấm để chuyển tay.
 * Nội dung (children) nằm cố định phía trên ảnh. Di chuột vào banner thì tạm dừng tự đổi.
 */
export default function BannerAnh({ anh, children }: { anh: string[]; children: ReactNode }) {
  const [so, setSo] = useState(0)
  const [dung, setDung] = useState(false)
  const tong = anh.length

  // Đặt lại bộ đếm mỗi khi đổi ảnh, để bấm tay xong vẫn đủ 5 giây mới tự chuyển
  useEffect(() => {
    if (tong < 2 || dung) return
    const id = setTimeout(() => setSo((s) => (s + 1) % tong), CHU_KY)
    return () => clearTimeout(id)
  }, [so, tong, dung])

  const chuyen = (buoc: number) => setSo((s) => (s + buoc + tong) % tong)

  return (
    <section className="banner" onMouseEnter={() => setDung(true)} onMouseLeave={() => setDung(false)}>
      {anh.map((a, i) => (
        <div key={a} className={i === so ? 'banner-anh hien' : 'banner-anh'} style={{ backgroundImage: `url(${a})` }}
          aria-hidden />
      ))}
      {children}
      {tong > 1 && (
        <>
          <button type="button" className="banner-mui-ten trai" aria-label="Ảnh trước" onClick={() => chuyen(-1)}>
            <LeftOutlined />
          </button>
          <button type="button" className="banner-mui-ten phai" aria-label="Ảnh tiếp theo" onClick={() => chuyen(1)}>
            <RightOutlined />
          </button>
          <div className="banner-cham">
            {anh.map((a, i) => (
              <button key={a} type="button" className={i === so ? 'hien' : undefined} aria-label={`Ảnh ${i + 1}`}
                onClick={() => setSo(i)} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
