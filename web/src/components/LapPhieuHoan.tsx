import { Alert, App, Form, Input, InputNumber, Modal, Select, Typography } from 'antd'
import { useState } from 'react'
import { api, LoiApi, type LyDoHoan } from '@/lib/api'
import { NGUONG_DUYET_HOAN, TEN_LY_DO_HOAN, tien } from '@/lib/hangSo'

/** Lý do lễ tân được chọn khi lập tay; hủy phiếu CLS và hóa đơn thay thế do hệ thống tự tạo. */
const LY_DO_LAP_TAY: LyDoHoan[] = ['CHUYEN_KHOAN_THUA', 'BHYT_XAC_MINH', 'KHAC']

/**
 * UC10.4 luồng 1b: lễ tân lập đề nghị hoàn tiền từ một biên lai (maBl) hoặc hóa đơn (maHd) đã thu.
 * Số tiền trên ngưỡng BR31 sẽ chờ quản trị viên duyệt trước khi chi.
 */
export default function LapPhieuHoan({ maBl, maHd, maChungTu, toiDa, onDong, onXong }: {
  maBl?: number; maHd?: number; maChungTu: string; toiDa: number; onDong: () => void; onXong: () => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ ly_do: LyDoHoan; so_tien: number; ghi_chu?: string }>()
  const [dangGui, setDangGui] = useState(false)
  const soTien = Form.useWatch('so_tien', form)

  const gui = async (v: { ly_do: LyDoHoan; so_tien: number; ghi_chu?: string }) => {
    setDangGui(true)
    try {
      await api.lapPhieuHoan({ ma_bl: maBl, ma_hd: maHd, ly_do: v.ly_do, so_tien: v.so_tien, ghi_chu: v.ghi_chu?.trim() || undefined })
      message.success(v.so_tien > NGUONG_DUYET_HOAN ? 'Đã lập phiếu, chờ quản trị viên duyệt' : 'Đã lập phiếu hoàn tiền')
      onXong()
    } catch (e) {
      message.error(e instanceof LoiApi ? e.message : 'Không lập được phiếu hoàn tiền')
    } finally {
      setDangGui(false)
    }
  }

  return (
    <Modal open title={`Lập phiếu hoàn tiền · ${maChungTu}`} onCancel={onDong} okText="Lập phiếu" cancelText="Đóng"
      confirmLoading={dangGui} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={gui} initialValues={{ ly_do: 'CHUYEN_KHOAN_THUA' }}>
        <Form.Item name="ly_do" label="Lý do (BR31)">
          <Select options={LY_DO_LAP_TAY.map((l) => ({ value: l, label: TEN_LY_DO_HOAN[l] }))} />
        </Form.Item>
        <Form.Item name="so_tien" label="Số tiền hoàn" extra={`Tối đa ${tien(toiDa)} (đã thu trừ các phiếu đã lập)`}
          rules={[{ required: true, message: 'Nhập số tiền' }]}>
          <InputNumber<number> min={1000} max={toiDa} step={1000} style={{ width: '100%' }} suffix="đ"
            formatter={(v) => (v == null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
            parser={(v) => Number((v ?? '').replace(/\D/g, '')) || 0} />
        </Form.Item>
        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input maxLength={255} placeholder="VD: Bệnh nhân chuyển khoản 2 lần" />
        </Form.Item>
      </Form>
      {soTien > NGUONG_DUYET_HOAN && (
        <Alert type="warning" showIcon title={`Trên ${tien(NGUONG_DUYET_HOAN)}: phiếu cần quản trị viên duyệt trước khi chi`} />
      )}
      <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
        Phiếu hủy CLS đã thu và phần chênh hóa đơn thay thế được hệ thống tự tạo, không cần lập tay.
      </Typography.Paragraph>
    </Modal>
  )
}
