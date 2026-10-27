package vn.vietbac.phongkham.dichvu;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Gói 10 – thu ngân: tạm thu chi phí cận lâm sàng trước khi thực hiện (UC10.7, BR10). Một biên lai gom các phiếu
 * chỉ định cùng lượt khám được thu một lần; phiếu đã thu vào hàng chờ của phòng cận lâm sàng.
 */
@Service
public class ThuNganService {

    private static final List<String> HINH_THUC = List.of("TIEN_MAT", "CHUYEN_KHOAN");

    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final TruyVan tv;
    private final DongHo dongHo;

    public ThuNganService(ThongBaoService thongBao, NhatKyService nhatKy, TruyVan tv, DongHo dongHo) {
        this.thongBao = thongBao;
        this.nhatKy = nhatKy;
        this.tv = tv;
        this.dongHo = dongHo;
    }

    /** Các lượt khám còn phiếu chờ tạm thu, kèm từng phiếu; người chỉ định sớm nhất đứng đầu. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsChoTamThu(String tuKhoa) {
        String k = tuKhoa == null || tuKhoa.isBlank() ? null : "%" + tuKhoa.strip() + "%";
        List<Map<String, Object>> ds = tv.ds("""
                SELECT lk.MaLK, lk.MaLichHen, lk.NgayKham, lk.TrangThaiBHYT, lk.MucHuong, bn.MaBN, bn.HoTen, bn.NgaySinh,
                       bn.GioiTinh, bn.SDT, bs.HoTen AS BacSi, COUNT(*) AS SoPhieu, SUM(p.GiaDichVu) AS TongGia,
                       SUM(p.BHYTChiTra) AS BHYTChiTra, SUM(p.BenhNhanTra) AS SoTienPhaiThu,
                       MIN(p.ThoiDiemChiDinh) AS ThoiDiemChiDinh
                FROM PhieuChiDinh p JOIN LuotKham lk ON lk.MaLK = p.MaLK JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                JOIN NhanVien bs ON bs.MaNV = lk.MaBS
                WHERE p.TrangThai = 'CHO_THANH_TOAN' AND lk.TrangThai = 'CHO_CLS'
                """ + (k == null ? "" : " AND (bn.HoTen LIKE ? OR bn.SDT LIKE ? OR lk.MaLichHen LIKE ?)") + """
                 GROUP BY lk.MaLK, lk.MaLichHen, lk.NgayKham, lk.TrangThaiBHYT, lk.MucHuong, bn.MaBN, bn.HoTen,
                          bn.NgaySinh, bn.GioiTinh, bn.SDT, bs.HoTen
                ORDER BY MIN(p.ThoiDiemChiDinh)""", k == null ? new Object[0] : new Object[] {k, k, k});
        for (Map<String, Object> lk : ds) {
            lk.put("Phieu", tv.ds("""
                    SELECT p.MaPCD, dv.TenDV, dv.LoaiDV, ph.MaSoPhong, ph.TenPhong, p.GiaDichVu, p.GiaBHYT, p.BHYTChiTra,
                           p.BenhNhanTra, p.ThoiDiemChiDinh, dv.YeuCauNhinAn
                    FROM PhieuChiDinh p JOIN DichVu dv ON dv.MaDV = p.MaDV JOIN Phong ph ON ph.MaPhong = p.MaPhong
                    WHERE p.MaLK = ? AND p.TrangThai = 'CHO_THANH_TOAN' ORDER BY p.ThuTuGoiY, p.MaPCD""", lk.get("MaLK")));
        }
        return ds;
    }

    /** Số lượt đang chờ tạm thu, hiện trên menu của lễ tân. */
    @Transactional(readOnly = true)
    public long soChoTamThu() {
        return tv.dem("""
                SELECT COUNT(DISTINCT p.MaLK) FROM PhieuChiDinh p JOIN LuotKham lk ON lk.MaLK = p.MaLK
                WHERE p.TrangThai = 'CHO_THANH_TOAN' AND lk.TrangThai = 'CHO_CLS'""");
    }

    /**
     * Thu các phiếu đã chọn của một lượt khám, lập biên lai (BR10) rồi đưa phiếu vào hàng chờ phòng thực hiện.
     * Tiền mặt phải đưa đủ; chuyển khoản do lễ tân xác nhận đã nhận tiền.
     */
    @Transactional
    public Map<String, Object> thu(Integer maLK, List<Integer> dsMaPCD, String hinhThuc, BigDecimal tienKhachDua,
                                   Integer maNV, Integer maTK) {
        if (!HINH_THUC.contains(hinhThuc)) {
            throw new LoiNghiepVu("Hình thức thanh toán không hợp lệ");
        }
        if (dsMaPCD == null || dsMaPCD.isEmpty()) {
            throw new LoiNghiepVu("Vui lòng chọn ít nhất một phiếu cần thu");
        }
        Map<String, Object> lk = tv.mot("""
                SELECT lk.MaLK, lk.MaLichHen, lk.MaBN, lk.TrangThai, bn.HoTen FROM LuotKham lk
                JOIN BenhNhan bn ON bn.MaBN = lk.MaBN WHERE lk.MaLK = ? FOR UPDATE""", maLK);
        if (lk == null) {
            throw new KhongTimThay("Không tìm thấy lượt khám");
        }
        if (!"CHO_CLS".equals(lk.get("TrangThai"))) {
            throw new LoiNghiepVu("Lượt khám không còn chờ cận lâm sàng");
        }
        List<Map<String, Object>> phieu = tv.ds("""
                SELECT p.MaPCD, p.BenhNhanTra, dv.TenDV, ph.MaSoPhong FROM PhieuChiDinh p
                JOIN DichVu dv ON dv.MaDV = p.MaDV JOIN Phong ph ON ph.MaPhong = p.MaPhong
                WHERE p.MaLK = ? AND p.MaPCD IN (?) AND p.TrangThai = 'CHO_THANH_TOAN'
                ORDER BY p.ThuTuGoiY, p.MaPCD FOR UPDATE""", maLK, dsMaPCD);
        if (phieu.size() != new HashSet<>(dsMaPCD).size()) {
            throw new LoiNghiepVu("Có phiếu đã được thu, đã hủy hoặc không thuộc lượt khám này, vui lòng tải lại");
        }
        BigDecimal tong = phieu.stream().map(p -> (BigDecimal) p.get("BenhNhanTra"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean tienMat = "TIEN_MAT".equals(hinhThuc);
        if (tienMat && (tienKhachDua == null || tienKhachDua.compareTo(tong) < 0)) {
            throw new LoiNghiepVu("Tiền khách đưa chưa đủ " + String.format("%,d", tong.longValue()).replace(',', '.') + " đ");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        // Mã biên lai cần MaBL nên ghi mã tạm (duy nhất) trước rồi đổi lại
        tv.capNhat("""
                INSERT INTO BienLaiTamThu (MaSoBienLai, MaLK, MaThuNgan, TongTien, HinhThuc, TienKhachDua, ThoiDiemThu)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                "T" + UUID.randomUUID().toString().replace("-", "").substring(0, 19), maLK, maNV, tong, hinhThuc,
                tienMat ? tienKhachDua : null, bayGio);
        Integer maBL = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        String maSo = "BL" + bayGio.format(DateTimeFormatter.ofPattern("yyMMdd")) + String.format("%04d", maBL % 10000);
        tv.capNhat("UPDATE BienLaiTamThu SET MaSoBienLai = ? WHERE MaBL = ?", maSo, maBL);
        tv.capNhat("""
                UPDATE PhieuChiDinh SET TrangThai = 'CHO_THUC_HIEN', MaBL = ?, ThoiDiemVaoHangCho = ?
                WHERE MaPCD IN (?)""", maBL, bayGio, dsMaPCD);
        nhatKy.ghi(maTK, "THU_TAM_THU", "BienLaiTamThu", maBL, maSo + " - " + lk.get("MaLichHen") + " "
                + lk.get("HoTen") + ": " + tong.toPlainString() + " đ, " + phieu.size() + " phiếu");
        String loTrinh = phieu.stream().map(p -> p.get("MaSoPhong") + " (" + p.get("TenDV") + ")")
                .collect(Collectors.joining(", "));
        thongBao.benhNhan((Integer) lk.get("MaBN"), "LO_TRINH_CLS", "Đã tạm thu chi phí cận lâm sàng",
                "Biên lai " + maSo + ". Mời bạn đến phòng thực hiện: " + loTrinh + ".", "LUOT_KHAM", maLK, false);
        return bienLai(maBL);
    }

    /** Biên lai để in: thông tin phòng khám, bệnh nhân, các phiếu đã thu. */
    @Transactional(readOnly = true)
    public Map<String, Object> bienLai(Integer maBL) {
        Map<String, Object> bl = tv.mot("""
                SELECT bl.MaBL, bl.MaSoBienLai, bl.MaLK, bl.TongTien, bl.HinhThuc, bl.TienKhachDua, bl.TienThua,
                       bl.ThoiDiemThu, bl.TrangThai, tn.HoTen AS ThuNgan, lk.MaLichHen, bn.HoTen, bn.NgaySinh, bn.GioiTinh,
                       bn.SDT, bs.HoTen AS BacSi
                FROM BienLaiTamThu bl JOIN NhanVien tn ON tn.MaNV = bl.MaThuNgan JOIN LuotKham lk ON lk.MaLK = bl.MaLK
                JOIN BenhNhan bn ON bn.MaBN = lk.MaBN JOIN NhanVien bs ON bs.MaNV = lk.MaBS
                WHERE bl.MaBL = ?""", maBL);
        if (bl == null) {
            throw new KhongTimThay("Không tìm thấy biên lai");
        }
        bl.put("Phieu", tv.ds("""
                SELECT p.MaPCD, dv.TenDV, ph.MaSoPhong, ph.TenPhong, p.GiaDichVu, p.BHYTChiTra, p.BenhNhanTra, p.TrangThai
                FROM PhieuChiDinh p JOIN DichVu dv ON dv.MaDV = p.MaDV JOIN Phong ph ON ph.MaPhong = p.MaPhong
                WHERE p.MaBL = ? ORDER BY p.ThuTuGoiY, p.MaPCD""", maBL));
        bl.put("PhongKham", tv.mot("SELECT TenPhongKham, DiaChi, Hotline FROM ThongTinPhongKham WHERE Id = 1"));
        return bl;
    }

    /** Biên lai tạm thu trong ngày, mới nhất trước. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsBienLai(LocalDate ngay) {
        return tv.ds("""
                SELECT bl.MaBL, bl.MaSoBienLai, bl.MaLK, lk.MaLichHen, bn.HoTen, bl.TongTien, bl.HinhThuc, bl.ThoiDiemThu,
                       bl.TrangThai, tn.HoTen AS ThuNgan,
                       (SELECT COUNT(*) FROM PhieuChiDinh p WHERE p.MaBL = bl.MaBL) AS SoPhieu
                FROM BienLaiTamThu bl JOIN LuotKham lk ON lk.MaLK = bl.MaLK JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                JOIN NhanVien tn ON tn.MaNV = bl.MaThuNgan
                WHERE bl.ThoiDiemThu >= ? AND bl.ThoiDiemThu < ?
                ORDER BY bl.ThoiDiemThu DESC, bl.MaBL DESC""",
                (ngay == null ? dongHo.homNay() : ngay).atStartOfDay(),
                (ngay == null ? dongHo.homNay() : ngay).plusDays(1).atStartOfDay());
    }

    /** Tài khoản nhận chuyển khoản của phòng khám (UC3.6), hiện khi lễ tân chọn chuyển khoản. */
    @Transactional(readOnly = true)
    public Map<String, Object> taiKhoanNhan() {
        return tv.mot("SELECT MaNganHang, SoTaiKhoan, TenTaiKhoan FROM ThongTinPhongKham WHERE Id = 1");
    }
}
