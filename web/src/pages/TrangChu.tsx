import {
  AppstoreOutlined, ArrowRightOutlined, CalendarOutlined, ClusterOutlined, CheckCircleTwoTone, ClockCircleOutlined, FileProtectOutlined, FileSearchOutlined, FormOutlined, GlobalOutlined,
  PhoneOutlined, SafetyCertificateOutlined, ScheduleOutlined, SolutionOutlined, TeamOutlined,
} from '@ant-design/icons'
import { Button, Card, Col, Empty, Flex, Row, Typography, theme } from 'antd'
import { useNavigate } from 'react-router-dom'
import BannerAnh from '@/components/BannerAnh'
import { ANH } from '@/lib/anh'
import { usePhien } from '@/lib/auth'
import { TEN_PHONG_KHAM } from '@/lib/hangSo'

// Tên quyền theo bảng Quyen trong backend/src/main/resources/db/migration/V1__tao_bang.sql
const TEN_QUYEN: Record<string, string> = {
  'TAI_KHOAN.QUAN_LY': 'Quản lý tài khoản người dùng',
  'VAI_TRO.QUAN_LY': 'Quản lý vai trò và quyền',
  'NHAT_KY.XEM': 'Xem nhật ký truy cập hồ sơ',
  'DANH_MUC.QUAN_LY': 'Quản lý danh mục',
  'MAT_BANG.QUAN_LY': 'Quản lý sơ đồ mặt bằng',
  'LICH_LV.QUAN_LY': 'Tạo, duyệt ca làm việc',
  'LICH_LV.DANG_KY': 'Đăng ký ca làm việc',
  'KHUNG_GIO.KHOA': 'Khóa, mở khung giờ',
  'LICH_LV.XEM': 'Xem lịch làm việc',
  'LICH_HEN.DAT': 'Đặt, hủy, đổi lịch khám',
  'LICH_HEN.DUYET': 'Duyệt, từ chối, hủy lịch hẹn',
  'TIEP_DON.CHECK_IN': 'Check-in, kiểm tra BHYT',
  'BENH_NHAN.QUAN_LY': 'Quản lý hồ sơ bệnh nhân',
  'KHAM.THUC_HIEN': 'Khám, ghi hồ sơ bệnh án',
  'KHAM.CHI_DINH': 'Chỉ định cận lâm sàng',
  'KHAM.KE_DON': 'Kê đơn thuốc',
  'HO_SO.XEM_CUA_MINH': 'Xem hồ sơ sức khỏe cá nhân',
  'DANH_GIA.GUI': 'Đánh giá, gửi góp ý',
  'THANH_TOAN.THU': 'Thu tiền, thanh toán hóa đơn',
  'HOA_DON.HUY': 'Hủy hóa đơn',
  'THONG_KE.XEM': 'Xem thống kê, xuất báo cáo',
  'GOP_Y.XU_LY': 'Xử lý góp ý, khiếu nại',
  'CHATBOT.TRI_THUC': 'Quản lý dữ liệu tri thức',
  'AI.TU_VAN': 'Tư vấn sức khỏe sau khám',
  'CLS.THUC_HIEN': 'Tiếp nhận, trả kết quả cận lâm sàng',
}

function loiChao() {
  const gio = new Date().getHours()
  return gio < 11 ? 'Chào buổi sáng' : gio < 14 ? 'Chào buổi trưa' : gio < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
}

const LOI_TAT = [
  { quyen: 'LICH_HEN.DAT', duong: '/dat-lich', icon: <CalendarOutlined />, ten: 'Đặt lịch khám', moTa: 'Chọn chuyên khoa, bác sĩ, giờ khám' },
  { quyen: 'LICH_HEN.DAT', duong: '/lich-hen-cua-toi', icon: <ScheduleOutlined />, ten: 'Lịch hẹn của tôi', moTa: 'Xem, đổi, hủy lịch và danh sách chờ' },
  { quyen: 'HO_SO.XEM_CUA_MINH', duong: '/ho-so-suc-khoe', icon: <FileProtectOutlined />, ten: 'Hồ sơ sức khỏe', moTa: 'Chẩn đoán, đơn thuốc, kết quả xét nghiệm' },
  { quyen: 'LICH_HEN.DUYET', duong: '/le-tan/lich-hen', icon: <SolutionOutlined />, ten: 'Quản lý lịch hẹn', moTa: 'Duyệt lịch, check-in bệnh nhân' },
  { quyen: 'LICH_HEN.DUYET', duong: '/le-tan/dat-lich', icon: <PhoneOutlined />, ten: 'Đặt lịch hộ', moTa: 'Điện thoại, tin nhắn, vãng lai' },
  { quyen: 'KHAM.THUC_HIEN', duong: '/bac-si/lich-kham', icon: <FormOutlined />, ten: 'Lịch khám', moTa: 'Gọi bệnh nhân, khám, kê đơn, chỉ định CLS' },
  { quyen: 'TAI_KHOAN.QUAN_LY', duong: '/quan-ly/tai-khoan', icon: <TeamOutlined />, ten: 'Quản lý tài khoản', moTa: 'Nhân viên, bệnh nhân, khóa, mật khẩu' },
  { quyen: 'VAI_TRO.QUAN_LY', duong: '/quan-ly/phan-quyen', icon: <SafetyCertificateOutlined />, ten: 'Phân quyền', moTa: 'Quyền của từng vai trò' },
  { quyen: 'DANH_MUC.QUAN_LY', duong: '/quan-ly/danh-muc', icon: <AppstoreOutlined />, ten: 'Danh mục', moTa: 'Chuyên khoa, phòng, dịch vụ, thuốc, ICD' },
  { quyen: 'MAT_BANG.QUAN_LY', duong: '/quan-ly/mat-bang', icon: <ClusterOutlined />, ten: 'Sơ đồ mặt bằng', moTa: 'Vị trí phòng, đường đi, chỉ đường' },
  { quyen: 'NHAT_KY.XEM', duong: '/quan-ly/nhat-ky', icon: <FileSearchOutlined />, ten: 'Nhật ký hệ thống', moTa: 'Thao tác quản trị, truy cập hồ sơ' },
]

// Thẻ ảnh "Vì sao chọn chúng tôi" (chỉ hiện với bệnh nhân)
const LY_DO = [
  { anh: ANH.tanTinh, ten: 'Dịch vụ tận tình', moTa: 'Nhân viên hướng dẫn từ lúc đặt lịch đến khi nhận kết quả' },
  { anh: ANH.bacSi, ten: 'Bác sĩ giàu kinh nghiệm', moTa: 'Đội ngũ bác sĩ chuyên khoa nhiều năm công tác' },
  { anh: ANH.thietBi, ten: 'Thiết bị hiện đại', moTa: 'Xét nghiệm, chẩn đoán hình ảnh, nội soi tại chỗ' },
  { anh: ANH.datLichNhanh, ten: 'Đặt lịch nhanh chóng', moTa: 'Chọn bác sĩ, giờ khám trực tuyến, không phải xếp hàng' },
]

export default function TrangChu() {
  const { nguoiDung } = usePhien()
  const navigate = useNavigate()
  const { token } = theme.useToken()
  if (!nguoiDung) return null
  const loiTat = LOI_TAT.filter((l) => nguoiDung.Quyen.includes(l.quyen))
  const laBenhNhan = nguoiDung.VaiTro === 'BENH_NHAN'

  return (
    <Row gutter={[24, 24]}>
      <Col span={24}>
        <BannerAnh anh={ANH.banner}>
          <div className="banner-chu">
            <span className="banner-nhan">{TEN_PHONG_KHAM}</span>
            <h2>{loiChao()}, {nguoiDung.HoTen}</h2>
            <p>
              {laBenhNhan
                ? 'Chúc bạn luôn khỏe mạnh. Đặt lịch trực tuyến, chọn bác sĩ và giờ khám phù hợp chỉ trong vài bước.'
                : 'Chúc bạn một ngày làm việc hiệu quả.'}
            </p>
            {loiTat[0] && (
              <Button type="primary" size="large" icon={<ArrowRightOutlined />} iconPlacement="end"
                onClick={() => navigate(loiTat[0].duong)}>
                {laBenhNhan ? 'Đặt lịch ngay' : loiTat[0].ten}
              </Button>
            )}
          </div>
        </BannerAnh>
      </Col>
      {loiTat.map((l) => (
        <Col xs={24} sm={12} xl={6} key={l.duong}>
          <Card hoverable onClick={() => navigate(l.duong)} style={{ height: '100%' }}>
            <Flex gap={14} align="center">
              <Flex align="center" justify="center" style={{
                width: 44, height: 44, borderRadius: 12, fontSize: 20, flex: 'none',
                background: token.colorPrimaryBg, color: token.colorPrimary,
              }}>{l.icon}</Flex>
              <div>
                <Typography.Text strong>{l.ten}</Typography.Text>
                <div><Typography.Text type="secondary" style={{ fontSize: 13 }}>{l.moTa}</Typography.Text></div>
              </div>
            </Flex>
          </Card>
        </Col>
      ))}
      {laBenhNhan && (
        <Col span={24}>
          <Card title="Vì sao chọn Phòng khám Việt Bắc">
            <Row gutter={[16, 24]}>
              {LY_DO.map((l) => (
                <Col xs={12} lg={6} key={l.ten} className="ly-do">
                  <img src={l.anh} alt={l.ten} loading="lazy" />
                  <Typography.Text strong>{l.ten}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>{l.moTa}</Typography.Text>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      )}
      <Col span={24}>
        <Card title="Chức năng của bạn">
          {nguoiDung.Quyen.length === 0 && <Empty description="Vai trò chưa được cấp quyền nào" />}
          <Row gutter={[12, 12]}>
            {nguoiDung.Quyen.map((q) => (
              <Col key={q} xs={24} sm={12} lg={8}>
                <CheckCircleTwoTone twoToneColor={token.colorPrimary} /> {TEN_QUYEN[q] ?? q}
              </Col>
            ))}
          </Row>
        </Card>
      </Col>
      {laBenhNhan && (
        <Col span={24}>
          <section className="lien-he">
            <strong>{TEN_PHONG_KHAM}</strong>
            <Flex wrap gap="12px 32px">
              <span><PhoneOutlined /> Hotline: 1900 1234</span>
              <span><ClockCircleOutlined /> Thứ 2 – Thứ 7: 7h00–11h30, 13h30–17h00</span>
              <span><GlobalOutlined /> Đặt lịch trực tuyến 24/7</span>
            </Flex>
          </section>
        </Col>
      )}
    </Row>
  )
}
