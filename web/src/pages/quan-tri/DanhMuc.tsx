import { Card, Tabs, Typography } from 'antd'
import { useSearchParams } from 'react-router-dom'
import ChuyenKhoaTab from './danh-muc/ChuyenKhoaTab'
import DichVuTab from './danh-muc/DichVuTab'
import IcdTab from './danh-muc/IcdTab'
import PhongTab from './danh-muc/PhongTab'
import ThongTinTab from './danh-muc/ThongTinTab'
import ThuocTab from './danh-muc/ThuocTab'

const TAB = [
  { key: 'chuyen-khoa', label: 'Chuyên khoa', children: <ChuyenKhoaTab /> },
  { key: 'phong', label: 'Phòng', children: <PhongTab /> },
  { key: 'dich-vu', label: 'Dịch vụ', children: <DichVuTab /> },
  { key: 'thuoc', label: 'Thuốc', children: <ThuocTab /> },
  { key: 'icd', label: 'Mã ICD-10', children: <IcdTab /> },
  { key: 'thong-tin', label: 'Thông tin phòng khám', children: <ThongTinTab /> },
]

/** Gói 3: quản trị viên quản lý các danh mục dùng chung của phòng khám; tab đang mở giữ trên đường dẫn (?tab=). */
export default function DanhMuc() {
  const [thamSo, setThamSo] = useSearchParams()
  const tab = TAB.some((t) => t.key === thamSo.get('tab')) ? thamSo.get('tab')! : TAB[0].key
  return (
    <Card>
      <Typography.Title level={4} style={{ marginTop: 0 }}>Danh mục</Typography.Title>
      <Tabs activeKey={tab} onChange={(k) => setThamSo({ tab: k }, { replace: true })} items={TAB} destroyOnHidden />
    </Card>
  )
}
