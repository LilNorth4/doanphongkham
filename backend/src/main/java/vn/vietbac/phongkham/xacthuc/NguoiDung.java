package vn.vietbac.phongkham.xacthuc;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Người dùng của phiên hiện tại: vai trò, hồ sơ gắn kèm và quyền (UC2.7), đọc mới ở mỗi yêu cầu. */
public record NguoiDung(Integer maTK, String email, String sdt, boolean phaiDoiMatKhau, String vaiTro,
                        String tenVaiTro, Integer maNV, Integer maBN, String hoTen, String anhDaiDien, List<String> quyen,
                        String token) {

    public boolean co(String maQuyen) {
        return quyen.contains(maQuyen);
    }

    /** Dạng JSON giao diện đang dùng (không kèm token). */
    public Map<String, Object> thongTin() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("MaTK", maTK);
        m.put("Email", email);
        m.put("SDT", sdt);
        m.put("PhaiDoiMatKhau", phaiDoiMatKhau);
        m.put("VaiTro", vaiTro);
        m.put("TenVaiTro", tenVaiTro);
        m.put("MaNV", maNV);
        m.put("MaBN", maBN);
        m.put("HoTen", hoTen);
        m.put("AnhDaiDien", anhDaiDien);
        m.put("Quyen", quyen);
        return m;
    }

    public NguoiDung voiToken(String t) {
        return new NguoiDung(maTK, email, sdt, phaiDoiMatKhau, vaiTro, tenVaiTro, maNV, maBN, hoTen, anhDaiDien, quyen, t);
    }
}
