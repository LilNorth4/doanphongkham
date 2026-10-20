/**
 * Ảnh minh họa dùng trên giao diện, gom một chỗ để dễ thay.
 *
 * Hiện dùng TẠM ảnh Unsplash (cần mạng). Khi có ảnh thật: chép vào web/public/anh/
 * rồi đổi giá trị tương ứng thành đường dẫn gốc, ví dụ '/anh/banner.jpg'.
 */
const unsplash = (id: string, rong = 1200) => `https://images.unsplash.com/${id}?w=${rong}&q=75&auto=format&fit=crop`

export const ANH = {
  // Banner trình chiếu đầu trang chủ (tự đổi sau 5 giây, thêm bớt ảnh tùy ý) và nền cột giới thiệu trang đăng nhập
  banner: [
    unsplash('photo-1581056771107-24ca5f033842', 1600),
    unsplash('photo-1666214280557-f1b5022eb634', 1600),
    unsplash('photo-1580281657527-47f249e8f4df', 1600),
  ],
  nenDangNhap: unsplash('photo-1519494026892-80bbd2d6fd0d', 1400),

  // Thẻ "Vì sao chọn chúng tôi" trên trang chủ bệnh nhân
  tanTinh: unsplash('photo-1631217868264-e5b90bb7e133', 600),
  bacSi: unsplash('photo-1612349317150-e413f6a5b16d', 600),
  thietBi: unsplash('photo-1666214280391-8ff5bd3c0bf0', 600),
  datLichNhanh: unsplash('photo-1576091160399-112ba8d25d1d', 600),

  // Ảnh chuyên khoa, khóa theo MaCK (bảng ChuyenKhoa); chuyên khoa chưa có ảnh dùng ảnh mặc định
  chuyenKhoa: {
    1: unsplash('photo-1631815588090-d4bfec5b1ccb', 800), // Nội tổng quát
    2: unsplash('photo-1609220136736-443140cffec6', 800), // Nhi
    3: unsplash('photo-1532938911079-1b06ac7ceec7', 800), // Tai Mũi Họng
    4: unsplash('photo-1616394584738-fc6e612e71b9', 800), // Da liễu
    5: unsplash('photo-1584362917165-526a968579e8', 800), // Tiêu hóa
  } as Record<number, string>,
  chuyenKhoaMacDinh: unsplash('photo-1584982751601-97dcc096659c', 800),
}

export const anhChuyenKhoa = (maCk: number) => ANH.chuyenKhoa[maCk] ?? ANH.chuyenKhoaMacDinh
