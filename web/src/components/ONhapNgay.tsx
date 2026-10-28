import { DatePicker, type DatePickerProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

/**
 * Đọc ngày gõ tay theo nhiều kiểu người dùng hay gõ: 20/02/1988, 20/2/1988, 20-02-1988, 20.02.1988, 20//02/1988,
 * 20021988, 20/02/88. Trả về null nếu không phải ngày có thật (VD 31/02/1988).
 */
export function docNgay(chu: string): Dayjs | null {
  const s = chu.trim()
  if (!s) return null
  let nhom = s.match(/\d+/g) ?? []
  if (nhom.length === 1 && (nhom[0].length === 8 || nhom[0].length === 6)) {
    const so = nhom[0]
    nhom = [so.slice(0, 2), so.slice(2, 4), so.slice(4)]
  }
  if (nhom.length !== 3) return null
  const [d, m] = nhom.slice(0, 2).map(Number)
  let y = Number(nhom[2])
  if (nhom[2].length === 2) {
    // Năm 2 chữ số: không vượt quá năm nay thì là 20xx, ngược lại 19xx
    y += y <= dayjs().year() % 100 ? 2000 : 1900
  } else if (nhom[2].length !== 4) {
    return null
  }
  const ngay = dayjs(new Date(y, m - 1, d))
  return ngay.isValid() && ngay.date() === d && ngay.month() === m - 1 && ngay.year() === y ? ngay : null
}

/**
 * Ô chọn ngày dạng dd/mm/yyyy, nhận cả ngày gõ tay theo nhiều kiểu (xem docNgay). DatePicker của antd chỉ nhận
 * chuỗi đúng hệt định dạng và bỏ chữ đã gõ khi rời ô; ở đây đọc lại chữ đã gõ lúc rời ô / nhấn Enter.
 * Dùng thay DatePicker trong Form.Item.
 */
export default function ONhapNgay(props: DatePickerProps) {
  const { onBlur, onKeyDown, onChange, disabledDate, format = 'DD/MM/YYYY', placeholder = 'dd/mm/yyyy', ...con } = props
  const nhan = (chu: string) => {
    const ngay = docNgay(chu)
    if (!ngay || (props.value && dayjs(props.value as Dayjs).isSame(ngay, 'day'))) return
    if (disabledDate?.(ngay, { type: 'date' })) return
    onChange?.(ngay as never, ngay.format('DD/MM/YYYY') as never)
  }
  return (
    <DatePicker {...con} format={format} placeholder={placeholder as string} disabledDate={disabledDate}
      onChange={onChange}
      onBlur={(e, info) => { nhan((e.target as HTMLInputElement).value); onBlur?.(e, info) }}
      onKeyDown={(e, ...r) => {
        if (e.key === 'Enter') nhan((e.target as HTMLInputElement).value)
        onKeyDown?.(e, ...r)
      }} />
  )
}
