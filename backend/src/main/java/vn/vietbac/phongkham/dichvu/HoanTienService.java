package vn.vietbac.phongkham.dichvu;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Gói 10 – hoàn tiền (UC10.4, BR31): mỗi lần hoàn một phiếu gắn biên lai tạm thu hoặc hóa đơn gốc, tổng đã hoàn
 * không vượt số đã thu. Phiếu trên 1.000.000 đ phải được quản trị viên duyệt trước khi lễ tân chi tiền mặt
 * hoặc chuyển khoản. Phiếu tự sinh khi bác sĩ hủy phiếu CLS đã tạm thu hoặc khi hóa đơn thay thế nhỏ hơn.
 */
@Service
public class HoanTienService {

    public static final BigDecimal NGUONG_DUYET = BigDecimal.valueOf(1_000_000);
    private static final List<String> LY_DO = List.of("HUY_PHIEU_CLS", "BHYT_XAC_MINH", "HOA_DON_THAY_THE",
            "CHUYEN_KHOAN_THUA", "KHAC");
    private static final List<String> HINH_THUC = List.of("TIEN_MAT", "CHUYEN_KHOAN");

    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final TruyVan tv;
    private final DongHo dongHo;

    public HoanTienService(ThongBaoService thongBao, NhatKyService nhatKy, TruyVan tv, DongHo dongHo) {
        this.thongBao = thongBao;
        this.nhatKy = nhatKy;
        this.tv = tv;
        this.dongHo = dongHo;
    }

    // ================= Lập đề nghị =================

    /**
     * Tạo đề nghị hoàn tiền cho biên lai (maBL) hoặc hóa đơn (maHD). maTK null là hệ thống tự tạo.
     * Số tiền phải dương và không vượt phần còn hoàn được của chứng từ (đã thu trừ các phiếu chưa bị từ chối).
     */
    @Transactional
    public Integer taoDeNghi(Integer maBL, Integer maHD, Integer maPCD, String lyDo, String ghiChu, BigDecimal soTien,
                             Integer maTK) {
        if ((maBL == null) == (maHD == null)) {
            throw new LoiNghiepVu("Chọn một biên lai hoặc một hóa đơn cần hoàn tiền");
        }
        if (!LY_DO.contains(lyDo)) {
            throw new LoiNghiepVu("Lý do hoàn tiền không hợp lệ (BR31)");
        }
        if (soTien == null || soTien.signum() <= 0) {
            throw new LoiNghiepVu("Số tiền hoàn phải lớn hơn 0");
        }
        String gc = ghiChu == null || ghiChu.isBlank() ? null : ghiChu.strip();
        if (gc != null && gc.length() > 255) {
            throw new LoiNghiepVu("Ghi chú tối đa 255 ký tự");
        }
        Map<String, Object> ct = chungTu(maBL, maHD, true);
        BigDecimal conHoanDuoc = ((BigDecimal) ct.get("DaThu")).subtract(daDeNghi(maBL, maHD, null));
        if (soTien.compareTo(conHoanDuoc) > 0) {
            throw new LoiNghiepVu("Số tiền hoàn vượt phần còn hoàn được của chứng từ (" + tien(conHoanDuoc.max(BigDecimal.ZERO)) + ")");
        }
        boolean canDuyet = soTien.compareTo(NGUONG_DUYET) > 0;
        LocalDateTime bayGio = dongHo.bayGio();
        tv.capNhat("""
                INSERT INTO PhieuHoanTien (MaSoPhieu, MaBL, MaHD, MaPCD, LyDo, GhiChu, SoTien, TrangThai, MaNguoiLap, ThoiDiemLap)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                "T" + UUID.randomUUID().toString().replace("-", "").substring(0, 19), maBL, maHD, maPCD, lyDo, gc, soTien,
                canDuyet ? "CHO_DUYET" : "CHO_HOAN", maTK, bayGio);
        Integer maPHT = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        String maSo = "HT" + bayGio.format(DateTimeFormatter.ofPattern("yyMMdd")) + String.format("%04d", maPHT % 10000);
        tv.capNhat("UPDATE PhieuHoanTien SET MaSoPhieu = ? WHERE MaPHT = ?", maSo, maPHT);
        nhatKy.ghi(maTK, "LAP_PHIEU_HOAN_TIEN", "PhieuHoanTien", maPHT, maSo + " - " + ct.get("MaSo") + ": " + tien(soTien)
                + (canDuyet ? " (chờ duyệt)" : ""));
        if (canDuyet) {
            thongBao.vaiTro("QUAN_TRI", "HOA_DON", "Phiếu hoàn tiền chờ duyệt",
                    maSo + ": " + tien(soTien) + " cho " + ct.get("HoTen") + " (vượt ngưỡng " + tien(NGUONG_DUYET) + ")",
                    "PHIEU_HOAN_TIEN", maPHT);
        }
        return maPHT;
    }

    // ================= Xem =================

    /** Danh sách phiếu theo trạng thái (null = tất cả), mới nhất trước. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsPhieu(List<String> trangThai, String tuKhoa) {
        List<Object> ts = new ArrayList<>();
        StringBuilder dk = new StringBuilder("1 = 1");
        if (trangThai != null && !trangThai.isEmpty()) {
            dk.append(" AND p.TrangThai IN (?)");
            ts.add(trangThai);
        }
        if (tuKhoa != null && !tuKhoa.isBlank()) {
            String k = "%" + tuKhoa.strip() + "%";
            dk.append(" AND (bn.HoTen LIKE ? OR p.MaSoPhieu LIKE ? OR bl.MaSoBienLai LIKE ? OR hd.MaSoHoaDon LIKE ?)");
            ts.addAll(List.of(k, k, k, k));
        }
        return tv.ds("""
                SELECT p.MaPHT, p.MaSoPhieu, p.MaBL, p.MaHD, COALESCE(bl.MaSoBienLai, hd.MaSoHoaDon) AS MaChungTu,
                       p.LyDo, p.GhiChu, p.SoTien, p.TrangThai, p.ThoiDiemLap, p.HinhThuc, p.ThoiDiemHoan, p.LyDoTuChoi,
                       bn.HoTen, bn.SDT, lk.MaLichHen, dv.TenDV
                FROM PhieuHoanTien p LEFT JOIN BienLaiTamThu bl ON bl.MaBL = p.MaBL LEFT JOIN HoaDon hd ON hd.MaHD = p.MaHD
                JOIN LuotKham lk ON lk.MaLK = COALESCE(bl.MaLK, hd.MaLK) JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                LEFT JOIN PhieuChiDinh pcd ON pcd.MaPCD = p.MaPCD LEFT JOIN DichVu dv ON dv.MaDV = pcd.MaDV
                WHERE\s""" + dk + " ORDER BY FIELD(p.TrangThai, 'CHO_DUYET', 'CHO_HOAN', 'DA_HOAN', 'TU_CHOI'), p.ThoiDiemLap DESC",
                ts.toArray());
    }

    @Transactional(readOnly = true)
    public long soCho(String trangThai) {
        return tv.dem("SELECT COUNT(*) FROM PhieuHoanTien WHERE TrangThai = ?", trangThai);
    }

    /** Chi tiết phiếu kèm chứng từ gốc, số đã thu và số đã hoàn trước đó (UC10.4 bước 3). */
    @Transactional(readOnly = true)
    public Map<String, Object> chiTiet(Integer maPHT) {
        Map<String, Object> p = tv.mot("""
                SELECT p.*, nl.Email AS NguoiLap, nd.Email AS NguoiDuyet, tn.HoTen AS ThuNgan, dv.TenDV
                FROM PhieuHoanTien p LEFT JOIN TaiKhoan nl ON nl.MaTK = p.MaNguoiLap LEFT JOIN TaiKhoan nd ON nd.MaTK = p.MaNguoiDuyet
                LEFT JOIN NhanVien tn ON tn.MaNV = p.MaThuNgan LEFT JOIN PhieuChiDinh pcd ON pcd.MaPCD = p.MaPCD
                LEFT JOIN DichVu dv ON dv.MaDV = pcd.MaDV WHERE p.MaPHT = ?""", maPHT);
        if (p == null) {
            throw new KhongTimThay("Không tìm thấy phiếu hoàn tiền");
        }
        Integer maBL = (Integer) p.get("MaBL"), maHD = (Integer) p.get("MaHD");
        Map<String, Object> ct = chungTu(maBL, maHD, false);
        ct.put("DaHoan", tv.giaTri("SELECT COALESCE(SUM(SoTien), 0) FROM PhieuHoanTien WHERE TrangThai = 'DA_HOAN' AND "
                + cot(maBL) + " = ? AND MaPHT <> ?", ma(maBL, maHD), maPHT));
        p.put("ChungTu", ct);
        p.put("PhongKham", tv.mot("SELECT TenPhongKham, DiaChi, Hotline FROM ThongTinPhongKham WHERE Id = 1"));
        return p;
    }

    // ================= Duyệt, chi tiền =================

    /** Quản trị viên duyệt (chuyển Chờ hoàn) hoặc từ chối (kèm lý do) phiếu vượt ngưỡng. */
    @Transactional
    public void duyet(Integer maPHT, boolean dongY, String lyDo, Integer maTK) {
        Map<String, Object> p = khoa(maPHT);
        if (!"CHO_DUYET".equals(p.get("TrangThai"))) {
            throw new LoiNghiepVu("Phiếu không ở trạng thái chờ duyệt");
        }
        String ly = lyDo == null || lyDo.isBlank() ? null : lyDo.strip();
        if (!dongY && ly == null) {
            throw new LoiNghiepVu("Vui lòng nhập lý do từ chối");
        }
        tv.capNhat("""
                UPDATE PhieuHoanTien SET TrangThai = ?, MaNguoiDuyet = ?, ThoiDiemDuyet = ?, LyDoTuChoi = ? WHERE MaPHT = ?""",
                dongY ? "CHO_HOAN" : "TU_CHOI", maTK, dongHo.bayGio(), dongY ? null : ly, maPHT);
        nhatKy.ghi(maTK, dongY ? "DUYET_HOAN_TIEN" : "TU_CHOI_HOAN_TIEN", "PhieuHoanTien", maPHT,
                p.get("MaSoPhieu") + ": " + tien((BigDecimal) p.get("SoTien")) + (dongY ? "" : " - " + ly));
        thongBao.vaiTro("LE_TAN", "HOA_DON", dongY ? "Phiếu hoàn tiền đã được duyệt" : "Phiếu hoàn tiền bị từ chối",
                p.get("MaSoPhieu") + " (" + tien((BigDecimal) p.get("SoTien")) + ")" + (dongY ? ": có thể chi tiền." : ": " + ly),
                "PHIEU_HOAN_TIEN", maPHT);
    }

    /** Lễ tân chi tiền (tiền mặt hoặc chuyển khoản tới tài khoản bệnh nhân cung cấp), phiếu chuyển Đã hoàn. */
    @Transactional
    public Map<String, Object> hoan(Integer maPHT, String hinhThuc, String nganHang, String soTaiKhoan, String tenTaiKhoan,
                                    Integer maNV, Integer maTK) {
        if (!HINH_THUC.contains(hinhThuc)) {
            throw new LoiNghiepVu("Hình thức hoàn tiền không hợp lệ");
        }
        boolean chuyenKhoan = "CHUYEN_KHOAN".equals(hinhThuc);
        String nh = rong(nganHang), stk = rong(soTaiKhoan), ten = rong(tenTaiKhoan);
        if (chuyenKhoan && (nh == null || stk == null)) {
            throw new LoiNghiepVu("Nhập ngân hàng và số tài khoản người nhận");
        }
        if (stk != null && !stk.matches("[0-9]{6,20}")) {
            throw new LoiNghiepVu("Số tài khoản gồm 6–20 chữ số");
        }
        Map<String, Object> p = khoa(maPHT);
        if (!"CHO_HOAN".equals(p.get("TrangThai"))) {
            throw new LoiNghiepVu("CHO_DUYET".equals(p.get("TrangThai"))
                    ? "Phiếu vượt ngưỡng, cần quản trị viên duyệt trước khi chi" : "Phiếu không ở trạng thái chờ hoàn");
        }
        Integer maBL = (Integer) p.get("MaBL"), maHD = (Integer) p.get("MaHD");
        Map<String, Object> ct = chungTu(maBL, maHD, false);
        BigDecimal daHoan = tv.giaTri("SELECT COALESCE(SUM(SoTien), 0) FROM PhieuHoanTien WHERE TrangThai = 'DA_HOAN' AND "
                + cot(maBL) + " = ?", ma(maBL, maHD));
        BigDecimal soTien = (BigDecimal) p.get("SoTien");
        if (daHoan.add(soTien).compareTo((BigDecimal) ct.get("DaThu")) > 0) {                       // UC10.4 5a
            throw new LoiNghiepVu("Tổng số đã hoàn sẽ vượt số đã thu của chứng từ " + ct.get("MaSo"));
        }
        tv.capNhat("""
                UPDATE PhieuHoanTien SET TrangThai = 'DA_HOAN', HinhThuc = ?, NganHang = ?, SoTaiKhoan = ?, TenTaiKhoan = ?,
                       MaThuNgan = ?, ThoiDiemHoan = ? WHERE MaPHT = ?""",
                hinhThuc, chuyenKhoan ? nh : null, chuyenKhoan ? stk : null, chuyenKhoan ? ten : null, maNV, dongHo.bayGio(), maPHT);
        nhatKy.ghi(maTK, "CHI_HOAN_TIEN", "PhieuHoanTien", maPHT, p.get("MaSoPhieu") + ": " + tien(soTien) + ", "
                + (chuyenKhoan ? "chuyển khoản " + nh + " " + stk : "tiền mặt"));
        thongBao.benhNhan((Integer) ct.get("MaBN"), "HOA_DON", "Đã hoàn tiền " + tien(soTien),
                "Phòng khám đã hoàn " + tien(soTien) + (chuyenKhoan ? " vào tài khoản " + nh + " " + stk : " tiền mặt tại quầy")
                        + " cho chứng từ " + ct.get("MaSo") + " (phiếu " + p.get("MaSoPhieu") + ").",
                "LUOT_KHAM", (Integer) ct.get("MaLK"), false);
        return chiTiet(maPHT);
    }

    // ================= Dùng chung =================

    /** Biên lai / hóa đơn gốc: mã số, bệnh nhân, số đã thu (biên lai: tổng tạm thu; hóa đơn: phần thu cuối lượt). */
    private Map<String, Object> chungTu(Integer maBL, Integer maHD, boolean kiemTraDaThu) {
        Map<String, Object> ct = maBL != null ? tv.mot("""
                SELECT 'BIEN_LAI' AS Loai, bl.MaSoBienLai AS MaSo, bl.TongTien AS DaThu, bl.TrangThai, bl.HinhThuc,
                       bl.ThoiDiemThu AS NgayThu, lk.MaLK, lk.MaLichHen, lk.MaBN, bn.HoTen, bn.SDT
                FROM BienLaiTamThu bl JOIN LuotKham lk ON lk.MaLK = bl.MaLK JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                WHERE bl.MaBL = ?""", maBL) : tv.mot("""
                SELECT 'HOA_DON' AS Loai, hd.MaSoHoaDon AS MaSo, GREATEST(hd.ConPhaiThu, 0) AS DaThu, hd.TrangThai,
                       hd.HinhThuc, hd.NgayThanhToan AS NgayThu, lk.MaLK, lk.MaLichHen, lk.MaBN, bn.HoTen, bn.SDT
                FROM HoaDon hd JOIN LuotKham lk ON lk.MaLK = hd.MaLK JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                WHERE hd.MaHD = ?""", maHD);
        if (ct == null) {
            throw new KhongTimThay("Không tìm thấy chứng từ gốc");
        }
        // Hóa đơn bị hủy vẫn hoàn được phần chênh của hóa đơn thay thế (BR31), miễn là đã từng thanh toán
        boolean daThu = maBL != null ? "DA_THU".equals(ct.get("TrangThai")) : ct.get("NgayThu") != null;
        if (kiemTraDaThu && !daThu) {
            throw new LoiNghiepVu("Chứng từ " + ct.get("MaSo") + " chưa thu tiền nên không có gì để hoàn");
        }
        return ct;
    }

    /** Tổng các phiếu chưa bị từ chối của chứng từ (đã hoàn và đang chờ), trừ phiếu boQua. */
    private BigDecimal daDeNghi(Integer maBL, Integer maHD, Integer boQua) {
        return tv.giaTri("SELECT COALESCE(SUM(SoTien), 0) FROM PhieuHoanTien WHERE TrangThai <> 'TU_CHOI' AND "
                + cot(maBL) + " = ? AND MaPHT <> ?", ma(maBL, maHD), boQua == null ? -1 : boQua);
    }

    /** Cột chứng từ gốc của phiếu: biên lai nếu có, ngược lại là hóa đơn. */
    private static String cot(Integer maBL) {
        return maBL != null ? "MaBL" : "MaHD";
    }

    private static Integer ma(Integer maBL, Integer maHD) {
        return maBL != null ? maBL : maHD;
    }

    private Map<String, Object> khoa(Integer maPHT) {
        Map<String, Object> p = tv.mot("SELECT * FROM PhieuHoanTien WHERE MaPHT = ? FOR UPDATE", maPHT);
        if (p == null) {
            throw new KhongTimThay("Không tìm thấy phiếu hoàn tiền");
        }
        return p;
    }

    private static String rong(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    static String tien(BigDecimal so) {
        return String.format("%,d", so.longValue()).replace(',', '.') + " đ";
    }
}
