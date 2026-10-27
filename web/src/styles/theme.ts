import type { ThemeConfig } from 'antd'

/** Bảng màu xanh dương (tham khảo myhospital.vn), dùng chung cho antd và CSS. */
export const MAU = {
  chinh: '#1565D8', // nút chính, liên kết, mục đang chọn
  chinhDam: '#0D4FB0',
  chinhNhat: '#E8F1FD', // nền mục đang chọn, nhãn
  nhan: '#19B5C9', // logo, ảnh đại diện
  cam: '#F26B1D', // điểm nhấn (dấu cộng trên logo, nút kêu gọi)
  toi: '#0B2A5B', // ngăn menu điện thoại, cột giới thiệu
  toiChon: '#1B3F7A', // mục menu đang chọn trên nền tối
  toiChu: '#D3E0F5',
  toiPhu: '#A7BDE0',
  nen: '#F4F7FB',
  vien: '#DFE6F0',
  vienO: '#C4CFDE', // viền ô nhập, nút phụ
  chu: '#0F1B2D',
  chuPhu: '#526075',
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
    colorInfoBorder: '#B9D3F7',
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
    Card: { headerFontSize: 16, paddingLG: 20, borderRadiusLG: 16 },
    // Nút bo tròn kiểu viên thuốc như mẫu
    Button: {
      fontWeight: 600, primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none',
      borderRadius: 999, borderRadiusLG: 999, borderRadiusSM: 999,
    },
    Table: { headerBg: '#fff', headerColor: MAU.chuPhu, headerSplitColor: 'transparent', rowSelectedBg: MAU.chinhNhat, borderColor: '#EEF2F7' },
    Tabs: { itemSelectedColor: MAU.chinh, inkBarColor: MAU.chinh, titleFontSize: 14 },
    Segmented: { trackBg: '#E4EAF3', itemSelectedBg: '#fff' },
    Tag: { defaultBg: '#EEF2F8', defaultColor: '#3B4658' },
    Steps: { colorPrimary: MAU.chinh },
    Drawer: { colorBgElevated: '#fff' },
  },
}
