import { InboxOutlined } from '@ant-design/icons'
import { Alert, Button, Flex, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { api, type EmailThu } from '@/lib/api'

/**
 * Hộp thư giả lập khi backend bật CHE_DO_THU=1: chưa có worker gửi email nên
 * đây là cách xem mã OTP / mật khẩu tạm lúc phát triển. Tự ẩn khi chế độ thử tắt.
 */
export default function HopThuThu({ dinhDanh }: { dinhDanh?: string }) {
  const [batCheDoThu, setBatCheDoThu] = useState(false)
  const [thu, setThu] = useState<EmailThu[] | null>(null)
  const [dangTai, setDangTai] = useState(false)

  useEffect(() => {
    api.cauHinh().then((c) => setBatCheDoThu(c.che_do_thu)).catch(() => setBatCheDoThu(false))
  }, [])

  if (!batCheDoThu || !dinhDanh) return null

  const moHopThu = async () => {
    setDangTai(true)
    try {
      setThu(await api.hopThu(dinhDanh))
    } finally {
      setDangTai(false)
    }
  }

  return (
    <Alert
      type="warning"
      showIcon
      icon={<InboxOutlined />}
      style={{ marginTop: 24 }}
      title="Chế độ thử: chưa gửi email thật"
      description={
        <>
          <Button size="small" onClick={moHopThu} loading={dangTai} style={{ margin: '4px 0 8px' }}>
            {thu ? 'Tải lại hộp thư' : 'Mở hộp thư thử'}
          </Button>
          {thu && thu.length === 0 && <div>Chưa có email nào</div>}
          {thu && (
            <Flex vertical gap={8}>
              {thu.map((e, i) => (
                <div key={i}>
                  <Typography.Text strong>{e.TieuDe}</Typography.Text>{' '}
                  <Typography.Text type="secondary">{dayjs(e.ThoiGianTao).format('HH:mm:ss')}</Typography.Text>
                  <div>{e.NoiDung}</div>
                </div>
              ))}
            </Flex>
          )}
        </>
      }
    />
  )
}
