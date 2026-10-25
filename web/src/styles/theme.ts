import type { ThemeConfig } from 'antd'

/** Bảng màu theo mẫu thiết kế "Giao diện Hệ thống Quản lý Phòng khám", dùng chung cho antd và CSS. */
export const MAU = {
  chinh: '#0F6E64', // nút chính, liên kết, mục đang chọn
  chinhDam: '#0A4F48',
  chinhNhat: '#E3F1EE', // nền mục đang chọn, nhãn
  nhan: '#2BB3A0', // logo, ảnh đại diện
  toi: '#0E3B36', // thanh bên, cột giới thiệu
  toiChon: '#1C5A52', // mục menu đang chọn trên nền tối
  toiChu: '#CFE6E1',
  toiPhu: '#A9CFC8',
  nen: '#F3F6F5',
  vien: '#DCE4E2',
  vienO: '#C3CFCC', // viền ô nhập, nút phụ
  chu: '#12211E',
  chuPhu: '#52615D',
  loi: '#B42318',
}

const FONT = "'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif"

export const giaoDien: ThemeConfig = {
  token: {
    colorPrimary: MAU.chinh,
    colorInfo: MAU.chinh,
    colorLink: MAU.chinh,
    colorLinkHover: MAU.chinhDam,
    // Nền nhạt đặt tay: antd tự sinh từ màu chính đậm ra nền xám đục, hộp thông tin trông như bị vô hiệu
    colorInfoBg: MAU.chinhNhat,
    colorInfoBorder: '#B5D9D2',
    colorSuccess: '#1E7A4C',
    colorSuccessBg: '#E7F4EC',
    colorSuccessBorder: '#B4DCC3',
    colorWarning: '#C2410C',
    colorError: MAU.loi,
    colorText: MAU.chu,
    colorTextSecondary: MAU.chuPhu,
    colorBorder: MAU.vienO,
    colorBorderSecondary: MAU.vien,
    colorBgLayout: MAU.nen,
    fontFamily: FONT,
    fontSize: 14,
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 8,
    controlHeight: 40,
    controlHeightLG: 46,
    boxShadowTertiary: 'none',
  },
  components: {
    Layout: { siderBg: MAU.toi, headerBg: '#fff', bodyBg: MAU.nen },
    Menu: {
      darkItemBg: MAU.toi,
      darkSubMenuItemBg: MAU.toi,
      darkItemColor: MAU.toiChu,
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      darkItemHoverColor: '#fff',
      darkItemSelectedBg: MAU.toiChon,
      darkItemSelectedColor: '#fff',
      itemBorderRadius: 9,
      itemHeight: 42,
      itemMarginInline: 12,
      iconSize: 16,
    },
    Card: { headerFontSize: 16, paddingLG: 20 },
    Button: { fontWeight: 600, primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none', borderRadius: 9 },
    Table: { headerBg: '#fff', headerColor: MAU.chuPhu, headerSplitColor: 'transparent', rowSelectedBg: MAU.chinhNhat, borderColor: '#EEF2F1' },
    Tabs: { itemSelectedColor: MAU.chinh, inkBarColor: MAU.chinh, titleFontSize: 14 },
    Segmented: { trackBg: '#E3EAE8', itemSelectedBg: '#fff' },
    Tag: { defaultBg: '#EEF1F0', defaultColor: '#3B4744' },
    Steps: { colorPrimary: MAU.chinh },
    Drawer: { colorBgElevated: '#fff' },
  },
}
