import { Grid } from 'antd'

/** Màn hình điện thoại / máy tính bảng dọc: dưới mốc lg (992px) của Ant Design, khớp @media trong index.css. */
export function useManHinhNho() {
  const screens = Grid.useBreakpoint()
  // Lần render đầu useBreakpoint còn rỗng: đoán theo độ rộng cửa sổ để không bị nháy bố cục
  return screens.lg === undefined ? window.innerWidth < 992 : !screens.lg
}

/**
 * Chỉ tự đặt con trỏ vào ô nhập khi có chuột. Trên điện thoại, autoFocus bật bàn phím ảo ngay khi mở trang
 * và che mất nửa màn hình.
 */
export const TU_DONG_FOCUS = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches

/** Ô nhập email / tên đăng nhập: tắt viết hoa chữ đầu và tự sửa chính tả của bàn phím điện thoại. */
export const KHONG_TU_SUA = { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } as const

/** Thanh bước (Steps) trên điện thoại: giữ hàng ngang, tên bước nằm dưới số để không bị chèn ép. */
export function useKieuBuoc() {
  const nho = useManHinhNho()
  return nho ? ({ responsive: false, titlePlacement: 'vertical' } as const) : {}
}
