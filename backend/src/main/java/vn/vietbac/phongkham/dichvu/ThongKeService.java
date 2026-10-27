package vn.vietbac.phongkham.dichvu;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Gói 13 – thống kê báo cáo: dashboard tổng quan trong ngày / tháng (UC13.1) và thống kê theo tiêu chí (UC13.2):
 * lượt khám, doanh thu và hoàn tiền, tỉ lệ hủy và vắng mặt, hiệu suất bác sĩ, thời gian chờ thực tế.
 * Doanh thu thuần = tạm thu CLS + thu hóa đơn cuối lượt − tiền đã hoàn, tính theo ngày thu / ngày hoàn.
 */
@Service
public class ThongKeService {

    /** Lượt khám bệnh nhân đã đến (đã check-in trở đi, trừ hủy / vắng). */
    private static final List<String> DA_DEN = List.of("DA_CHECK_IN", "DANG_KHAM", "CHO_CLS", "DA_CO_KET_QUA", "HOAN_THANH");
    public static final List<String> LOAI = List.of("LUOT_KHAM", "DOANH_THU", "HUY_VANG", "HIEU_SUAT", "THOI_GIAN_CHO");

    private final TruyVan tv;
    private final DongHo dongHo;

    public ThongKeService(TruyVan tv, DongHo dongHo) {
        this.tv = tv;
        this.dongHo = dongHo;
    }

    public record BoLoc(Integer maCK, Integer maBS, String kenh) {
    }

    // ================= UC13.1: dashboard =================

    @Transactional(readOnly = true)
    public Map<String, Object> tongQuan() {
        LocalDate hn = dongHo.homNay();
        LocalDate dauThang = hn.withDayOfMonth(1);
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("Ngay", hn);
        kq.put("LuotKham", tv.mot("""
                SELECT COALESCE(SUM(NgayKham = ? AND TrangThai IN (?)), 0) AS HomNay,
                       COALESCE(SUM(NgayKham = ? AND TrangThai = 'HOAN_THANH'), 0) AS HoanThanhHomNay,
                       COALESCE(SUM(TrangThai IN (?)), 0) AS Thang,
                       COALESCE(SUM(TrangThai = 'DA_HUY'), 0) AS HuyThang,
                       COALESCE(SUM(TrangThai = 'VANG_MAT'), 0) AS VangThang,
                       COUNT(*) AS LichThang
                FROM LuotKham WHERE NgayKham >= ? AND NgayKham <= ?""", hn, DA_DEN, hn, DA_DEN, dauThang, hn));
        kq.put("LichMoiTheoKenh", tv.ds("""
                SELECT KenhDat, COALESCE(SUM(NgayTao >= ?), 0) AS HomNay, COUNT(*) AS Thang
                FROM LuotKham WHERE NgayTao >= ? GROUP BY KenhDat ORDER BY Thang DESC""",
                hn.atStartOfDay(), dauThang.atStartOfDay()));
        kq.put("DoanhThuHomNay", doanhThu(hn.atStartOfDay(), hn.plusDays(1).atStartOfDay()));
        kq.put("DoanhThuThang", doanhThu(dauThang.atStartOfDay(), hn.plusDays(1).atStartOfDay()));
        kq.put("CanXuLy", tv.mot("""
                SELECT (SELECT COUNT(*) FROM v_GopYQuaHan) AS GopYQuaHan,
                       (SELECT COUNT(*) FROM GiaoDichMoMo WHERE TrangThai = 'CHO_THANH_TOAN' AND ThoiDiemTao < ?) AS MoMoChuaDoiSoat,
                       (SELECT COUNT(*) FROM PhieuHoanTien WHERE TrangThai = 'CHO_DUYET') AS HoanChoDuyet,
                       (SELECT COUNT(*) FROM PhieuHoanTien WHERE TrangThai = 'CHO_HOAN') AS HoanChoChi,
                       (SELECT COUNT(*) FROM HoaDon WHERE TrangThai = 'CHUA_THANH_TOAN') AS HoaDonChuaThu""",
                dongHo.bayGio().minusMinutes(15)));
        List<Map<String, Object>> tuan = tv.ds("""
                SELECT NgayKham AS Ngay, COALESCE(SUM(TrangThai IN (?)), 0) AS DaDen,
                       COALESCE(SUM(TrangThai = 'HOAN_THANH'), 0) AS HoanThanh,
                       COALESCE(SUM(TrangThai IN ('DA_HUY','VANG_MAT')), 0) AS HuyVang
                FROM LuotKham WHERE NgayKham BETWEEN ? AND ? GROUP BY NgayKham""", DA_DEN, hn.minusDays(6), hn);
        kq.put("BayNgay", duNgay(tuan, hn.minusDays(6), hn, List.of("DaDen", "HoanThanh", "HuyVang")));
        return kq;
    }

    private Map<String, Object> doanhThu(LocalDateTime tu, LocalDateTime den) {
        Map<String, Object> d = tv.mot("""
                SELECT (SELECT COALESCE(SUM(TongTien), 0) FROM BienLaiTamThu
                        WHERE TrangThai = 'DA_THU' AND ThoiDiemThu >= ? AND ThoiDiemThu < ?) AS TamThu,
                       (SELECT COALESCE(SUM(GREATEST(ConPhaiThu, 0)), 0) FROM HoaDon
                        WHERE TrangThai = 'DA_THANH_TOAN' AND NgayThanhToan >= ? AND NgayThanhToan < ?) AS HoaDon,
                       (SELECT COALESCE(SUM(SoTien), 0) FROM PhieuHoanTien
                        WHERE TrangThai = 'DA_HOAN' AND ThoiDiemHoan >= ? AND ThoiDiemHoan < ?) AS HoanTien""",
                tu, den, tu, den, tu, den);
        d.put("Thuan", so(d.get("TamThu")).add(so(d.get("HoaDon"))).subtract(so(d.get("HoanTien"))));
        return d;
    }

    // ================= UC13.2: thống kê theo tiêu chí =================

    @Transactional(readOnly = true)
    public Map<String, Object> thongKe(String loai, LocalDate tu, LocalDate den, BoLoc loc) {
        if (!LOAI.contains(loai)) {
            throw new LoiNghiepVu("Loại thống kê không hợp lệ");
        }
        if (tu == null || den == null) {
            throw new LoiNghiepVu("Vui lòng chọn khoảng thời gian");
        }
        if (tu.isAfter(den)) {
            throw new LoiNghiepVu("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");                  // UC13.2 2b
        }
        if (ChronoUnit.DAYS.between(tu, den) > 366) {
            throw new LoiNghiepVu("Chỉ thống kê tối đa 1 năm mỗi lần");
        }
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("Loai", loai);
        kq.put("TuNgay", tu);
        kq.put("DenNgay", den);
        switch (loai) {
            case "LUOT_KHAM" -> luotKham(kq, tu, den, loc);
            case "DOANH_THU" -> doanhThuTheoNgay(kq, tu, den, loc);
            case "HUY_VANG" -> huyVang(kq, tu, den, loc);
            case "HIEU_SUAT" -> hieuSuat(kq, tu, den, loc);
            default -> thoiGianCho(kq, tu, den, loc);
        }
        return kq;
    }

    private void luotKham(Map<String, Object> kq, LocalDate tu, LocalDate den, BoLoc loc) {
        List<Object> ts = new ArrayList<>(List.of(tu, den));
        String dk = dieuKien(loc, ts);
        String cot = """
                COUNT(*) AS TongLich, COALESCE(SUM(lk.TrangThai = 'HOAN_THANH'), 0) AS HoanThanh,
                COALESCE(SUM(lk.TrangThai IN ('DA_CHECK_IN','DANG_KHAM','CHO_CLS','DA_CO_KET_QUA')), 0) AS DangXuLy,
                COALESCE(SUM(lk.TrangThai IN ('CHO_XAC_NHAN','DA_XAC_NHAN')), 0) AS ChuaDen,
                COALESCE(SUM(lk.TrangThai = 'DA_HUY'), 0) AS DaHuy, COALESCE(SUM(lk.TrangThai = 'VANG_MAT'), 0) AS VangMat,
                COALESCE(SUM(lk.TrangThaiBHYT = 'HOP_LE'), 0) AS CoBHYT""";
        String tu_ = " FROM LuotKham lk JOIN NhanVien bs ON bs.MaNV = lk.MaBS LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK"
                + " WHERE lk.NgayKham BETWEEN ? AND ?" + dk;
        kq.put("TheoNgay", duNgay(tv.ds("SELECT lk.NgayKham AS Ngay, " + cot + tu_ + " GROUP BY lk.NgayKham", ts.toArray()),
                tu, den, List.of("TongLich", "HoanThanh", "DangXuLy", "ChuaDen", "DaHuy", "VangMat", "CoBHYT")));
        kq.put("TheoChuyenKhoa", tv.ds("SELECT COALESCE(ck.TenCK, '—') AS Nhom, " + cot + tu_
                + " GROUP BY ck.TenCK ORDER BY TongLich DESC", ts.toArray()));
        kq.put("TheoKenh", tv.ds("SELECT lk.KenhDat AS Nhom, " + cot + tu_ + " GROUP BY lk.KenhDat ORDER BY TongLich DESC",
                ts.toArray()));
        kq.put("TongHop", tv.mot("SELECT " + cot + tu_, ts.toArray()));
    }

    private void huyVang(Map<String, Object> kq, LocalDate tu, LocalDate den, BoLoc loc) {
        List<Object> ts = new ArrayList<>(List.of(tu, den));
        String dk = dieuKien(loc, ts);
        String cot = """
                COUNT(*) AS TongLich, COALESCE(SUM(lk.TrangThai = 'DA_HUY'), 0) AS DaHuy,
                COALESCE(SUM(lk.TrangThai = 'VANG_MAT'), 0) AS VangMat,
                ROUND(100 * COALESCE(SUM(lk.TrangThai = 'DA_HUY'), 0) / COUNT(*), 1) AS TiLeHuy,
                ROUND(100 * COALESCE(SUM(lk.TrangThai = 'VANG_MAT'), 0) / COUNT(*), 1) AS TiLeVang""";
        String tu_ = " FROM LuotKham lk JOIN NhanVien bs ON bs.MaNV = lk.MaBS WHERE lk.NgayKham BETWEEN ? AND ?" + dk;
        kq.put("TheoNgay", duNgay(tv.ds("SELECT lk.NgayKham AS Ngay, " + cot + tu_ + " GROUP BY lk.NgayKham", ts.toArray()),
                tu, den, List.of("TongLich", "DaHuy", "VangMat", "TiLeHuy", "TiLeVang")));
        kq.put("TheoKenh", tv.ds("SELECT lk.KenhDat AS Nhom, " + cot + tu_ + " GROUP BY lk.KenhDat ORDER BY TongLich DESC",
                ts.toArray()));
        kq.put("TongHop", tv.mot("SELECT " + cot + tu_, ts.toArray()));
    }

    private void hieuSuat(Map<String, Object> kq, LocalDate tu, LocalDate den, BoLoc loc) {
        List<Object> ts = new ArrayList<>(List.of(tu, den));
        String dk = dieuKien(loc, ts);
        kq.put("TheoBacSi", tv.ds("""
                SELECT bs.MaNV AS MaBS, bs.HoTen AS BacSi, ck.TenCK, COUNT(*) AS TongLich,
                       COALESCE(SUM(lk.TrangThai = 'HOAN_THANH'), 0) AS HoanThanh,
                       COALESCE(SUM(lk.TrangThai = 'VANG_MAT'), 0) AS VangMat, COALESCE(SUM(lk.TrangThai = 'DA_HUY'), 0) AS DaHuy,
                       ROUND(AVG(CASE WHEN lk.TrangThai = 'HOAN_THANH'
                                 THEN TIMESTAMPDIFF(MINUTE, lk.ThoiDiemBatDauKham, lk.ThoiDiemKetThucKham) END), 1) AS PhutKhamTB,
                       ROUND(AVG(dg.DiemBacSi), 2) AS DiemDanhGiaTB, COUNT(dg.MaDG) AS SoDanhGia,
                       COALESCE(SUM(hd.TongTien), 0) AS DoanhThu
                FROM LuotKham lk JOIN NhanVien bs ON bs.MaNV = lk.MaBS LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                LEFT JOIN DanhGia dg ON dg.MaLK = lk.MaLK
                LEFT JOIN HoaDon hd ON hd.MaLK = lk.MaLK AND hd.TrangThai = 'DA_THANH_TOAN'
                WHERE lk.NgayKham BETWEEN ? AND ?""" + dk
                + " GROUP BY bs.MaNV, bs.HoTen, ck.TenCK ORDER BY HoanThanh DESC, bs.HoTen", ts.toArray()));
    }

    private void thoiGianCho(Map<String, Object> kq, LocalDate tu, LocalDate den, BoLoc loc) {
        List<Object> ts = new ArrayList<>(List.of(tu, den));
        String dk = dieuKien(loc, ts);
        String cot = """
                COUNT(*) AS SoLuot, ROUND(AVG(TIMESTAMPDIFF(MINUTE, lk.ThoiDiemCheckIn, lk.ThoiDiemBatDauKham)), 1) AS PhutChoTB,
                MAX(TIMESTAMPDIFF(MINUTE, lk.ThoiDiemCheckIn, lk.ThoiDiemBatDauKham)) AS PhutChoLauNhat""";
        String tu_ = " FROM LuotKham lk JOIN NhanVien bs ON bs.MaNV = lk.MaBS WHERE lk.NgayKham BETWEEN ? AND ?"
                + " AND lk.ThoiDiemCheckIn IS NOT NULL AND lk.ThoiDiemBatDauKham IS NOT NULL" + dk;
        kq.put("TheoNgay", duNgay(tv.ds("SELECT lk.NgayKham AS Ngay, " + cot + tu_ + " GROUP BY lk.NgayKham", ts.toArray()),
                tu, den, List.of("SoLuot", "PhutChoTB", "PhutChoLauNhat")));
        kq.put("TheoBacSi", tv.ds("SELECT bs.HoTen AS Nhom, " + cot + tu_ + " GROUP BY bs.HoTen ORDER BY PhutChoTB DESC",
                ts.toArray()));
        kq.put("TongHop", tv.mot("SELECT " + cot + tu_, ts.toArray()));
    }

    /** Doanh thu theo ngày thu tiền: tạm thu CLS, thu hóa đơn, tiền đã hoàn; lọc theo bác sĩ / chuyên khoa của lượt khám. */
    private void doanhThuTheoNgay(Map<String, Object> kq, LocalDate tu, LocalDate den, BoLoc loc) {
        LocalDateTime a = tu.atStartOfDay(), b = den.plusDays(1).atStartOfDay();
        List<Object> ts = new ArrayList<>(List.of(a, b, a, b, a, b));
        StringBuilder dk = new StringBuilder();
        if (loc.maCK() != null) {
            dk.append(" AND x.MaCK = ?");
            ts.add(loc.maCK());
        }
        if (loc.maBS() != null) {
            dk.append(" AND x.MaBS = ?");
            ts.add(loc.maBS());
        }
        if (loc.kenh() != null) {
            dk.append(" AND x.KenhDat = ?");
            ts.add(loc.kenh());
        }
        String nguon = """
                FROM (SELECT DATE(bl.ThoiDiemThu) AS Ngay, bl.TongTien AS TamThu, 0 AS HoaDon, 0 AS HoanTien, bl.HinhThuc,
                             lk.MaBS, bs.MaCK, lk.KenhDat
                      FROM BienLaiTamThu bl JOIN LuotKham lk ON lk.MaLK = bl.MaLK JOIN NhanVien bs ON bs.MaNV = lk.MaBS
                      WHERE bl.TrangThai = 'DA_THU' AND bl.ThoiDiemThu >= ? AND bl.ThoiDiemThu < ?
                      UNION ALL
                      SELECT DATE(hd.NgayThanhToan), 0, GREATEST(hd.ConPhaiThu, 0), 0, hd.HinhThuc, lk.MaBS, bs.MaCK, lk.KenhDat
                      FROM HoaDon hd JOIN LuotKham lk ON lk.MaLK = hd.MaLK JOIN NhanVien bs ON bs.MaNV = lk.MaBS
                      WHERE hd.TrangThai = 'DA_THANH_TOAN' AND hd.NgayThanhToan >= ? AND hd.NgayThanhToan < ?
                      UNION ALL
                      SELECT DATE(p.ThoiDiemHoan), 0, 0, p.SoTien, p.HinhThuc, lk.MaBS, bs.MaCK, lk.KenhDat
                      FROM PhieuHoanTien p LEFT JOIN BienLaiTamThu bl ON bl.MaBL = p.MaBL LEFT JOIN HoaDon h ON h.MaHD = p.MaHD
                      JOIN LuotKham lk ON lk.MaLK = COALESCE(bl.MaLK, h.MaLK) JOIN NhanVien bs ON bs.MaNV = lk.MaBS
                      WHERE p.TrangThai = 'DA_HOAN' AND p.ThoiDiemHoan >= ? AND p.ThoiDiemHoan < ?) x
                WHERE 1 = 1""" + dk;
        String cot = "COALESCE(SUM(x.TamThu), 0) AS TamThu, COALESCE(SUM(x.HoaDon), 0) AS HoaDon, "
                + "COALESCE(SUM(x.HoanTien), 0) AS HoanTien, COALESCE(SUM(x.TamThu + x.HoaDon - x.HoanTien), 0) AS Thuan";
        kq.put("TheoNgay", duNgay(tv.ds("SELECT x.Ngay, " + cot + " " + nguon + " GROUP BY x.Ngay", ts.toArray()),
                tu, den, List.of("TamThu", "HoaDon", "HoanTien", "Thuan")));
        kq.put("TheoHinhThuc", tv.ds("SELECT x.HinhThuc AS Nhom, " + cot + " " + nguon
                + " GROUP BY x.HinhThuc ORDER BY Thuan DESC", ts.toArray()));
        kq.put("TongHop", tv.mot("SELECT " + cot + " " + nguon, ts.toArray()));
    }

    // ================= Dùng chung =================

    private static String dieuKien(BoLoc loc, List<Object> ts) {
        StringBuilder dk = new StringBuilder();
        if (loc.maCK() != null) {
            dk.append(" AND bs.MaCK = ?");
            ts.add(loc.maCK());
        }
        if (loc.maBS() != null) {
            dk.append(" AND lk.MaBS = ?");
            ts.add(loc.maBS());
        }
        if (loc.kenh() != null) {
            dk.append(" AND lk.KenhDat = ?");
            ts.add(loc.kenh());
        }
        return dk.toString();
    }

    /** Đủ mọi ngày trong khoảng (ngày không có dữ liệu = 0) để biểu đồ không bị hụt cột. */
    private static List<Map<String, Object>> duNgay(List<Map<String, Object>> ds, LocalDate tu, LocalDate den, List<String> cot) {
        Map<LocalDate, Map<String, Object>> theoNgay = new LinkedHashMap<>();
        ds.forEach(r -> theoNgay.put((LocalDate) r.get("Ngay"), r));
        List<Map<String, Object>> kq = new ArrayList<>();
        for (LocalDate d = tu; !d.isAfter(den); d = d.plusDays(1)) {
            Map<String, Object> r = theoNgay.get(d);
            if (r == null) {
                r = new LinkedHashMap<>();
                r.put("Ngay", d);
                for (String c : cot) {
                    r.put(c, 0);
                }
            }
            kq.add(r);
        }
        return kq;
    }

    private static BigDecimal so(Object o) {
        return o instanceof BigDecimal b ? b : o instanceof Number n ? BigDecimal.valueOf(n.longValue()) : BigDecimal.ZERO;
    }
}
