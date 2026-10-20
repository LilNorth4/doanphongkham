package vn.vietbac.phongkham.dichvu;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.ObjectMapper;
import vn.vietbac.phongkham.chung.ChuanHoa;
import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Gói 7 – tiếp đón: hồ sơ bệnh nhân tại quầy (UC7.8), thẻ BHYT (UC7.10, BR08), check-in (UC7.5),
 * vắng mặt (UC7.9); kèm tóm tắt tiền sử (UC13.7) và thời gian chờ dự kiến (UC13.4, UC13.5, BR16, BR17).
 */
@Service
@RequiredArgsConstructor
public class TiepDonService {

    private static final DateTimeFormatter NGAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final TruyVan tv;
    private final DongHo dongHo;
    private final ObjectMapper json;

    // ================= Hồ sơ bệnh nhân (UC7.8) =================

    /** Tìm theo CCCD, hoặc theo SĐT (dữ liệu cũ có thể còn vài hồ sơ chung một SĐT). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> timBenhNhan(String sdt, String cccd) {
        if (cccd != null && !cccd.isBlank()) {
            return tv.ds("SELECT * FROM BenhNhan WHERE CCCD = ?", cccd.strip());
        }
        if (sdt == null || sdt.isBlank()) {
            throw new LoiNghiepVu("Nhập số điện thoại hoặc CCCD");
        }
        return tv.ds("SELECT * FROM BenhNhan WHERE SDT = ? ORDER BY MaBN", ChuanHoa.sdt(sdt));
    }

    /**
     * Lễ tân tạo hồ sơ cho bệnh nhân chưa có tài khoản (BR23). Mỗi SĐT một hồ sơ; trẻ em không có SĐT riêng
     * thì ghi SĐT của bố mẹ vào mục người liên hệ.
     */
    @Transactional
    public Integer themBenhNhan(String hoTen, LocalDate ngaySinh, String gioiTinh, String sdt, String cccd,
                                String diaChi, String nguoiLienHe, String sdtNguoiLienHe, Integer maTK) {
        String ten = ChuanHoa.hoTen(hoTen);
        if (ten.isEmpty()) {
            throw new LoiNghiepVu("Vui lòng nhập họ tên bệnh nhân");
        }
        String soDt = ChuanHoa.sdt(sdt);
        String trungSdt = tv.giaTri("SELECT HoTen FROM BenhNhan WHERE SDT = ?", soDt);
        if (trungSdt != null) {
            throw new LoiNghiepVu("Số điện thoại đã có hồ sơ (" + trungSdt + "), hãy tìm theo SĐT thay vì tạo mới");
        }
        String soCccd = rong(cccd);
        if (soCccd != null) {
            ChuanHoa.cccd(soCccd);
            if (tv.dem("SELECT COUNT(*) FROM BenhNhan WHERE CCCD = ?", soCccd) > 0) {
                throw new LoiNghiepVu("Số CCCD đã có hồ sơ, hãy tìm theo CCCD thay vì tạo mới");
            }
        }
        tv.capNhat("""
                INSERT INTO BenhNhan (HoTen, NgaySinh, GioiTinh, SDT, CCCD, DiaChi, NguoiLienHe, SDTNguoiLienHe, NgayTao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ten, ngaySinh, rong(gioiTinh), soDt, soCccd, rong(diaChi), rong(nguoiLienHe), rong(sdtNguoiLienHe),
                dongHo.bayGio());
        int maBN = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        nhatKy.ghi(maTK, "TAO_HO_SO_BENH_NHAN", "BenhNhan", maBN, ten + ", SĐT " + soDt);
        return maBN;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> theBhyt(Integer maBN) {
        return tv.ds("SELECT * FROM TheBHYT WHERE MaBN = ? ORDER BY NgayHetHan DESC", maBN);
    }

    /** Kết quả giám định thẻ; maThe chỉ có khi thẻ có trong hệ thống (cột LuotKham.MaThe là khóa ngoại). */
    record KetQuaBhyt(String trangThai, Integer mucHuong, String lyDo, String maThe) {
    }

    /** BR08: thẻ còn hạn tại ngày khám, trùng họ tên và ngày sinh với hồ sơ. Cổng giám định mô phỏng bằng bảng TheBHYT. */
    KetQuaBhyt kiemTraBhyt(String maThe, Integer maBN, LocalDate ngayKham) {
        Map<String, Object> the = tv.mot("""
                SELECT t.MaThe, t.MaBN, t.NgayBatDau, t.NgayHetHan, t.MucHuong, t.HoTenTrenThe, t.NgaySinhTrenThe,
                       bn.HoTen, bn.NgaySinh
                FROM TheBHYT t JOIN BenhNhan bn ON bn.MaBN = t.MaBN WHERE t.MaThe = ? OR t.MaSoBHXH = ?""",
                maThe, maThe);
        if (the == null) {
            return new KetQuaBhyt("KHONG_HOP_LE", null, "Không tìm thấy thẻ", null);
        }
        String ma = (String) the.get("MaThe");
        if (!maBN.equals(the.get("MaBN"))) {
            return new KetQuaBhyt("KHONG_HOP_LE", null, "Thẻ không thuộc bệnh nhân này", null);
        }
        LocalDate hetHan = (LocalDate) the.get("NgayHetHan");
        if (ngayKham.isBefore((LocalDate) the.get("NgayBatDau")) || ngayKham.isAfter(hetHan)) {
            return new KetQuaBhyt("KHONG_HOP_LE", null, "Thẻ hết hạn ngày " + hetHan.format(NGAY), ma);
        }
        if (!((String) the.get("HoTenTrenThe")).equalsIgnoreCase((String) the.get("HoTen"))
                || !the.get("NgaySinhTrenThe").equals(the.get("NgaySinh"))) {
            return new KetQuaBhyt("KHONG_HOP_LE", null, "Họ tên hoặc ngày sinh không trùng khớp hồ sơ", ma);
        }
        int muc = ((Number) the.get("MucHuong")).intValue();
        return new KetQuaBhyt("HOP_LE", muc, "Thẻ hợp lệ, mức hưởng " + muc + "%", ma);
    }

    // ================= Check-in, vắng mặt =================

    /** UC7.5: cấp số thứ tự, đưa vào hàng chờ của bác sĩ, khởi tạo tóm tắt tiền sử (UC13.7). */
    @Transactional
    public Map<String, Object> checkIn(Integer maLK, Integer maNVLeTan, String maThe, Integer maTK) {
        LocalDateTime bayGio = dongHo.bayGio();
        Map<String, Object> lk = tv.mot(
                "SELECT MaLK, MaLichHen, MaBN, MaBS, NgayKham, TrangThai FROM LuotKham WHERE MaLK = ? FOR UPDATE", maLK);
        if (lk == null || !"DA_XAC_NHAN".equals(lk.get("TrangThai"))) {
            throw new LoiNghiepVu("Lịch hẹn chưa được xác nhận hoặc đã chuyển trạng thái");
        }
        LocalDate ngayKham = (LocalDate) lk.get("NgayKham");
        if (!ngayKham.equals(bayGio.toLocalDate())) {
            throw new LoiNghiepVu("Lịch hẹn vào ngày " + ngayKham.format(NGAY) + ", không thể check-in hôm nay");
        }
        Integer maBN = (Integer) lk.get("MaBN");
        Integer maBS = (Integer) lk.get("MaBS");
        KetQuaBhyt bhyt = rong(maThe) == null ? new KetQuaBhyt("KHONG_CO", null, null, null)
                : kiemTraBhyt(maThe.strip(), maBN, ngayKham);

        // Khóa hàng đợi của bác sĩ trong ngày để 2 lễ tân không cấp trùng số
        Map<String, Object> so = tv.mot("""
                SELECT COALESCE(MAX(SoThuTu), 0) + 1 AS stt, COALESCE(MAX(ThuTuHangCho), 0) + 1 AS vt
                FROM LuotKham WHERE MaBS = ? AND NgayKham = ? FOR UPDATE""", maBS, ngayKham);
        int stt = ((Number) so.get("stt")).intValue();
        tv.capNhat("""
                UPDATE LuotKham SET TrangThai = 'DA_CHECK_IN', ThoiDiemCheckIn = ?, MaLeTanCheckIn = ?, SoThuTu = ?,
                       ThuTuHangCho = ?, MaThe = ?, TrangThaiBHYT = ?, MucHuong = ?
                WHERE MaLK = ?""",
                bayGio, maNVLeTan, stt, so.get("vt"), bhyt.maThe(), bhyt.trangThai(), bhyt.mucHuong(), maLK);
        taoTomTatTienSu(maLK, maBN);
        capNhatThoiGianCho(maBS);
        nhatKy.ghi(maTK, "CHECK_IN", "LuotKham", maLK, lk.get("MaLichHen") + " - "
                + tv.giaTri("SELECT HoTen FROM BenhNhan WHERE MaBN = ?", maBN) + ", số thứ tự " + stt
                + (bhyt.lyDo() != null ? ". BHYT: " + bhyt.lyDo() : ""));

        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("so_thu_tu", stt);
        kq.put("TrangThaiBHYT", bhyt.trangThai());
        kq.put("MucHuong", bhyt.mucHuong());
        kq.put("ly_do_bhyt", bhyt.lyDo());
        return kq;
    }

    /** UC7.9: lễ tân đánh dấu vắng mặt khi đã qua giờ hẹn. */
    @Transactional
    public void danhDauVangMat(Integer maLK, Integer maTK) {
        int n = tv.capNhat("""
                UPDATE LuotKham lk JOIN KhungGio kg ON kg.MaKG = lk.MaKG SET lk.TrangThai = 'VANG_MAT'
                WHERE lk.MaLK = ? AND lk.TrangThai = 'DA_XAC_NHAN' AND TIMESTAMP(kg.NgayKham, kg.GioBatDau) < ?""",
                maLK, dongHo.bayGio());
        if (n == 0) {
            throw new LoiNghiepVu("Lịch hẹn chưa qua giờ hẹn hoặc không ở trạng thái Đã xác nhận");
        }
        nhatKy.ghi(maTK, "DANH_DAU_VANG_MAT", "LuotKham", maLK, tv.giaTri("""
                SELECT CONCAT(lk.MaLichHen, ' - ', bn.HoTen) FROM LuotKham lk JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                WHERE lk.MaLK = ?""", maLK));
    }

    // ================= Tóm tắt tiền sử (UC13.7, BR14) =================

    /**
     * Gom dữ liệu tối đa 10 lượt khám hoàn tất gần nhất (đã bỏ định danh). Đây là dữ liệu đầu vào có cấu trúc;
     * bước gọi dịch vụ LLM để diễn đạt lại nằm ở tầng ứng dụng.
     */
    void taoTomTatTienSu(Integer maLK, Integer maBN) {
        LocalDateTime bayGio = dongHo.bayGio();
        List<Map<String, Object>> lichSu = tv.ds("""
                SELECT lk.MaLK, lk.NgayKham, hs.MaHSBA, hs.MaICD, hs.ChanDoan, hs.LoiDan, hs.NgayTaiKham
                FROM LuotKham lk JOIN HoSoBenhAn hs ON hs.MaLK = lk.MaLK
                WHERE lk.MaBN = ? AND lk.TrangThai = 'HOAN_THANH' AND lk.MaLK <> ?
                ORDER BY lk.NgayKham DESC, lk.MaLK DESC LIMIT 10""", maBN, maLK);
        if (lichSu.isEmpty()) {
            tv.capNhat("""
                    INSERT INTO TomTatTienSu (MaLK, TrangThai, ThoiDiemTao) VALUES (?, 'KHAM_LAN_DAU', ?)
                    ON DUPLICATE KEY UPDATE TrangThai = 'KHAM_LAN_DAU', ThoiDiemTao = VALUES(ThoiDiemTao)""",
                    maLK, bayGio);
            return;
        }
        Map<String, Object> ganNhat = lichSu.get(0);
        String ngayGanNhat = ((LocalDate) ganNhat.get("NgayKham")).format(NGAY);
        List<String> thuoc = tv.ds("""
                SELECT t.TenThuoc, t.HamLuong, ct.LieuDung FROM DonThuoc d
                JOIN ChiTietDonThuoc ct ON ct.MaDon = d.MaDon JOIN Thuoc t ON t.MaThuoc = ct.MaThuoc
                WHERE d.MaHSBA = ?""", ganNhat.get("MaHSBA")).stream()
                .map(r -> (r.get("TenThuoc") + " " + khongNull(r.get("HamLuong")) + " - "
                        + khongNull(r.get("LieuDung"))).strip())
                .toList();
        List<Object> dsLK = lichSu.stream().map(r -> r.get("MaLK")).toList();
        List<Map<String, Object>> batThuong = new ArrayList<>();
        for (Map<String, Object> r : tv.ds("""
                SELECT lk.NgayKham, ms.TenChiSo, kq.GiaTri, ms.DonVi, kq.DanhGia
                FROM KetQuaChiSo kq JOIN MauChiSo ms ON ms.MaChiSo = kq.MaChiSo
                JOIN KetQuaCLS k ON k.MaKQ = kq.MaKQ JOIN PhieuChiDinh p ON p.MaPCD = k.MaPCD
                JOIN LuotKham lk ON lk.MaLK = p.MaLK
                WHERE p.MaLK IN (?) AND kq.DanhGia <> 'BINH_THUONG' ORDER BY lk.NgayKham""", dsLK)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ngay", ((LocalDate) r.get("NgayKham")).format(NGAY));
            m.put("chi_so", r.get("TenChiSo"));
            m.put("gia_tri", r.get("GiaTri") instanceof BigDecimal b ? b.doubleValue() : r.get("GiaTri"));
            m.put("don_vi", r.get("DonVi"));
            m.put("danh_gia", r.get("DanhGia"));
            batThuong.add(m);
        }
        List<Map<String, Object>> benh = lichSu.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ngay", ((LocalDate) r.get("NgayKham")).format(NGAY));
            m.put("icd", r.get("MaICD"));
            m.put("chan_doan", r.get("ChanDoan"));
            m.put("ma_luot_kham", r.get("MaLK"));
            return m;
        }).toList();
        Map<String, Object> loiDan = new LinkedHashMap<>();
        loiDan.put("ngay", ngayGanNhat);
        loiDan.put("loi_dan", ganNhat.get("LoiDan"));
        loiDan.put("ngay_tai_kham", ganNhat.get("NgayTaiKham") instanceof LocalDate d ? d.format(NGAY) : null);

        Map<String, Object> noiDung = new LinkedHashMap<>();
        noiDung.put("nhan", "Do AI tạo, cần đối chiếu hồ sơ gốc");
        noiDung.put("benh_da_chan_doan", benh);
        noiDung.put("di_ung", tv.giaTri("SELECT DiUng FROM BenhNhan WHERE MaBN = ?", maBN));
        noiDung.put("thuoc_don_gan_nhat", Map.of("ngay", ngayGanNhat, "thuoc", thuoc));
        noiDung.put("chi_so_bat_thuong", batThuong);
        noiDung.put("loi_dan_lan_truoc", loiDan);
        tv.capNhat("""
                INSERT INTO TomTatTienSu (MaLK, TrangThai, NoiDung, ThoiDiemTao) VALUES (?, 'DA_TAO', ?, ?)
                ON DUPLICATE KEY UPDATE TrangThai = 'DA_TAO', NoiDung = VALUES(NoiDung), ThoiDiemTao = VALUES(ThoiDiemTao)""",
                maLK, json.writeValueAsString(noiDung), bayGio);
    }

    // ================= Thời gian chờ dự kiến (UC13.4, UC13.5) =================

    /** BR16: TB 30 lượt hoàn tất gần nhất (không qua CLS); dưới 10 lượt thì lấy thời lượng khung giờ. */
    private double thoiLuongTrungBinh(Integer maBS, LocalDate ngay) {
        Map<String, Object> r = tv.mot("""
                SELECT COUNT(*) AS n, AVG(TIMESTAMPDIFF(SECOND, ThoiDiemBatDauKham, ThoiDiemKetThucKham)) / 60 AS tb
                FROM (SELECT lk.ThoiDiemBatDauKham, lk.ThoiDiemKetThucKham FROM LuotKham lk
                      WHERE lk.MaBS = ? AND lk.TrangThai = 'HOAN_THANH' AND lk.ThoiDiemKetThucKham IS NOT NULL
                        AND NOT EXISTS (SELECT 1 FROM PhieuChiDinh p WHERE p.MaLK = lk.MaLK)
                      ORDER BY lk.ThoiDiemKetThucKham DESC LIMIT 30) x""", maBS);
        if (((Number) r.get("n")).longValue() >= 10) {
            return ((Number) r.get("tb")).doubleValue();
        }
        Number t = tv.giaTri("SELECT MAX(ThoiLuongKhungGio) FROM CaLamViec WHERE MaBS = ? AND NgayLam = ?", maBS, ngay);
        return t == null ? 15 : t.doubleValue();
    }

    /** W = thời gian còn lại của người đang khám + tổng thời lượng người đứng trước; BR17 báo sắp đến lượt. */
    @Transactional
    public void capNhatThoiGianCho(Integer maBS) {
        LocalDateTime bayGio = dongHo.bayGio();
        LocalDate ngay = bayGio.toLocalDate();
        List<Integer> dsBS = maBS != null ? List.of(maBS) : tv.ds("""
                SELECT DISTINCT MaBS FROM LuotKham
                WHERE NgayKham = ? AND TrangThai IN ('DA_CHECK_IN','DANG_KHAM','DA_CO_KET_QUA')""", ngay)
                .stream().map(r -> (Integer) r.get("MaBS")).toList();
        for (Integer bs : dsBS) {
            double t = thoiLuongTrungBinh(bs, ngay);
            LocalDateTime batDauKham = tv.giaTri("""
                    SELECT ThoiDiemBatDauKham FROM LuotKham WHERE MaBS = ? AND NgayKham = ? AND TrangThai = 'DANG_KHAM'""",
                    bs, ngay);
            double cho = batDauKham == null ? 0
                    : Math.max(t - Duration.between(batDauKham, bayGio).toSeconds() / 60.0, 2);
            List<Map<String, Object>> hang = tv.ds("""
                    SELECT lk.MaLK, lk.MaBN, lk.TrangThai, lk.DaThongBaoSapDenLuot, p.MaSoPhong
                    FROM LuotKham lk JOIN KhungGio kg ON kg.MaKG = lk.MaKG
                    JOIN CaLamViec ca ON ca.MaCa = kg.MaCa JOIN Phong p ON p.MaPhong = ca.MaPhong
                    WHERE lk.MaBS = ? AND lk.NgayKham = ? AND lk.TrangThai IN ('DA_CHECK_IN','DA_CO_KET_QUA')
                    ORDER BY lk.ThuTuHangCho""", bs, ngay);
            for (int k = 0; k < hang.size(); k++) {
                Map<String, Object> lk = hang.get(k);
                Integer ma = (Integer) lk.get("MaLK");
                tv.capNhat("UPDATE LuotKham SET ThoiGianChoDuKien = ?, GioDuKienVaoKham = ? WHERE MaLK = ?",
                        Math.round(cho), bayGio.plusSeconds(Math.round(cho * 60)), ma);
                if (!dung(lk.get("DaThongBaoSapDenLuot")) && (k <= 2 || cho <= 10)) {      // BR17
                    long phut = Math.round(cho);
                    thongBao.benhNhan((Integer) lk.get("MaBN"), "SAP_DEN_LUOT", "Sắp đến lượt khám",
                            (phut < 1 ? "Đã đến lượt bạn." : "Còn khoảng " + phut + " phút đến lượt bạn.")
                                    + " Vui lòng có mặt tại phòng " + lk.get("MaSoPhong") + ".", "LUOT_KHAM", ma, false);
                    tv.capNhat("UPDATE LuotKham SET DaThongBaoSapDenLuot = TRUE WHERE MaLK = ?", ma);
                }
                cho += t * ("DA_CO_KET_QUA".equals(lk.get("TrangThai")) ? 0.5 : 1);            // BR16 quay lại 50%
            }
        }
    }

    private static String rong(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    /** Cột BOOLEAN của MySQL có thể về dạng Boolean hoặc số 0/1. */
    private static boolean dung(Object o) {
        return Boolean.TRUE.equals(o) || (o instanceof Number n && n.intValue() != 0);
    }

    private static Object khongNull(Object o) {
        return o == null ? "" : o;
    }
}
