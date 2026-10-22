package vn.vietbac.phongkham.dichvu;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.ObjectMapper;
import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Gói 8 – khám bệnh: hàng chờ và gọi khám (UC8.1, UC6.6), hồ sơ bệnh án (UC8.3, UC8.9), chỉ định cận lâm sàng
 * (UC8.5), kê đơn (UC8.7), hoàn tất (UC8.10, BR06), bổ sung ghi chú (UC8.11), phản hồi tóm tắt tiền sử (UC8.15);
 * gói 9 – bệnh nhân xem hồ sơ sức khỏe của mình. Mọi lần đọc / ghi hồ sơ được ghi vào NhatKyTruyCapHoSo (UC2.8).
 */
@Service
@RequiredArgsConstructor
public class KhamBenhService {

    /** Lượt khám bác sĩ còn thao tác được trong ngày. */
    private static final List<String> TRONG_HANG_CHO = List.of("DA_CHECK_IN", "DANG_KHAM", "CHO_CLS", "DA_CO_KET_QUA");
    private static final List<String> PHIEU_CHUA_XONG = List.of("CHO_THANH_TOAN", "CHO_THUC_HIEN", "DANG_THUC_HIEN");

    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final TiepDonService tiepDon;
    private final TruyVan tv;
    private final DongHo dongHo;
    private final ObjectMapper json;

    public record ThuocKe(Integer maThuoc, Integer soLuong, String lieuDung, String cachDung, Integer soNgayDung) {
    }

    public record CapNhatHoSo(Integer mach, String huyetAp, BigDecimal nhietDo, BigDecimal canNang, BigDecimal chieuCao,
                              String trieuChung, String khamLamSang, String maICD, String chanDoan, String loiDan,
                              LocalDate ngayTaiKham, List<ThuocKe> donThuoc) {
    }

    // ================= Hàng chờ, gọi khám =================

    /** Hàng chờ hôm nay của bác sĩ: người đang khám đứng đầu, sau đó theo thứ tự hàng chờ. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> hangCho(Integer maBS) {
        return tv.ds("""
                SELECT lk.MaLK, lk.MaLichHen, lk.SoThuTu, lk.TrangThai, lk.ThoiDiemCheckIn, lk.GioDuKienVaoKham,
                       lk.SoLanBoQua, lk.LyDoKham, lk.TrangThaiBHYT, lk.MucHuong, bn.MaBN, bn.HoTen, bn.NgaySinh, bn.GioiTinh
                FROM LuotKham lk JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                WHERE lk.MaBS = ? AND lk.NgayKham = ? AND lk.TrangThai IN (?)
                ORDER BY lk.TrangThai = 'DANG_KHAM' DESC, lk.ThuTuHangCho""", maBS, dongHo.homNay(), TRONG_HANG_CHO);
    }

    /**
     * Gọi bệnh nhân vào khám (lần đầu hoặc quay lại sau CLS): mỗi bác sĩ chỉ khám một người một lúc.
     * Lần đầu tạo hồ sơ bệnh án ở trạng thái nháp.
     */
    @Transactional
    public void goiKham(Integer maLK, Integer maBS, Integer maTK) {
        Map<String, Object> lk = luotCuaBacSi(maLK, maBS, true);
        String tt = (String) lk.get("TrangThai");
        if (!"DA_CHECK_IN".equals(tt) && !"DA_CO_KET_QUA".equals(tt)) {
            throw new LoiNghiepVu("Chỉ gọi được bệnh nhân đã check-in hoặc đã có kết quả cận lâm sàng");
        }
        if (!dongHo.homNay().equals(lk.get("NgayKham"))) {
            throw new LoiNghiepVu("Lượt khám không thuộc ngày hôm nay");
        }
        String dangKham = tv.giaTri("""
                SELECT bn.HoTen FROM LuotKham lk JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                WHERE lk.MaBS = ? AND lk.NgayKham = ? AND lk.TrangThai = 'DANG_KHAM' AND lk.MaLK <> ? FOR UPDATE""",
                maBS, lk.get("NgayKham"), maLK);
        if (dangKham != null) {
            throw new LoiNghiepVu("Bạn đang khám bệnh nhân " + dangKham + ", hãy hoàn tất hoặc chỉ định CLS trước");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        tv.capNhat("""
                UPDATE LuotKham SET TrangThai = 'DANG_KHAM', ThoiDiemBatDauKham = COALESCE(ThoiDiemBatDauKham, ?)
                WHERE MaLK = ?""", bayGio, maLK);
        Integer maHSBA = tv.giaTri("SELECT MaHSBA FROM HoSoBenhAn WHERE MaLK = ?", maLK);
        if (maHSBA == null) {
            tv.capNhat("INSERT INTO HoSoBenhAn (MaLK, TrieuChung, TrangThai, NgayTao) VALUES (?, ?, 'NHAP', ?)",
                    maLK, lk.get("TrieuChungSoBo"), bayGio);
            maHSBA = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
            ghiTruyCap(maTK, maHSBA, "TAO");
        }
        thongBao.benhNhan((Integer) lk.get("MaBN"), "SAP_DEN_LUOT", "Mời vào khám",
                "Mời bạn vào phòng " + tv.giaTri("""
                        SELECT p.MaSoPhong FROM LuotKham lk JOIN KhungGio kg ON kg.MaKG = lk.MaKG
                        JOIN CaLamViec ca ON ca.MaCa = kg.MaCa JOIN Phong p ON p.MaPhong = ca.MaPhong
                        WHERE lk.MaLK = ?""", maLK) + " để khám.", "LUOT_KHAM", maLK, false);
        tiepDon.capNhatThoiGianCho(maBS);
    }

    /** UC6.6 2a: bệnh nhân chưa có mặt khi được gọi, chuyển xuống cuối hàng chờ. */
    @Transactional
    public void boQua(Integer maLK, Integer maBS, Integer maTK) {
        Map<String, Object> lk = luotCuaBacSi(maLK, maBS, true);
        if (!"DA_CHECK_IN".equals(lk.get("TrangThai")) && !"DA_CO_KET_QUA".equals(lk.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ bỏ qua được bệnh nhân đang chờ khám");
        }
        tv.capNhat("""
                UPDATE LuotKham lk JOIN (SELECT COALESCE(MAX(ThuTuHangCho), 0) + 1 AS vt FROM LuotKham
                                         WHERE MaBS = ? AND NgayKham = ?) x
                SET lk.ThuTuHangCho = x.vt, lk.SoLanBoQua = lk.SoLanBoQua + 1, lk.DaThongBaoSapDenLuot = FALSE
                WHERE lk.MaLK = ?""", maBS, lk.get("NgayKham"), maLK);
        nhatKy.ghi(maTK, "BO_QUA_LUOT_KHAM", "LuotKham", maLK, lk.get("MaLichHen") + " chuyển xuống cuối hàng chờ");
        tiepDon.capNhatThoiGianCho(maBS);
    }

    // ================= Hồ sơ lượt khám =================

    /**
     * Toàn bộ thông tin một lượt khám cho bác sĩ: bệnh nhân, hồ sơ, đơn thuốc, chỉ định CLS kèm kết quả,
     * tóm tắt tiền sử và các lần khám trước. Bác sĩ điều trị hoặc người giám sát (maBS null) mới xem được.
     */
    @Transactional
    public Map<String, Object> chiTiet(Integer maLK, Integer maBS, Integer maTK) {
        Map<String, Object> lk = tv.mot("""
                SELECT lk.MaLK, lk.MaLichHen, lk.MaBN, lk.MaBS, lk.NgayKham, lk.TrangThai, lk.LyDoKham, lk.TrieuChungSoBo,
                       lk.SoThuTu, lk.TrangThaiBHYT, lk.MucHuong, lk.MaThe, lk.ThoiDiemBatDauKham, lk.ThoiDiemKetThucKham,
                       kg.GioBatDau, bs.HoTen AS BacSi, ck.TenCK, p.MaSoPhong
                FROM LuotKham lk JOIN KhungGio kg ON kg.MaKG = lk.MaKG JOIN CaLamViec ca ON ca.MaCa = kg.MaCa
                JOIN Phong p ON p.MaPhong = ca.MaPhong JOIN NhanVien bs ON bs.MaNV = lk.MaBS
                LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                WHERE lk.MaLK = ?""", maLK);
        if (lk == null) {
            throw new KhongTimThay("Không tìm thấy lượt khám");
        }
        if (maBS != null && !maBS.equals(lk.get("MaBS"))) {
            throw new LoiQuyen("Bạn không phải bác sĩ điều trị của lượt khám này");
        }
        Integer maBN = (Integer) lk.get("MaBN");
        lk.put("BenhNhan", tv.mot("""
                SELECT MaBN, HoTen, NgaySinh, GioiTinh, SDT, DiaChi, DiUng, NguoiLienHe, SDTNguoiLienHe
                FROM BenhNhan WHERE MaBN = ?""", maBN));
        Map<String, Object> hs = hoSoCuaLuot(maLK);
        lk.put("HoSo", hs);
        lk.put("ChiDinh", chiDinhCuaLuot(maLK));
        Map<String, Object> tomTat = tv.mot(
                "SELECT TrangThai, NoiDung, ThoiDiemTao, PhanHoiBS FROM TomTatTienSu WHERE MaLK = ?", maLK);
        if (tomTat != null && tomTat.get("NoiDung") instanceof String s) {
            tomTat.put("NoiDung", json.readValue(s, Map.class));
        }
        lk.put("TomTat", tomTat);
        lk.put("LichSu", tv.ds("""
                SELECT lk.MaLK, lk.NgayKham, bs.HoTen AS BacSi, ck.TenCK, hs.MaICD, hs.ChanDoan
                FROM LuotKham lk JOIN HoSoBenhAn hs ON hs.MaLK = lk.MaLK JOIN NhanVien bs ON bs.MaNV = lk.MaBS
                LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                WHERE lk.MaBN = ? AND lk.TrangThai = 'HOAN_THANH' AND lk.MaLK <> ?
                ORDER BY lk.NgayKham DESC, lk.MaLK DESC LIMIT 20""", maBN, maLK));
        if (hs != null) {
            ghiTruyCap(maTK, (Integer) hs.get("MaHSBA"), "XEM");
        }
        return lk;
    }

    /** Bác sĩ xem lại một lần khám trước của bệnh nhân mình đang điều trị (chỉ đọc). */
    @Transactional
    public Map<String, Object> lanKhamTruoc(Integer maLKDangKham, Integer maLKCu, Integer maBS, Integer maTK) {
        Map<String, Object> dangKham = luotCuaBacSi(maLKDangKham, maBS, false);
        Integer maBNCu = tv.giaTri("SELECT MaBN FROM LuotKham WHERE MaLK = ? AND TrangThai = 'HOAN_THANH'", maLKCu);
        if (maBNCu == null || !maBNCu.equals(dangKham.get("MaBN"))) {
            throw new LoiQuyen("Chỉ xem được lịch sử khám của bệnh nhân đang điều trị");
        }
        return hoSoDayDu(maLKCu, maTK);
    }

    /**
     * Lưu tạm hồ sơ và đơn thuốc (UC8.9); đơn thuốc ghi đè toàn bộ theo danh sách gửi lên.
     * Đơn giá thuốc chốt tại thời điểm kê (BR09).
     */
    @Transactional
    public void luuHoSo(Integer maLK, Integer maBS, CapNhatHoSo b, boolean duocKeDon, Integer maTK) {
        Map<String, Object> lk = luotCuaBacSi(maLK, maBS, true);
        if (!"DANG_KHAM".equals(lk.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ ghi hồ sơ khi bệnh nhân đang được khám");
        }
        Map<String, Object> hs = tv.mot("SELECT MaHSBA, TrangThai FROM HoSoBenhAn WHERE MaLK = ? FOR UPDATE", maLK);
        if (hs == null || "HOAN_TAT".equals(hs.get("TrangThai"))) {
            throw new LoiNghiepVu("Hồ sơ đã hoàn tất, chỉ được bổ sung ghi chú");
        }
        Integer maHSBA = (Integer) hs.get("MaHSBA");
        String icd = rong(b.maICD());
        if (icd != null && tv.dem("SELECT COUNT(*) FROM BenhICD WHERE MaICD = ? AND TrangThai = 'HOAT_DONG'", icd) == 0) {
            throw new LoiNghiepVu("Mã ICD " + icd + " không có trong danh mục");
        }
        String huyetAp = rong(b.huyetAp());
        if (huyetAp != null && !huyetAp.matches("\\d{2,3}/\\d{2,3}")) {
            throw new LoiNghiepVu("Huyết áp ghi dạng tâm thu/tâm trương, VD 120/80");
        }
        if (b.mach() != null && (b.mach() < 20 || b.mach() > 250)) {
            throw new LoiNghiepVu("Mạch phải trong khoảng 20-250 lần/phút");
        }
        if (b.nhietDo() != null && (b.nhietDo().doubleValue() < 34 || b.nhietDo().doubleValue() > 43)) {
            throw new LoiNghiepVu("Nhiệt độ phải trong khoảng 34-43 °C");
        }
        if (b.ngayTaiKham() != null && !b.ngayTaiKham().isAfter(dongHo.homNay())) {
            throw new LoiNghiepVu("Ngày tái khám phải sau hôm nay");
        }
        tv.capNhat("""
                UPDATE HoSoBenhAn SET Mach = ?, HuyetAp = ?, NhietDo = ?, CanNang = ?, ChieuCao = ?, TrieuChung = ?,
                       KhamLamSang = ?, MaICD = ?, ChanDoan = ?, LoiDan = ?, NgayTaiKham = ?
                WHERE MaHSBA = ?""",
                b.mach(), huyetAp, b.nhietDo(), b.canNang(), b.chieuCao(), rong(b.trieuChung()), rong(b.khamLamSang()),
                icd, rong(b.chanDoan()), rong(b.loiDan()), b.ngayTaiKham(), maHSBA);
        if (b.donThuoc() != null) {
            if (!duocKeDon) {
                throw new LoiQuyen("Bạn không có quyền kê đơn thuốc");
            }
            luuDonThuoc(maHSBA, b.donThuoc());
        }
        ghiTruyCap(maTK, maHSBA, "CAP_NHAT");
    }

    private void luuDonThuoc(Integer maHSBA, List<ThuocKe> ds) {
        Set<Integer> daCo = new HashSet<>();
        for (ThuocKe t : ds) {
            if (t.maThuoc() == null || t.soLuong() == null || t.soLuong() <= 0) {
                throw new LoiNghiepVu("Mỗi thuốc trong đơn cần chọn thuốc và số lượng lớn hơn 0");
            }
            if (!daCo.add(t.maThuoc())) {
                throw new LoiNghiepVu("Một thuốc chỉ ghi một dòng trong đơn");
            }
        }
        Integer maDon = tv.giaTri("SELECT MaDon FROM DonThuoc WHERE MaHSBA = ?", maHSBA);
        if (maDon != null) {
            tv.capNhat("DELETE FROM ChiTietDonThuoc WHERE MaDon = ?", maDon);
        }
        if (ds.isEmpty()) {
            if (maDon != null) {
                tv.capNhat("DELETE FROM DonThuoc WHERE MaDon = ?", maDon);
            }
            return;
        }
        if (maDon == null) {
            tv.capNhat("INSERT INTO DonThuoc (MaHSBA, NgayKe) VALUES (?, ?)", maHSBA, dongHo.bayGio());
            maDon = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        }
        for (ThuocKe t : ds) {
            Map<String, Object> thuoc = tv.mot(
                    "SELECT TenThuoc, DonGia, GiaBHYT FROM Thuoc WHERE MaThuoc = ? AND TrangThai = 'HOAT_DONG'", t.maThuoc());
            if (thuoc == null) {
                throw new LoiNghiepVu("Thuốc không có trong danh mục hoặc đã ngừng sử dụng");
            }
            if (t.soNgayDung() != null && (t.soNgayDung() <= 0 || t.soNgayDung() > 90)) {
                throw new LoiNghiepVu("Số ngày dùng " + thuoc.get("TenThuoc") + " từ 1 đến 90 ngày");
            }
            tv.capNhat("""
                    INSERT INTO ChiTietDonThuoc (MaDon, MaThuoc, SoLuong, LieuDung, CachDung, SoNgayDung, DonGia, GiaBHYT)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    maDon, t.maThuoc(), t.soLuong(), rong(t.lieuDung()), rong(t.cachDung()), t.soNgayDung(),
                    thuoc.get("DonGia"), thuoc.get("GiaBHYT"));
        }
    }

    // ================= Chỉ định cận lâm sàng (UC8.5) =================

    /**
     * Mỗi dịch vụ một phiếu, chi phí chốt tại thời điểm chỉ định (BR09); BHYT chi trả theo giá BHYT x mức hưởng.
     * Phiếu BHYT trả toàn bộ vào thẳng hàng chờ CLS (BR10), còn lại chờ thanh toán tạm thu.
     * Bệnh nhân rời phòng khám để làm CLS: lượt khám chuyển Chờ CLS.
     */
    @Transactional
    public List<Integer> chiDinh(Integer maLK, Integer maBS, List<Integer> dsMaDV, String yeuCau, Integer maTK) {
        Map<String, Object> lk = luotCuaBacSi(maLK, maBS, true);
        if (!"DANG_KHAM".equals(lk.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ chỉ định cận lâm sàng khi bệnh nhân đang được khám");
        }
        if (dsMaDV == null || dsMaDV.isEmpty()) {
            throw new LoiNghiepVu("Vui lòng chọn ít nhất một dịch vụ");
        }
        Map<String, Object> hs = tv.mot("SELECT ChanDoan, MaICD FROM HoSoBenhAn WHERE MaLK = ?", maLK);
        String chanDoanSoBo = hs == null ? null : rong((String) hs.get("ChanDoan"));
        if (chanDoanSoBo == null) {
            throw new LoiNghiepVu("Ghi chẩn đoán sơ bộ (mục Chẩn đoán) và lưu trước khi chỉ định");
        }
        boolean coBhyt = "HOP_LE".equals(lk.get("TrangThaiBHYT"));
        int mucHuong = lk.get("MucHuong") instanceof Number n ? n.intValue() : 0;
        LocalDateTime bayGio = dongHo.bayGio();
        List<Integer> kq = new ArrayList<>();
        int thuTu = 1;
        for (Integer maDV : new LinkedHashSet<>(dsMaDV)) {
            Map<String, Object> dv = tv.mot("""
                    SELECT TenDV, LoaiDV, MaPhong, GiaDichVu, GiaBHYT FROM DichVu
                    WHERE MaDV = ? AND TrangThai = 'HOAT_DONG'""", maDV);
            if (dv == null || "KHAM".equals(dv.get("LoaiDV"))) {
                throw new LoiNghiepVu("Dịch vụ cận lâm sàng không hợp lệ hoặc đã ngừng");
            }
            if (tv.dem("SELECT COUNT(*) FROM PhieuChiDinh WHERE MaLK = ? AND MaDV = ? AND TrangThai <> 'DA_HUY'",
                    maLK, maDV) > 0) {
                throw new LoiNghiepVu("Đã chỉ định " + dv.get("TenDV") + " trong lượt khám này");
            }
            BigDecimal gia = (BigDecimal) dv.get("GiaDichVu");
            BigDecimal giaBhyt = (BigDecimal) dv.get("GiaBHYT");
            BigDecimal bhytTra = coBhyt && giaBhyt != null
                    ? giaBhyt.multiply(BigDecimal.valueOf(mucHuong)).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            boolean traHet = bhytTra.compareTo(gia) >= 0;
            tv.capNhat("""
                    INSERT INTO PhieuChiDinh (MaLK, MaDV, MaPhong, MaBSChiDinh, ChanDoanSoBo, YeuCau, GiaDichVu, GiaBHYT,
                           BHYTChiTra, TrangThai, ThoiDiemChiDinh, ThoiDiemVaoHangCho, ThuTuGoiY)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    maLK, maDV, dv.get("MaPhong"), maBS, chanDoanSoBo, rong(yeuCau), gia, giaBhyt, bhytTra.min(gia),
                    traHet ? "CHO_THUC_HIEN" : "CHO_THANH_TOAN", bayGio, traHet ? bayGio : null, thuTu++);
            kq.add(((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue());
        }
        tv.capNhat("UPDATE LuotKham SET TrangThai = 'CHO_CLS' WHERE MaLK = ?", maLK);
        nhatKy.ghi(maTK, "CHI_DINH_CLS", "LuotKham", maLK, lk.get("MaLichHen") + ": " + kq.size() + " dịch vụ");
        thongBao.benhNhan((Integer) lk.get("MaBN"), "CHI_DINH_CLS", "Chỉ định cận lâm sàng",
                "Bác sĩ đã chỉ định " + kq.size() + " dịch vụ cận lâm sàng. Vui lòng đến quầy thu ngân để tạm thu "
                        + "(nếu có) rồi đến phòng thực hiện theo hướng dẫn.", "LUOT_KHAM", maLK, false);
        tiepDon.capNhatThoiGianCho(maBS);
        return kq;
    }

    /**
     * Hủy phiếu chưa thực hiện. Nếu lượt đang chờ CLS mà không còn phiếu nào chưa xong thì đưa bệnh nhân
     * về hàng chờ khám (Chờ CLS -> Đã có kết quả, theo vòng đời trong trigger).
     */
    @Transactional
    public void huyChiDinh(Integer maPCD, Integer maBS, String lyDo, Integer maTK) {
        Map<String, Object> p = tv.mot("SELECT MaLK, TrangThai FROM PhieuChiDinh WHERE MaPCD = ? FOR UPDATE", maPCD);
        if (p == null) {
            throw new KhongTimThay("Không tìm thấy phiếu chỉ định");
        }
        Integer maLK = (Integer) p.get("MaLK");
        Map<String, Object> lk = luotCuaBacSi(maLK, maBS, true);
        if (!"CHO_THANH_TOAN".equals(p.get("TrangThai")) && !"CHO_THUC_HIEN".equals(p.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ hủy được phiếu chưa thực hiện");
        }
        if (rong(lyDo) == null) {
            throw new LoiNghiepVu("Vui lòng nhập lý do hủy");
        }
        tv.capNhat("UPDATE PhieuChiDinh SET TrangThai = 'DA_HUY', LyDoHuy = ? WHERE MaPCD = ?", lyDo.strip(), maPCD);
        if ("CHO_CLS".equals(lk.get("TrangThai"))
                && tv.dem("SELECT COUNT(*) FROM PhieuChiDinh WHERE MaLK = ? AND TrangThai IN (?)", maLK, PHIEU_CHUA_XONG) == 0) {
            tv.capNhat("UPDATE LuotKham SET TrangThai = 'DA_CO_KET_QUA' WHERE MaLK = ?", maLK);
            tiepDon.capNhatThoiGianCho(maBS);
        }
        nhatKy.ghi(maTK, "HUY_CHI_DINH_CLS", "PhieuChiDinh", maPCD, lk.get("MaLichHen") + ": " + lyDo.strip());
    }

    // ================= Hoàn tất, ghi chú =================

    /** UC8.10: chốt hồ sơ (BR06 không sửa được nữa), kết thúc lượt khám, báo bệnh nhân. */
    @Transactional
    public void hoanTat(Integer maLK, Integer maBS, Integer maTK) {
        Map<String, Object> lk = luotCuaBacSi(maLK, maBS, true);
        if (!"DANG_KHAM".equals(lk.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ hoàn tất khi bệnh nhân đang được khám");
        }
        Map<String, Object> hs = tv.mot(
                "SELECT MaHSBA, ChanDoan, MaICD, NgayTaiKham FROM HoSoBenhAn WHERE MaLK = ? FOR UPDATE", maLK);
        if (hs == null || rong((String) hs.get("ChanDoan")) == null) {
            throw new LoiNghiepVu("Vui lòng ghi chẩn đoán và lưu hồ sơ trước khi hoàn tất");
        }
        if (tv.dem("SELECT COUNT(*) FROM PhieuChiDinh WHERE MaLK = ? AND TrangThai IN (?)", maLK, PHIEU_CHUA_XONG) > 0) {
            throw new LoiNghiepVu("Còn phiếu cận lâm sàng chưa có kết quả, hãy chờ kết quả hoặc hủy phiếu");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        Integer maHSBA = (Integer) hs.get("MaHSBA");
        tv.capNhat("UPDATE HoSoBenhAn SET TrangThai = 'HOAN_TAT', NgayHoanTat = ? WHERE MaHSBA = ?", bayGio, maHSBA);
        tv.capNhat("UPDATE LuotKham SET TrangThai = 'HOAN_THANH', ThoiDiemKetThucKham = ? WHERE MaLK = ?", bayGio, maLK);
        ghiTruyCap(maTK, maHSBA, "CAP_NHAT");
        nhatKy.ghi(maTK, "HOAN_TAT_KHAM", "LuotKham", maLK, lk.get("MaLichHen") + " - " + hs.get("ChanDoan"));
        String taiKham = hs.get("NgayTaiKham") instanceof LocalDate d
                ? " Hẹn tái khám ngày " + d.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + "." : "";
        thongBao.benhNhan((Integer) lk.get("MaBN"), "HOAN_TAT_KHAM", "Đã hoàn tất lượt khám",
                "Kết quả khám, đơn thuốc và lời dặn đã có trong mục Hồ sơ sức khỏe." + taiKham, "LUOT_KHAM", maLK, true);
        tiepDon.capNhatThoiGianCho(maBS);
    }

    /** UC8.11: bác sĩ điều trị bổ sung ghi chú cho hồ sơ đã hoàn tất. */
    @Transactional
    public void boSungGhiChu(Integer maLK, Integer maBS, String noiDung, Integer maTK) {
        luotCuaBacSi(maLK, maBS, false);
        if (rong(noiDung) == null) {
            throw new LoiNghiepVu("Vui lòng nhập nội dung ghi chú");
        }
        Integer maHSBA = tv.giaTri("SELECT MaHSBA FROM HoSoBenhAn WHERE MaLK = ? AND TrangThai = 'HOAN_TAT'", maLK);
        if (maHSBA == null) {
            throw new LoiNghiepVu("Chỉ bổ sung ghi chú khi hồ sơ đã hoàn tất; hồ sơ đang mở thì sửa trực tiếp");
        }
        tv.capNhat("INSERT INTO GhiChuHoSo (MaHSBA, MaBS, NoiDung, ThoiGian) VALUES (?, ?, ?, ?)",
                maHSBA, maBS, noiDung.strip(), dongHo.bayGio());
        ghiTruyCap(maTK, maHSBA, "BO_SUNG_GHI_CHU");
    }

    /** UC8.15: bác sĩ đánh giá bản tóm tắt tiền sử do AI tạo. */
    @Transactional
    public void phanHoiTomTat(Integer maLK, Integer maBS, String phanHoi) {
        luotCuaBacSi(maLK, maBS, false);
        if (!"HUU_ICH".equals(phanHoi) && !"CHUA_CHINH_XAC".equals(phanHoi)) {
            throw new LoiNghiepVu("Phản hồi không hợp lệ");
        }
        int n = tv.capNhat("""
                UPDATE TomTatTienSu SET PhanHoiBS = ?, ThoiDiemPhanHoi = ? WHERE MaLK = ? AND TrangThai = 'DA_TAO'""",
                phanHoi, dongHo.bayGio(), maLK);
        if (n == 0) {
            throw new LoiNghiepVu("Lượt khám không có bản tóm tắt tiền sử");
        }
    }

    // ================= Danh mục tra cứu khi khám =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> timICD(String tuKhoa) {
        String k = rong(tuKhoa);
        if (k == null) {
            return tv.ds("SELECT MaICD, TenBenh FROM BenhICD WHERE TrangThai = 'HOAT_DONG' ORDER BY MaICD LIMIT 50");
        }
        return tv.ds("""
                SELECT MaICD, TenBenh FROM BenhICD WHERE TrangThai = 'HOAT_DONG' AND (MaICD LIKE ? OR TenBenh LIKE ?)
                ORDER BY MaICD LIMIT 50""", k + "%", "%" + k + "%");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsThuoc() {
        return tv.ds("""
                SELECT MaThuoc, TenThuoc, HoatChat, HamLuong, DonViTinh, DonGia, GiaBHYT FROM Thuoc
                WHERE TrangThai = 'HOAT_DONG' ORDER BY TenThuoc""");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsDichVuCls() {
        return tv.ds("""
                SELECT dv.MaDV, dv.TenDV, dv.LoaiDV, dv.GiaDichVu, dv.GiaBHYT, dv.YeuCauNhinAn, dv.ThoiGianTraKetQua,
                       p.MaSoPhong, p.TenPhong
                FROM DichVu dv JOIN Phong p ON p.MaPhong = dv.MaPhong
                WHERE dv.LoaiDV <> 'KHAM' AND dv.TrangThai = 'HOAT_DONG' ORDER BY dv.LoaiDV, dv.TenDV""");
    }

    // ================= Hồ sơ sức khỏe của bệnh nhân =================

    /** Các lượt khám đã hoàn tất của bệnh nhân, mới nhất trước. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> hoSoCuaBenhNhan(Integer maBN) {
        if (maBN == null) {
            throw new KhongTimThay("Tài khoản chưa có hồ sơ");
        }
        return tv.ds("""
                SELECT lk.MaLK, lk.MaLichHen, lk.NgayKham, bs.HoTen AS BacSi, bs.HocHamHocVi, ck.TenCK, hs.MaICD,
                       icd.TenBenh, hs.ChanDoan, hs.NgayTaiKham,
                       (SELECT COUNT(*) FROM PhieuChiDinh p WHERE p.MaLK = lk.MaLK AND p.TrangThai = 'CO_KET_QUA') AS SoKetQua,
                       EXISTS (SELECT 1 FROM DonThuoc d WHERE d.MaHSBA = hs.MaHSBA) AS CoDonThuoc
                FROM LuotKham lk JOIN HoSoBenhAn hs ON hs.MaLK = lk.MaLK AND hs.TrangThai = 'HOAN_TAT'
                JOIN NhanVien bs ON bs.MaNV = lk.MaBS LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                LEFT JOIN BenhICD icd ON icd.MaICD = hs.MaICD
                WHERE lk.MaBN = ? AND lk.TrangThai = 'HOAN_THANH'
                ORDER BY lk.NgayKham DESC, lk.MaLK DESC""", maBN);
    }

    /** Bệnh nhân xem chi tiết một lần khám của chính mình (chỉ hồ sơ đã hoàn tất). */
    @Transactional
    public Map<String, Object> hoSoChiTietCuaBenhNhan(Integer maLK, Integer maBN, Integer maTK) {
        Integer chuSoHuu = tv.giaTri("SELECT MaBN FROM LuotKham WHERE MaLK = ? AND TrangThai = 'HOAN_THANH'", maLK);
        if (chuSoHuu == null || !chuSoHuu.equals(maBN)) {
            throw new KhongTimThay("Không tìm thấy hồ sơ khám");
        }
        return hoSoDayDu(maLK, maTK);
    }

    // ================= Dùng chung =================

    /** Hồ sơ đã hoàn tất kèm đơn thuốc, kết quả CLS, ghi chú bổ sung; ghi nhật ký truy cập. */
    private Map<String, Object> hoSoDayDu(Integer maLK, Integer maTK) {
        Map<String, Object> kq = tv.mot("""
                SELECT lk.MaLK, lk.MaLichHen, lk.NgayKham, lk.LyDoKham, bs.HoTen AS BacSi, bs.HocHamHocVi, ck.TenCK,
                       bn.HoTen AS BenhNhan, bn.NgaySinh, bn.GioiTinh
                FROM LuotKham lk JOIN NhanVien bs ON bs.MaNV = lk.MaBS LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                JOIN BenhNhan bn ON bn.MaBN = lk.MaBN WHERE lk.MaLK = ?""", maLK);
        Map<String, Object> hs = hoSoCuaLuot(maLK);
        kq.put("HoSo", hs);
        kq.put("ChiDinh", chiDinhCuaLuot(maLK).stream().filter(p -> !"DA_HUY".equals(p.get("TrangThai"))).toList());
        if (hs != null) {
            ghiTruyCap(maTK, (Integer) hs.get("MaHSBA"), "XEM");
        }
        return kq;
    }

    private Map<String, Object> hoSoCuaLuot(Integer maLK) {
        Map<String, Object> hs = tv.mot("""
                SELECT hs.*, icd.TenBenh FROM HoSoBenhAn hs LEFT JOIN BenhICD icd ON icd.MaICD = hs.MaICD
                WHERE hs.MaLK = ?""", maLK);
        if (hs == null) {
            return null;
        }
        Integer maHSBA = (Integer) hs.get("MaHSBA");
        hs.put("DonThuoc", tv.ds("""
                SELECT ct.MaThuoc, t.TenThuoc, t.HoatChat, t.HamLuong, t.DonViTinh, ct.SoLuong, ct.LieuDung, ct.CachDung,
                       ct.SoNgayDung, ct.DonGia, ct.GiaBHYT
                FROM DonThuoc d JOIN ChiTietDonThuoc ct ON ct.MaDon = d.MaDon JOIN Thuoc t ON t.MaThuoc = ct.MaThuoc
                WHERE d.MaHSBA = ? ORDER BY t.TenThuoc""", maHSBA));
        hs.put("GhiChu", tv.ds("""
                SELECT gc.MaGC, gc.NoiDung, gc.ThoiGian, bs.HoTen AS BacSi FROM GhiChuHoSo gc
                JOIN NhanVien bs ON bs.MaNV = gc.MaBS WHERE gc.MaHSBA = ? ORDER BY gc.ThoiGian""", maHSBA));
        return hs;
    }

    private List<Map<String, Object>> chiDinhCuaLuot(Integer maLK) {
        List<Map<String, Object>> ds = tv.ds("""
                SELECT p.MaPCD, p.MaDV, dv.TenDV, dv.LoaiDV, ph.MaSoPhong, ph.TenPhong, p.YeuCau, p.GiaDichVu, p.BHYTChiTra,
                       p.BenhNhanTra, p.TrangThai, p.LyDoHuy, p.ThoiDiemChiDinh, p.ThoiDiemCoKetQua,
                       kq.MaKQ, kq.MoTa, kq.KetLuan, kq.NhanXet, kq.PhienBan, th.HoTen AS BacSiThucHien
                FROM PhieuChiDinh p JOIN DichVu dv ON dv.MaDV = p.MaDV JOIN Phong ph ON ph.MaPhong = p.MaPhong
                LEFT JOIN KetQuaCLS kq ON kq.MaPCD = p.MaPCD LEFT JOIN NhanVien th ON th.MaNV = kq.MaBSThucHien
                WHERE p.MaLK = ? ORDER BY p.ThoiDiemChiDinh, p.MaPCD""", maLK);
        for (Map<String, Object> p : ds) {
            p.put("ChiSo", p.get("MaKQ") == null ? List.of() : tv.ds("""
                    SELECT ms.TenChiSo, ms.DonVi, ms.GioiHanDuoi, ms.GioiHanTren, k.GiaTri, k.DanhGia
                    FROM KetQuaChiSo k JOIN MauChiSo ms ON ms.MaChiSo = k.MaChiSo
                    WHERE k.MaKQ = ? ORDER BY ms.ThuTu""", p.get("MaKQ")));
        }
        return ds;
    }

    /** Lượt khám phải của đúng bác sĩ; khoa = true thì khóa dòng để đổi trạng thái an toàn. */
    private Map<String, Object> luotCuaBacSi(Integer maLK, Integer maBS, boolean khoa) {
        Map<String, Object> lk = tv.mot("""
                SELECT MaLK, MaLichHen, MaBN, MaBS, NgayKham, TrangThai, TrieuChungSoBo, TrangThaiBHYT, MucHuong
                FROM LuotKham WHERE MaLK = ?""" + (khoa ? " FOR UPDATE" : ""), maLK);
        if (lk == null) {
            throw new KhongTimThay("Không tìm thấy lượt khám");
        }
        if (maBS == null || !maBS.equals(lk.get("MaBS"))) {
            throw new LoiQuyen("Bạn không phải bác sĩ điều trị của lượt khám này");
        }
        return lk;
    }

    private void ghiTruyCap(Integer maTK, Integer maHSBA, String thaoTac) {
        tv.capNhat("INSERT INTO NhatKyTruyCapHoSo (MaTK, MaHSBA, ThaoTac, ThoiGian) VALUES (?, ?, ?, ?)",
                maTK, maHSBA, thaoTac, dongHo.bayGio());
    }

    private static String rong(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
