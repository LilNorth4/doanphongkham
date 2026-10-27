package vn.vietbac.phongkham.dichvu;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LuuAnh;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Gói 12 – góp ý, khiếu nại (UC12.2, UC12.3, BR25): bệnh nhân gửi phiếu và trao đổi tiếp, quản trị viên phản hồi
 * trong 48 giờ (quá hạn được đánh dấu) và ghi chú nội bộ (bệnh nhân không thấy). Phiếu đã phản hồi tự đóng sau
 * 7 ngày nếu bệnh nhân không gửi thêm thông tin.
 */
@Service
public class GopYService {

    public static final int HAN_GIO = 48;
    private static final int NGAY_TU_DONG = 7;
    private static final int SO_TEP_TOI_DA = 3;
    private static final List<String> LOAI = List.of("GOP_Y", "KHIEU_NAI");

    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final LuuAnh luuAnh;
    private final TruyVan tv;
    private final DongHo dongHo;

    public GopYService(ThongBaoService thongBao, NhatKyService nhatKy, LuuAnh luuAnh, TruyVan tv, DongHo dongHo) {
        this.thongBao = thongBao;
        this.nhatKy = nhatKy;
        this.luuAnh = luuAnh;
        this.tv = tv;
        this.dongHo = dongHo;
    }

    // ================= Bệnh nhân (UC12.2) =================

    @Transactional
    public Map<String, Object> gui(Integer maBN, Integer maTK, String loai, String chuDe, Integer maLK, String noiDung,
                                   List<MultipartFile> tep) {
        if (maBN == null) {
            throw new KhongTimThay("Tài khoản chưa có hồ sơ");
        }
        if (!LOAI.contains(loai)) {
            throw new LoiNghiepVu("Chọn loại phiếu: góp ý hoặc khiếu nại");
        }
        String cd = chuDe == null ? "" : chuDe.strip();
        if (cd.isEmpty() || cd.length() > 100) {
            throw new LoiNghiepVu("Chủ đề không được bỏ trống và tối đa 100 ký tự");
        }
        String nd = noiDung(noiDung);
        if (maLK != null && tv.dem("SELECT COUNT(*) FROM LuotKham WHERE MaLK = ? AND MaBN = ?", maLK, maBN) == 0) {
            throw new LoiNghiepVu("Lượt khám liên quan không thuộc hồ sơ của bạn");
        }
        List<MultipartFile> ds = tep == null ? List.of() : tep.stream().filter(t -> t != null && !t.isEmpty()).toList();
        if (ds.size() > SO_TEP_TOI_DA) {
            throw new LoiNghiepVu("Đính kèm tối đa " + SO_TEP_TOI_DA + " tệp");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        tv.capNhat("""
                INSERT INTO PhieuGopY (MaSoPhieu, MaBN, Loai, ChuDe, MaLK, NoiDung, TrangThai, ThoiDiemGui, HanPhanHoi)
                VALUES (?, ?, ?, ?, ?, ?, 'MOI', ?, ?)""",
                "T" + UUID.randomUUID().toString().replace("-", "").substring(0, 19), maBN, loai, cd, maLK, nd, bayGio,
                bayGio.plusHours(HAN_GIO));
        Integer maPhieu = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        String maSo = "GY" + bayGio.format(DateTimeFormatter.ofPattern("yyMMdd")) + String.format("%04d", maPhieu % 10000);
        tv.capNhat("UPDATE PhieuGopY SET MaSoPhieu = ? WHERE MaPhieu = ?", maSo, maPhieu);
        for (MultipartFile t : ds) {
            String duongDan = luuAnh.luu(t, "gop-y", "gy" + maPhieu, 5L * 1024 * 1024, Set.of("jpg", "png", "pdf"));
            tv.capNhat("""
                    INSERT INTO TepDinhKem (DuongDan, TenTep, LoaiTep, KichThuoc, MaPhieu, MaNguoiTaiLen, ThoiGian)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""", duongDan, DanhGiaService.tenTep(t, duongDan),
                    duongDan.substring(duongDan.lastIndexOf('.') + 1).toUpperCase(Locale.ROOT), t.getSize(), maPhieu, maTK, bayGio);
        }
        String ten = "KHIEU_NAI".equals(loai) ? "Khiếu nại" : "Góp ý";
        nhatKy.ghi(maTK, "GUI_GOP_Y", "PhieuGopY", maPhieu, maSo + " - " + ten + ": " + cd);
        thongBao.vaiTro("QUAN_TRI", "GOP_Y", ten + " mới " + maSo, cd + ": " + tomTat(nd), "PHIEU_GOP_Y", maPhieu);
        return Map.of("ma_phieu", maPhieu, "ma_so_phieu", maSo, "han_phan_hoi", bayGio.plusHours(HAN_GIO));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> cuaBenhNhan(Integer maBN) {
        if (maBN == null) {
            throw new KhongTimThay("Tài khoản chưa có hồ sơ");
        }
        return tv.ds("""
                SELECT g.MaPhieu, g.MaSoPhieu, g.Loai, g.ChuDe, g.TrangThai, g.ThoiDiemGui, g.HanPhanHoi, g.ThoiDiemPhanHoi,
                       g.ThoiDiemDong, lk.MaLichHen
                FROM PhieuGopY g LEFT JOIN LuotKham lk ON lk.MaLK = g.MaLK
                WHERE g.MaBN = ? ORDER BY g.TrangThai = 'DA_DONG', g.ThoiDiemGui DESC""", maBN);
    }

    /** Lượt khám để bệnh nhân chọn làm "lượt khám liên quan" (90 ngày gần nhất). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> luotGanDay(Integer maBN) {
        return tv.ds("""
                SELECT lk.MaLK, lk.MaLichHen, lk.NgayKham, bs.HoTen AS BacSi, ck.TenCK
                FROM LuotKham lk JOIN NhanVien bs ON bs.MaNV = lk.MaBS LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                WHERE lk.MaBN = ? AND lk.NgayKham >= ? AND lk.TrangThai NOT IN ('DA_HUY','CHO_XAC_NHAN')
                ORDER BY lk.NgayKham DESC""", maBN, dongHo.homNay().minusDays(90));
    }

    /** Chi tiết phiếu; noiBo = false (bệnh nhân) thì ẩn ghi chú nội bộ. */
    @Transactional(readOnly = true)
    public Map<String, Object> chiTiet(Integer maPhieu, Integer maBN, boolean noiBo) {
        Map<String, Object> g = tv.mot("""
                SELECT g.*, bn.HoTen, bn.SDT, bn.Email AS EmailBN, lk.MaLichHen, lk.NgayKham, lk.TrangThai AS TrangThaiLuot,
                       bs.HoTen AS BacSi, ck.TenCK, (g.TrangThai IN ('MOI','DANG_XU_LY') AND g.HanPhanHoi < ?) AS QuaHan
                FROM PhieuGopY g JOIN BenhNhan bn ON bn.MaBN = g.MaBN LEFT JOIN LuotKham lk ON lk.MaLK = g.MaLK
                LEFT JOIN NhanVien bs ON bs.MaNV = lk.MaBS LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                WHERE g.MaPhieu = ?""", dongHo.bayGio(), maPhieu);
        if (g == null || (maBN != null && !maBN.equals(g.get("MaBN")))) {
            throw new KhongTimThay("Không tìm thấy phiếu góp ý");
        }
        g.put("TraoDoi", tv.ds("""
                SELECT td.MaTD, td.Loai, td.NoiDung, td.ThoiGian, td.MaTK, (td.MaTK = bn.MaTK) AS CuaBenhNhan,
                       COALESCE(nv.HoTen, bn2.HoTen, tk.Email) AS NguoiGui
                FROM TraoDoiGopY td JOIN PhieuGopY g ON g.MaPhieu = td.MaPhieu JOIN BenhNhan bn ON bn.MaBN = g.MaBN
                JOIN TaiKhoan tk ON tk.MaTK = td.MaTK LEFT JOIN NhanVien nv ON nv.MaTK = td.MaTK
                LEFT JOIN BenhNhan bn2 ON bn2.MaTK = td.MaTK
                WHERE td.MaPhieu = ?""" + (noiBo ? "" : " AND td.Loai <> 'GHI_CHU_NOI_BO'") + " ORDER BY td.ThoiGian, td.MaTD",
                maPhieu));
        g.put("Tep", tv.ds("SELECT MaTep, DuongDan, TenTep, LoaiTep, KichThuoc FROM TepDinhKem WHERE MaPhieu = ? ORDER BY MaTep",
                maPhieu));
        if (!noiBo) {
            g.remove("CamXuc");
            g.remove("MucDoNghiemTrong");
            g.remove("TrangThaiPhanTich");
        }
        return g;
    }

    /** Bệnh nhân gửi thêm thông tin: phiếu chuyển lại Đang xử lý và có hạn phản hồi 48 giờ mới. */
    @Transactional
    public void boSung(Integer maPhieu, Integer maBN, Integer maTK, String noiDung) {
        Map<String, Object> g = phieu(maPhieu, maBN);
        if ("DA_DONG".equals(g.get("TrangThai"))) {
            throw new LoiNghiepVu("Phiếu đã đóng, vui lòng gửi phiếu mới");
        }
        String nd = noiDung(noiDung);
        LocalDateTime bayGio = dongHo.bayGio();
        tv.capNhat("INSERT INTO TraoDoiGopY (MaPhieu, MaTK, Loai, NoiDung, ThoiGian) VALUES (?, ?, 'BO_SUNG', ?, ?)",
                maPhieu, maTK, nd, bayGio);
        if ("DA_PHAN_HOI".equals(g.get("TrangThai"))) {
            tv.capNhat("UPDATE PhieuGopY SET TrangThai = 'DANG_XU_LY', HanPhanHoi = ? WHERE MaPhieu = ?",
                    bayGio.plusHours(HAN_GIO), maPhieu);
        }
        nhatKy.ghi(maTK, "BO_SUNG_GOP_Y", "PhieuGopY", maPhieu, g.get("MaSoPhieu") + ": " + tomTat(nd));
        thongBao.vaiTro("QUAN_TRI", "GOP_Y", "Bệnh nhân bổ sung phiếu " + g.get("MaSoPhieu"), tomTat(nd), "PHIEU_GOP_Y",
                maPhieu);
    }

    /** Bệnh nhân xác nhận hài lòng: đóng phiếu đã được phản hồi. */
    @Transactional
    public void xacNhanHaiLong(Integer maPhieu, Integer maBN, Integer maTK) {
        Map<String, Object> g = phieu(maPhieu, maBN);
        if (!"DA_PHAN_HOI".equals(g.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ đóng được phiếu đã được phản hồi");
        }
        tv.capNhat("UPDATE PhieuGopY SET TrangThai = 'DA_DONG', ThoiDiemDong = ? WHERE MaPhieu = ?", dongHo.bayGio(), maPhieu);
        nhatKy.ghi(maTK, "DONG_GOP_Y", "PhieuGopY", maPhieu, g.get("MaSoPhieu") + ": bệnh nhân xác nhận hài lòng");
    }

    // ================= Quản trị viên (UC12.3) =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> ds(String loai, List<String> trangThai, String chuDe, String mucDo, boolean chiQuaHan,
                                        String tuKhoa) {
        LocalDateTime bayGio = dongHo.bayGio();
        List<Object> ts = new ArrayList<>(List.of(bayGio));
        StringBuilder dk = new StringBuilder("1 = 1");
        if (loai != null && !loai.isBlank()) {
            dk.append(" AND g.Loai = ?");
            ts.add(loai);
        }
        if (trangThai != null && !trangThai.isEmpty()) {
            dk.append(" AND g.TrangThai IN (?)");
            ts.add(trangThai);
        }
        if (chuDe != null && !chuDe.isBlank()) {
            dk.append(" AND g.ChuDe = ?");
            ts.add(chuDe);
        }
        if (mucDo != null && !mucDo.isBlank()) {
            dk.append(" AND g.MucDoNghiemTrong = ?");
            ts.add(mucDo);
        }
        if (chiQuaHan) {
            dk.append(" AND g.TrangThai IN ('MOI','DANG_XU_LY') AND g.HanPhanHoi < ?");
            ts.add(bayGio);
        }
        if (tuKhoa != null && !tuKhoa.isBlank()) {
            String k = "%" + tuKhoa.strip() + "%";
            dk.append(" AND (g.MaSoPhieu LIKE ? OR bn.HoTen LIKE ? OR bn.SDT LIKE ? OR g.NoiDung LIKE ?)");
            ts.addAll(List.of(k, k, k, k));
        }
        return tv.ds("""
                SELECT g.MaPhieu, g.MaSoPhieu, g.Loai, g.ChuDe, g.TrangThai, g.ThoiDiemGui, g.HanPhanHoi, g.ThoiDiemPhanHoi,
                       g.CamXuc, g.MucDoNghiemTrong, bn.HoTen, bn.SDT, lk.MaLichHen, LEFT(g.NoiDung, 160) AS TomTat,
                       (g.TrangThai IN ('MOI','DANG_XU_LY') AND g.HanPhanHoi < ?) AS QuaHan
                FROM PhieuGopY g JOIN BenhNhan bn ON bn.MaBN = g.MaBN LEFT JOIN LuotKham lk ON lk.MaLK = g.MaLK
                WHERE\s""" + dk + " ORDER BY QuaHan DESC, FIELD(g.TrangThai, 'MOI', 'DANG_XU_LY', 'DA_PHAN_HOI', 'DA_DONG'),"
                + " FIELD(g.MucDoNghiemTrong, 'THAP', 'TRUNG_BINH', 'CAO') DESC, g.HanPhanHoi", ts.toArray());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> soCho() {
        return tv.mot("""
                SELECT COALESCE(SUM(TrangThai IN ('MOI','DANG_XU_LY')), 0) AS so_luong,
                       COALESCE(SUM(TrangThai IN ('MOI','DANG_XU_LY') AND HanPhanHoi < ?), 0) AS qua_han
                FROM PhieuGopY""", dongHo.bayGio());
    }

    @Transactional(readOnly = true)
    public List<String> dsChuDe() {
        return tv.ds("SELECT DISTINCT ChuDe FROM PhieuGopY ORDER BY ChuDe").stream().map(r -> (String) r.get("ChuDe")).toList();
    }

    /** Tiếp nhận: Mới → Đang xử lý (UC12.3 bước 4). */
    @Transactional
    public void tiepNhan(Integer maPhieu, Integer maTK) {
        Map<String, Object> g = phieu(maPhieu, null);
        if (!"MOI".equals(g.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ tiếp nhận được phiếu mới");
        }
        tv.capNhat("UPDATE PhieuGopY SET TrangThai = 'DANG_XU_LY' WHERE MaPhieu = ?", maPhieu);
        nhatKy.ghi(maTK, "TIEP_NHAN_GOP_Y", "PhieuGopY", maPhieu, (String) g.get("MaSoPhieu"));
    }

    /** Phản hồi bệnh nhân: phiếu sang Đã phản hồi, bệnh nhân nhận thông báo (UC12.3 bước 5). */
    @Transactional
    public void phanHoi(Integer maPhieu, Integer maTK, String noiDung) {
        Map<String, Object> g = phieu(maPhieu, null);
        if (!List.of("MOI", "DANG_XU_LY").contains(g.get("TrangThai"))) {
            throw new LoiNghiepVu("Phiếu đã được phản hồi hoặc đã đóng");
        }
        String nd = noiDung == null ? "" : noiDung.strip();
        if (nd.isEmpty()) {
            throw new LoiNghiepVu("Vui lòng nhập nội dung phản hồi");
        }
        if (nd.length() > 5000) {
            throw new LoiNghiepVu("Nội dung tối đa 5000 ký tự");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        tv.capNhat("INSERT INTO TraoDoiGopY (MaPhieu, MaTK, Loai, NoiDung, ThoiGian) VALUES (?, ?, 'PHAN_HOI', ?, ?)",
                maPhieu, maTK, nd, bayGio);
        tv.capNhat("UPDATE PhieuGopY SET TrangThai = 'DA_PHAN_HOI', ThoiDiemPhanHoi = ? WHERE MaPhieu = ?", bayGio, maPhieu);
        nhatKy.ghi(maTK, "PHAN_HOI_GOP_Y", "PhieuGopY", maPhieu, g.get("MaSoPhieu") + ": " + tomTat(nd));
        thongBao.benhNhan((Integer) g.get("MaBN"), "GOP_Y", "Phiếu " + g.get("MaSoPhieu") + " đã được phản hồi", tomTat(nd),
                "PHIEU_GOP_Y", maPhieu, false);
    }

    /** Ghi chú nội bộ để phân công bộ phận xử lý (UC12.3 3a); bệnh nhân không thấy. */
    @Transactional
    public void ghiChu(Integer maPhieu, Integer maTK, String noiDung) {
        Map<String, Object> g = phieu(maPhieu, null);
        String nd = noiDung == null ? "" : noiDung.strip();
        if (nd.isEmpty()) {
            throw new LoiNghiepVu("Vui lòng nhập nội dung ghi chú");
        }
        if (nd.length() > 2000) {
            throw new LoiNghiepVu("Ghi chú tối đa 2000 ký tự");
        }
        tv.capNhat("INSERT INTO TraoDoiGopY (MaPhieu, MaTK, Loai, NoiDung, ThoiGian) VALUES (?, ?, 'GHI_CHU_NOI_BO', ?, ?)",
                maPhieu, maTK, nd, dongHo.bayGio());
        nhatKy.ghi(maTK, "GHI_CHU_GOP_Y", "PhieuGopY", maPhieu, (String) g.get("MaSoPhieu"));
    }

    /** BR25: phiếu đã phản hồi quá 7 ngày mà bệnh nhân không gửi thêm thông tin thì tự đóng. */
    @Transactional
    public int tuDongDong() {
        LocalDateTime bayGio = dongHo.bayGio();
        return tv.capNhat("""
                UPDATE PhieuGopY SET TrangThai = 'DA_DONG', ThoiDiemDong = ?
                WHERE TrangThai = 'DA_PHAN_HOI' AND ThoiDiemPhanHoi <= ?""", bayGio, bayGio.minusDays(NGAY_TU_DONG));
    }

    // ================= Hỗ trợ =================

    private Map<String, Object> phieu(Integer maPhieu, Integer maBN) {
        Map<String, Object> g = tv.mot("SELECT MaPhieu, MaSoPhieu, MaBN, TrangThai FROM PhieuGopY WHERE MaPhieu = ?", maPhieu);
        if (g == null || (maBN != null && !maBN.equals(g.get("MaBN")))) {
            throw new KhongTimThay("Không tìm thấy phiếu góp ý");
        }
        return g;
    }

    private static String noiDung(String s) {
        String t = s == null ? "" : s.strip();
        if (t.isEmpty()) {
            throw new LoiNghiepVu("Vui lòng nhập nội dung");
        }
        if (t.length() > 5000) {
            throw new LoiNghiepVu("Nội dung tối đa 5000 ký tự");
        }
        return t;
    }

    private static String tomTat(String s) {
        String t = s == null ? "" : s.strip();
        return t.length() > 150 ? t.substring(0, 150) + "…" : t;
    }
}
