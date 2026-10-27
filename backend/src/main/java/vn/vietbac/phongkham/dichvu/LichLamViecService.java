package vn.vietbac.phongkham.dichvu;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.kho.KhungGioRepository;
import vn.vietbac.phongkham.thucthe.KhungGio;

/**
 * Gói 4 – lịch làm việc: tạo ca (UC4.1), bác sĩ đăng ký ca (UC4.2), sinh khung giờ (UC4.3), duyệt đăng ký
 * (UC4.4), khóa/mở khung giờ, đổi phòng và hủy ca.
 */
@Service
public class LichLamViecService {

    /** Giờ làm của phòng khám: sáng 7h-11h30, chiều 13h30-17h, thứ 2 đến thứ 7. */
    public static final Map<String, LocalTime[]> GIO_CA = Map.of(
            "SANG", new LocalTime[] {LocalTime.of(7, 0), LocalTime.of(11, 30)},
            "CHIEU", new LocalTime[] {LocalTime.of(13, 30), LocalTime.of(17, 0)});
    private static final Map<String, String> TEN_CA = Map.of("SANG", "sáng", "CHIEU", "chiều");
    private static final int SO_NGAY_TOI_DA = 62;
    private static final List<String> LICH_CHUA_DEN = List.of("CHO_XAC_NHAN", "DA_XAC_NHAN");
    private static final List<String> LICH_DA_DEN = List.of("DA_CHECK_IN", "DANG_KHAM", "CHO_CLS", "DA_CO_KET_QUA",
            "HOAN_THANH");
    private static final DateTimeFormatter NGAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter GIO_NGAY = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final KhungGioRepository khungGioRepo;
    private final DatLichService datLich;
    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final TruyVan tv;
    private final DongHo dongHo;

    public LichLamViecService(KhungGioRepository khungGioRepo, DatLichService datLich, ThongBaoService thongBao, NhatKyService nhatKy, TruyVan tv, DongHo dongHo) {
        this.khungGioRepo = khungGioRepo;
        this.datLich = datLich;
        this.thongBao = thongBao;
        this.nhatKy = nhatKy;
        this.tv = tv;
        this.dongHo = dongHo;
    }

    // ================= Xem lịch =================

    /** Các ca trong khoảng ngày, kèm số khung giờ theo trạng thái để tô lịch tuần. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsCa(LocalDate tu, LocalDate den, Integer maBS, Integer maCK) {
        if (tu == null || den == null || den.isBefore(tu) || ChronoUnit.DAYS.between(tu, den) > SO_NGAY_TOI_DA) {
            throw new LoiNghiepVu("Khoảng ngày không hợp lệ (tối đa " + SO_NGAY_TOI_DA + " ngày)");
        }
        List<String> dk = new ArrayList<>(List.of("ca.NgayLam BETWEEN ? AND ?"));
        // Tham số đầu cho SoTrong: khung giờ đã qua không còn tính là trống
        List<Object> ts = new ArrayList<>(List.of(dongHo.bayGio(), tu, den));
        if (maBS != null) {
            dk.add("ca.MaBS = ?");
            ts.add(maBS);
        }
        if (maCK != null) {
            dk.add("bs.MaCK = ?");
            ts.add(maCK);
        }
        return tv.ds("""
                SELECT ca.MaCa, ca.MaBS, bs.HoTen AS BacSi, ck.MaCK, ck.TenCK, ca.NgayLam, ca.CaLam, ca.MaPhong,
                       p.MaSoPhong, p.TenPhong, ca.ThoiLuongKhungGio, ca.MaDK,
                       COUNT(kg.MaKG) AS TongKhung,
                       COALESCE(SUM(kg.TrangThai = 'TRONG' AND TIMESTAMP(kg.NgayKham, kg.GioBatDau) > ?), 0) AS SoTrong,
                       COALESCE(SUM(kg.TrangThai IN ('DA_DAT','DANG_GIU_CHO')), 0) AS SoDaDat,
                       COALESCE(SUM(kg.TrangThai = 'DA_KHOA'), 0) AS SoKhoa
                FROM CaLamViec ca JOIN NhanVien bs ON bs.MaNV = ca.MaBS JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                JOIN Phong p ON p.MaPhong = ca.MaPhong LEFT JOIN KhungGio kg ON kg.MaCa = ca.MaCa
                WHERE %s
                GROUP BY ca.MaCa ORDER BY ca.NgayLam, ca.CaLam, bs.HoTen""".formatted(String.join(" AND ", dk)),
                ts.toArray());
    }

    /** Một ca và các khung giờ của nó, khung đã đặt kèm tên bệnh nhân. */
    @Transactional(readOnly = true)
    public Map<String, Object> chiTietCa(Integer maCa) {
        Map<String, Object> ca = tv.mot("""
                SELECT ca.MaCa, ca.MaBS, bs.HoTen AS BacSi, ck.MaCK, ck.TenCK, ca.NgayLam, ca.CaLam, ca.MaPhong, p.MaSoPhong,
                       p.TenPhong, ca.ThoiLuongKhungGio, ca.MaDK
                FROM CaLamViec ca JOIN NhanVien bs ON bs.MaNV = ca.MaBS JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                JOIN Phong p ON p.MaPhong = ca.MaPhong WHERE ca.MaCa = ?""", maCa);
        if (ca == null) {
            throw new KhongTimThay("Không tìm thấy ca làm việc");
        }
        ca.put("KhungGio", tv.ds("""
                SELECT kg.MaKG, kg.GioBatDau, kg.GioKetThuc, kg.TrangThai, kg.LyDoKhoa,
                       COALESCE(nvk.HoTen, tk.Email) AS NguoiKhoa,
                       lk.MaLK, lk.MaLichHen, lk.TrangThai AS TrangThaiLichHen, bn.HoTen AS BenhNhan
                FROM KhungGio kg
                LEFT JOIN TaiKhoan tk ON tk.MaTK = kg.MaNguoiKhoa LEFT JOIN NhanVien nvk ON nvk.MaTK = tk.MaTK
                LEFT JOIN LuotKham lk ON lk.MaKG = kg.MaKG AND lk.TrangThai <> 'DA_HUY'
                LEFT JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                WHERE kg.MaCa = ? ORDER BY kg.GioBatDau""", maCa));
        return ca;
    }

    /** Chuyên khoa của nhân viên (null nếu không thuộc chuyên khoa nào). */
    @Transactional(readOnly = true)
    public Integer chuyenKhoaCua(Integer maNV) {
        return tv.giaTri("SELECT MaCK FROM NhanVien WHERE MaNV = ?", maNV);
    }

    /** Phòng khám bệnh đúng chuyên khoa của bác sĩ; có ngày và ca thì kèm bác sĩ đang dùng phòng lúc đó. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> phongChoBacSi(Integer maBS, LocalDate ngay, String caLam) {
        Map<String, Object> bs = bacSi(maBS);
        return tv.ds("""
                SELECT p.MaPhong, p.MaSoPhong, p.TenPhong,
                       (SELECT nv.HoTen FROM CaLamViec ca JOIN NhanVien nv ON nv.MaNV = ca.MaBS
                        WHERE ca.MaPhong = p.MaPhong AND ca.NgayLam = ? AND ca.CaLam = ?) AS BacSiDangDung
                FROM Phong p
                WHERE p.LoaiPhong = 'KHAM_BENH' AND p.TrangThai = 'HOAT_DONG' AND p.MaCK = ?
                ORDER BY p.MaSoPhong""", ngay, caLam, bs.get("MaCK"));
    }

    // ================= Tạo ca (UC4.1, UC4.3) =================

    public record YeuCauTaoCa(Integer maBS, Integer maPhong, List<String> caLam, LocalDate tuNgay, LocalDate denNgay,
                              List<Integer> thu, Integer thoiLuong) {
    }

    /**
     * Tạo ca cho một bác sĩ theo các thứ trong tuần trong khoảng ngày, mỗi ca sinh luôn khung giờ.
     * Ngày trùng ca của bác sĩ hoặc phòng đã có người thì bỏ qua và báo lại lý do.
     */
    @Transactional
    public Map<String, Object> taoCa(YeuCauTaoCa yc, Integer maTK) {
        Map<String, Object> bs = bacSi(yc.maBS());
        kiemTraPhong(yc.maPhong(), bs);
        int thoiLuong = thoiLuong(yc.thoiLuong());
        List<String> dsCa = yc.caLam() == null ? List.of() : yc.caLam().stream().distinct().toList();
        if (dsCa.isEmpty() || !GIO_CA.keySet().containsAll(dsCa)) {
            throw new LoiNghiepVu("Chọn ít nhất một ca (sáng hoặc chiều)");
        }
        List<Integer> thu = yc.thu() == null || yc.thu().isEmpty() ? List.of(1, 2, 3, 4, 5, 6) : yc.thu();
        if (thu.stream().anyMatch(t -> t < 1 || t > 6)) {
            throw new LoiNghiepVu("Phòng khám chỉ làm việc từ thứ 2 đến thứ 7");
        }
        LocalDate tu = yc.tuNgay();
        LocalDate den = yc.denNgay() == null ? tu : yc.denNgay();
        if (tu == null || den.isBefore(tu)) {
            throw new LoiNghiepVu("Khoảng ngày không hợp lệ");
        }
        if (tu.isBefore(dongHo.homNay())) {
            throw new LoiNghiepVu("Không tạo ca cho ngày đã qua");
        }
        if (ChronoUnit.DAYS.between(tu, den) > SO_NGAY_TOI_DA) {
            throw new LoiNghiepVu("Mỗi lần tạo tối đa " + SO_NGAY_TOI_DA + " ngày");
        }
        khoaBacSi(yc.maBS());

        List<Map<String, Object>> boQua = new ArrayList<>();
        int soCa = 0;
        int soKhung = 0;
        for (LocalDate ngay = tu; !ngay.isAfter(den); ngay = ngay.plusDays(1)) {
            if (!thu.contains(ngay.getDayOfWeek().getValue())) {
                continue;
            }
            for (String ca : dsCa) {
                String loi = lyDoKhongTaoDuoc(yc.maBS(), yc.maPhong(), ngay, ca);
                if (loi != null) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("ngay", ngay);
                    m.put("ca_lam", ca);
                    m.put("ly_do", loi);
                    boQua.add(m);
                    continue;
                }
                soKhung += taoMotCa(yc.maBS(), ngay, ca, yc.maPhong(), thoiLuong, null)[1];
                soCa++;
            }
        }
        if (soCa > 0) {
            String phong = tv.giaTri("SELECT MaSoPhong FROM Phong WHERE MaPhong = ?", yc.maPhong());
            String khoang = tu.equals(den) ? "ngày " + tu.format(NGAY) : "từ " + tu.format(NGAY) + " đến " + den.format(NGAY);
            nhatKy.ghi(maTK, "TAO_CA_LAM_VIEC", "NhanVien", yc.maBS(),
                    bs.get("HoTen") + ": " + soCa + " ca " + khoang + ", phòng " + phong + ", " + thoiLuong
                            + " phút/khung giờ");
            thongBao.nhanVien(yc.maBS(), "LICH_LAM_VIEC", "Lịch làm việc mới",
                    "Bạn được xếp " + soCa + " ca " + khoang + " tại phòng " + phong + ".", "CA_LAM_VIEC", null);
        }
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("so_ca", soCa);
        kq.put("so_khung_gio", soKhung);
        kq.put("bo_qua", boQua);
        return kq;
    }

    /** null nếu tạo được ca; ngược lại là lý do để báo cho người dùng. */
    private String lyDoKhongTaoDuoc(Integer maBS, Integer maPhong, LocalDate ngay, String ca) {
        if (ngay.getDayOfWeek() == DayOfWeek.SUNDAY) {
            return "Chủ nhật phòng khám nghỉ";
        }
        if (!LocalDateTime.of(ngay, GIO_CA.get(ca)[0]).isAfter(dongHo.bayGio())) {
            return "Ca đã bắt đầu";
        }
        if (tv.dem("SELECT COUNT(*) FROM CaLamViec WHERE MaBS = ? AND NgayLam = ? AND CaLam = ?", maBS, ngay, ca) > 0) {
            return "Bác sĩ đã có ca này";
        }
        String nguoiDung = tv.giaTri("""
                SELECT nv.HoTen FROM CaLamViec c JOIN NhanVien nv ON nv.MaNV = c.MaBS
                WHERE c.MaPhong = ? AND c.NgayLam = ? AND c.CaLam = ?""", maPhong, ngay, ca);
        return nguoiDung == null ? null : "Phòng đã xếp cho " + nguoiDung;
    }

    /** Tạo ca và sinh khung giờ đều nhau trong giờ của ca (UC4.3). Trả về [mã ca, số khung giờ]. */
    private int[] taoMotCa(Integer maBS, LocalDate ngay, String ca, Integer maPhong, int thoiLuong, Integer maDK) {
        tv.capNhat("""
                INSERT INTO CaLamViec (MaBS, NgayLam, CaLam, MaPhong, ThoiLuongKhungGio, MaDK, NgayTao)
                VALUES (?, ?, ?, ?, ?, ?, ?)""", maBS, ngay, ca, maPhong, thoiLuong, maDK, dongHo.bayGio());
        int maCa = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        LocalTime[] gio = GIO_CA.get(ca);
        List<String> dong = new ArrayList<>();
        List<Object> ts = new ArrayList<>();
        for (LocalTime t = gio[0]; !t.plusMinutes(thoiLuong).isAfter(gio[1]); t = t.plusMinutes(thoiLuong)) {
            dong.add("(?, ?, ?, ?)");
            ts.addAll(List.of(maCa, ngay, t, t.plusMinutes(thoiLuong)));
        }
        tv.capNhat("INSERT INTO KhungGio (MaCa, NgayKham, GioBatDau, GioKetThuc) VALUES " + String.join(", ", dong),
                ts.toArray());
        return new int[] {maCa, dong.size()};
    }

    // ================= Sửa, hủy ca =================

    /** Đổi phòng của ca chưa kết thúc; bệnh nhân đã đặt được báo phòng mới. */
    @Transactional
    public void doiPhong(Integer maCa, Integer maPhongMoi, Integer maTK) {
        Map<String, Object> ca = khoaCa(maCa);
        kiemTraChuaKetThuc(ca);
        Map<String, Object> bs = bacSi((Integer) ca.get("MaBS"));
        kiemTraPhong(maPhongMoi, bs);
        if (maPhongMoi.equals(ca.get("MaPhong"))) {
            return;
        }
        String nguoiDung = tv.giaTri("""
                SELECT nv.HoTen FROM CaLamViec c JOIN NhanVien nv ON nv.MaNV = c.MaBS
                WHERE c.MaPhong = ? AND c.NgayLam = ? AND c.CaLam = ?""", maPhongMoi, ca.get("NgayLam"), ca.get("CaLam"));
        if (nguoiDung != null) {
            throw new LoiNghiepVu("Phòng đã xếp cho " + nguoiDung + " trong ca này");
        }
        tv.capNhat("UPDATE CaLamViec SET MaPhong = ? WHERE MaCa = ?", maPhongMoi, maCa);
        Map<String, Object> p = tv.mot("SELECT MaSoPhong, TenPhong FROM Phong WHERE MaPhong = ?", maPhongMoi);
        String phong = p.get("MaSoPhong") + " – " + p.get("TenPhong");
        String moTaCa = moTaCa(ca);
        for (Map<String, Object> lk : lichHenCuaCa(maCa, LICH_CHUA_DEN)) {
            thongBao.benhNhan((Integer) lk.get("MaBN"), "LICH_HEN", "Lịch hẹn đổi phòng khám", "Lịch hẹn "
                            + lk.get("MaLichHen") + " lúc " + gioHen(lk) + " chuyển sang phòng " + phong + ".",
                    "LUOT_KHAM", (Integer) lk.get("MaLK"), "TIN_NHAN".equals(lk.get("KenhDat")));
        }
        thongBao.nhanVien((Integer) ca.get("MaBS"), "LICH_LAM_VIEC", "Đổi phòng làm việc",
                "Ca " + moTaCa + " chuyển sang phòng " + phong + ".", "CA_LAM_VIEC", maCa);
        nhatKy.ghi(maTK, "DOI_PHONG_CA_LAM_VIEC", "CaLamViec", maCa, ca.get("BacSi") + ", ca " + moTaCa + " sang phòng " + p.get("MaSoPhong"));
    }

    /**
     * Hủy ca (bác sĩ nghỉ): lịch hẹn chưa đến bị hủy kèm lý do và báo bệnh nhân, người đang được mời từ danh sách
     * chờ quay lại hàng chờ. Ca chưa từng có lịch hẹn thì xóa hẳn; đã có thì giữ lại để tra cứu và khóa mọi khung giờ.
     */
    @Transactional
    public Map<String, Object> huyCa(Integer maCa, String lyDo, Integer maTK) {
        if (lyDo == null || lyDo.isBlank()) {
            throw new LoiNghiepVu("Vui lòng nhập lý do hủy ca");
        }
        Map<String, Object> ca = khoaCa(maCa);
        kiemTraChuaKetThuc(ca);
        if (!lichHenCuaCa(maCa, LICH_DA_DEN).isEmpty()) {
            throw new LoiNghiepVu("Ca đã có bệnh nhân đến khám, không thể hủy");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        String moTaCa = moTaCa(ca);
        List<Map<String, Object>> dsLich = lichHenCuaCa(maCa, LICH_CHUA_DEN);
        for (Map<String, Object> lk : dsLich) {
            tv.capNhat("""
                    UPDATE LuotKham SET TrangThai = 'DA_HUY', LyDoHuy = ?, MaNguoiHuy = ?, ThoiDiemHuy = ?
                    WHERE MaLK = ?""", "Bác sĩ nghỉ: " + lyDo.strip(), maTK, bayGio, lk.get("MaLK"));
            thongBao.benhNhan((Integer) lk.get("MaBN"), "LICH_HEN", "Lịch hẹn bị hủy do bác sĩ nghỉ", "Lịch hẹn "
                            + lk.get("MaLichHen") + " lúc " + gioHen(lk) + " đã bị hủy. Lý do: " + lyDo.strip()
                            + ". Mong bạn thông cảm và đặt lại lịch khác.",
                    "LUOT_KHAM", (Integer) lk.get("MaLK"), "TIN_NHAN".equals(lk.get("KenhDat")));
        }
        // Lời mời giữ chỗ trên ca này: trả người được mời về hàng chờ, giữ nguyên vị trí
        tv.capNhat("""
                UPDATE DangKyCho d JOIN KhungGio kg ON kg.MaKG = d.MaKGDuocMoi
                SET d.TrangThai = 'DANG_CHO', d.MaKGDuocMoi = NULL, d.HanGiuCho = NULL
                WHERE kg.MaCa = ? AND d.TrangThai = 'DANG_DUOC_MOI'""", maCa);

        boolean xoa = tv.dem("""
                SELECT COUNT(*) FROM LuotKham lk JOIN KhungGio kg ON kg.MaKG = lk.MaKG WHERE kg.MaCa = ?""", maCa) == 0
                && tv.dem("""
                SELECT COUNT(*) FROM DangKyCho d JOIN KhungGio kg ON kg.MaKG = d.MaKGDuocMoi WHERE kg.MaCa = ?""", maCa) == 0;
        if (xoa) {
            tv.capNhat("DELETE FROM CaLamViec WHERE MaCa = ?", maCa);
        } else {
            tv.capNhat("""
                    UPDATE KhungGio SET TrangThai = 'DA_KHOA', LyDoKhoa = ?, MaNguoiKhoa = ? WHERE MaCa = ?""",
                    "Ca nghỉ: " + lyDo.strip(), maTK, maCa);
        }
        if (ca.get("MaDK") != null) {
            tv.capNhat("UPDATE DangKyCa SET TrangThai = 'DA_HUY' WHERE MaDK = ?", ca.get("MaDK"));
        }
        thongBao.nhanVien((Integer) ca.get("MaBS"), "LICH_LAM_VIEC", "Ca làm việc bị hủy",
                "Ca " + moTaCa + " đã hủy. Lý do: " + lyDo.strip() + ".", "CA_LAM_VIEC", xoa ? null : maCa);
        nhatKy.ghi(maTK, "HUY_CA_LAM_VIEC", "CaLamViec", maCa,
                "Ca " + moTaCa + " của " + ca.get("BacSi") + ", hủy " + dsLich.size() + " lịch hẹn. Lý do: " + lyDo.strip());
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("so_lich_huy", dsLich.size());
        kq.put("da_xoa", xoa);
        return kq;
    }

    // ================= Khóa, mở khung giờ =================

    /**
     * Khóa các khung giờ Trống chưa kết thúc (bác sĩ bận, họp...). Bác sĩ chỉ khóa được khung giờ của mình,
     * quản trị viên khóa được mọi khung giờ. Trả về số khung đã khóa.
     */
    @Transactional
    public int khoaKhungGio(List<Integer> dsMaKG, String lyDo, Integer maTK, Integer maBSGioiHan) {
        if (lyDo == null || lyDo.isBlank()) {
            throw new LoiNghiepVu("Vui lòng nhập lý do khóa");
        }
        int n = 0;
        for (KhungGio kg : khungGioDuocSua(dsMaKG, maBSGioiHan)) {
            if ("TRONG".equals(kg.getTrangThai())) {
                kg.setTrangThai("DA_KHOA");
                kg.setLyDoKhoa(lyDo.strip());
                kg.setMaNguoiKhoa(maTK);
                n++;
            }
        }
        if (n == 0) {
            throw new LoiNghiepVu("Không có khung giờ trống nào để khóa (khung đã đặt phải hủy lịch hẹn trước)");
        }
        return n;
    }

    /** Mở lại khung giờ đã khóa; khung vừa trống được mời cho người đầu danh sách chờ (UC13.9). */
    @Transactional
    public int moKhungGio(List<Integer> dsMaKG, Integer maBSGioiHan) {
        List<Integer> daMo = new ArrayList<>();
        for (KhungGio kg : khungGioDuocSua(dsMaKG, maBSGioiHan)) {
            if ("DA_KHOA".equals(kg.getTrangThai())) {
                kg.setTrangThai("TRONG");
                kg.setLyDoKhoa(null);
                kg.setMaNguoiKhoa(null);
                daMo.add(kg.getMaKG());
            }
        }
        if (daMo.isEmpty()) {
            throw new LoiNghiepVu("Không có khung giờ nào đang khóa");
        }
        daMo.forEach(datLich::phanBoDanhSachCho);
        return daMo.size();
    }

    private List<KhungGio> khungGioDuocSua(List<Integer> dsMaKG, Integer maBSGioiHan) {
        if (dsMaKG == null || dsMaKG.isEmpty()) {
            throw new LoiNghiepVu("Chọn ít nhất một khung giờ");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        List<KhungGio> kq = new ArrayList<>();
        for (Integer ma : dsMaKG.stream().distinct().sorted().toList()) {
            KhungGio kg = khungGioRepo.khoa(ma).orElseThrow(() -> new KhongTimThay("Không tìm thấy khung giờ"));
            if (maBSGioiHan != null && !maBSGioiHan.equals(
                    tv.giaTri("SELECT MaBS FROM CaLamViec WHERE MaCa = ?", kg.getMaCa()))) {
                throw new LoiQuyen("Bác sĩ chỉ được khóa, mở khung giờ trong ca của mình");
            }
            if (!kg.ketThuc().isAfter(bayGio)) {
                throw new LoiNghiepVu("Khung giờ " + kg.getGioBatDau() + " ngày " + kg.getNgayKham().format(NGAY)
                        + " đã qua");
            }
            kq.add(kg);
        }
        return kq;
    }

    // ================= Đăng ký ca (UC4.2, UC4.4) =================

    /** Bác sĩ đăng ký ca từ ngày mai trở đi; quản trị viên duyệt và xếp phòng. */
    @Transactional
    public Integer dangKyCa(Integer maBS, LocalDate ngay, String caLam, String ghiChu) {
        Map<String, Object> bs = bacSi(maBS);
        if (!GIO_CA.containsKey(caLam)) {
            throw new LoiNghiepVu("Chọn ca sáng hoặc ca chiều");
        }
        LocalDate homNay = dongHo.homNay();
        if (ngay == null || !ngay.isAfter(homNay) || ngay.isAfter(homNay.plusDays(SO_NGAY_TOI_DA))) {
            throw new LoiNghiepVu("Chỉ đăng ký ca từ ngày mai đến " + SO_NGAY_TOI_DA + " ngày tới");
        }
        if (ngay.getDayOfWeek() == DayOfWeek.SUNDAY) {
            throw new LoiNghiepVu("Chủ nhật phòng khám nghỉ");
        }
        khoaBacSi(maBS);
        if (tv.dem("SELECT COUNT(*) FROM CaLamViec WHERE MaBS = ? AND NgayLam = ? AND CaLam = ?", maBS, ngay, caLam) > 0) {
            throw new LoiNghiepVu("Bạn đã có ca này trong lịch làm việc");
        }
        if (tv.dem("""
                SELECT COUNT(*) FROM DangKyCa WHERE MaBS = ? AND NgayLam = ? AND CaLam = ? AND TrangThai = 'CHO_DUYET'""",
                maBS, ngay, caLam) > 0) {
            throw new LoiNghiepVu("Bạn đã đăng ký ca này, đang chờ duyệt");
        }
        String gc = ghiChu == null || ghiChu.isBlank() ? null : ghiChu.strip();
        if (gc != null && gc.length() > 255) {
            throw new LoiNghiepVu("Ghi chú tối đa 255 ký tự");
        }
        tv.capNhat("INSERT INTO DangKyCa (MaBS, NgayLam, CaLam, GhiChu, NgayTao) VALUES (?, ?, ?, ?, ?)",
                maBS, ngay, caLam, gc, dongHo.bayGio());
        Integer maDK = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        thongBao.vaiTro("QUAN_TRI", "LICH_LAM_VIEC", "Đăng ký ca mới chờ duyệt", bs.get("HoTen") + " đăng ký ca "
                + TEN_CA.get(caLam) + " " + DatLichService.ngay(ngay), "DANG_KY_CA", maDK);
        return maDK;
    }

    /** Đăng ký ca của một bác sĩ (maBS) hoặc của mọi bác sĩ, lọc theo trạng thái. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsDangKyCa(Integer maBS, List<String> trangThai) {
        List<String> dk = new ArrayList<>(List.of("1 = 1"));
        List<Object> ts = new ArrayList<>();
        if (maBS != null) {
            dk.add("dk.MaBS = ?");
            ts.add(maBS);
        }
        if (trangThai != null && !trangThai.isEmpty()) {
            dk.add("dk.TrangThai IN (?)");
            ts.add(trangThai);
        }
        // Đăng ký chờ duyệt xếp theo ngày làm gần nhất; đã xử lý xếp mới nhất trước
        return tv.ds("""
                SELECT dk.MaDK, dk.MaBS, bs.HoTen AS BacSi, ck.MaCK, ck.TenCK, dk.NgayLam, dk.CaLam, dk.GhiChu,
                       dk.TrangThai, dk.LyDoTuChoi, dk.NgayDuyet, nd.HoTen AS NguoiDuyet, dk.NgayTao,
                       ca.MaCa, p.MaSoPhong, p.TenPhong,
                       (SELECT COUNT(*) FROM CaLamViec c WHERE c.MaBS = dk.MaBS AND c.NgayLam = dk.NgayLam
                          AND c.CaLam = dk.CaLam AND (ca.MaCa IS NULL OR c.MaCa <> ca.MaCa)) AS DaCoCa
                FROM DangKyCa dk JOIN NhanVien bs ON bs.MaNV = dk.MaBS JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                LEFT JOIN NhanVien nd ON nd.MaNV = dk.MaNguoiDuyet
                LEFT JOIN CaLamViec ca ON ca.MaDK = dk.MaDK LEFT JOIN Phong p ON p.MaPhong = ca.MaPhong
                WHERE %s
                ORDER BY dk.TrangThai = 'CHO_DUYET' DESC,
                         CASE WHEN dk.TrangThai = 'CHO_DUYET' THEN dk.NgayLam END,
                         dk.NgayTao DESC, dk.MaDK DESC
                LIMIT 300""".formatted(String.join(" AND ", dk)), ts.toArray());
    }

    @Transactional(readOnly = true)
    public long soDangKyChoDuyet() {
        return tv.dem("SELECT COUNT(*) FROM DangKyCa WHERE TrangThai = 'CHO_DUYET' AND NgayLam >= ?", dongHo.homNay());
    }

    /** Bác sĩ rút đăng ký chưa được duyệt. */
    @Transactional
    public void huyDangKyCa(Integer maDK, Integer maBS) {
        int n = tv.capNhat("UPDATE DangKyCa SET TrangThai = 'DA_HUY' WHERE MaDK = ? AND MaBS = ? AND TrangThai = 'CHO_DUYET'",
                maDK, maBS);
        if (n == 0) {
            throw new LoiNghiepVu("Đăng ký không còn ở trạng thái chờ duyệt");
        }
    }

    /** UC4.4 duyệt: xếp phòng, tạo ca và sinh khung giờ. */
    @Transactional
    public Integer duyetDangKyCa(Integer maDK, Integer maPhong, Integer thoiLuong, Integer maNVDuyet, Integer maTK) {
        Map<String, Object> dk = khoaDangKy(maDK);
        Integer maBS = (Integer) dk.get("MaBS");
        LocalDate ngay = (LocalDate) dk.get("NgayLam");
        String ca = (String) dk.get("CaLam");
        Map<String, Object> bs = bacSi(maBS);
        kiemTraPhong(maPhong, bs);
        khoaBacSi(maBS);
        String loi = lyDoKhongTaoDuoc(maBS, maPhong, ngay, ca);
        if (loi != null) {
            throw new LoiNghiepVu(loi);
        }
        int[] kq = taoMotCa(maBS, ngay, ca, maPhong, thoiLuong(thoiLuong), maDK);
        tv.capNhat("UPDATE DangKyCa SET TrangThai = 'DA_DUYET', MaNguoiDuyet = ?, NgayDuyet = ? WHERE MaDK = ?",
                maNVDuyet, dongHo.bayGio(), maDK);
        String phong = tv.giaTri("SELECT MaSoPhong FROM Phong WHERE MaPhong = ?", maPhong);
        thongBao.nhanVien(maBS, "LICH_LAM_VIEC", "Đăng ký ca đã được duyệt", "Ca " + TEN_CA.get(ca) + " "
                + DatLichService.ngay(ngay) + " tại phòng " + phong + " đã được duyệt.", "CA_LAM_VIEC", kq[0]);
        nhatKy.ghi(maTK, "DUYET_DANG_KY_CA", "DangKyCa", maDK, bs.get("HoTen") + ", ca " + TEN_CA.get(ca) + " "
                + DatLichService.ngay(ngay) + ", phòng " + phong);
        return kq[0];
    }

    /** UC4.4 từ chối: bắt buộc lý do, báo lại cho bác sĩ. */
    @Transactional
    public void tuChoiDangKyCa(Integer maDK, String lyDo, Integer maNVDuyet, Integer maTK) {
        if (lyDo == null || lyDo.isBlank()) {
            throw new LoiNghiepVu("Vui lòng nhập lý do từ chối");
        }
        Map<String, Object> dk = khoaDangKy(maDK);
        tv.capNhat("""
                UPDATE DangKyCa SET TrangThai = 'TU_CHOI', LyDoTuChoi = ?, MaNguoiDuyet = ?, NgayDuyet = ?
                WHERE MaDK = ?""", lyDo.strip(), maNVDuyet, dongHo.bayGio(), maDK);
        String ca = TEN_CA.get(dk.get("CaLam")) + " " + DatLichService.ngay((LocalDate) dk.get("NgayLam"));
        thongBao.nhanVien((Integer) dk.get("MaBS"), "LICH_LAM_VIEC", "Đăng ký ca bị từ chối",
                "Đăng ký ca " + ca + " bị từ chối. Lý do: " + lyDo.strip(), "DANG_KY_CA", maDK);
        nhatKy.ghi(maTK, "TU_CHOI_DANG_KY_CA", "DangKyCa", maDK, tv.giaTri("SELECT HoTen FROM NhanVien WHERE MaNV = ?",
                dk.get("MaBS")) + ", ca " + ca + ". Lý do: " + lyDo.strip());
    }

    // ================= Hàm phụ =================

    /** Bác sĩ lâm sàng đang hoạt động (ca làm việc chỉ dành cho bác sĩ khám bệnh). */
    private Map<String, Object> bacSi(Integer maBS) {
        Map<String, Object> bs = maBS == null ? null : tv.mot(
                "SELECT MaNV, HoTen, MaCK, LoaiNhanVien, TrangThai FROM NhanVien WHERE MaNV = ?", maBS);
        if (bs == null || !"BAC_SI".equals(bs.get("LoaiNhanVien"))) {
            throw new LoiNghiepVu("Chỉ xếp ca cho bác sĩ khám bệnh");
        }
        if (!"HOAT_DONG".equals(bs.get("TrangThai"))) {
            throw new LoiNghiepVu("Bác sĩ đã ngừng hoạt động");
        }
        return bs;
    }

    /** Phòng khám bệnh còn hoạt động, đúng chuyên khoa của bác sĩ. */
    private void kiemTraPhong(Integer maPhong, Map<String, Object> bs) {
        Map<String, Object> p = maPhong == null ? null
                : tv.mot("SELECT LoaiPhong, MaCK, TrangThai FROM Phong WHERE MaPhong = ?", maPhong);
        if (p == null || !"KHAM_BENH".equals(p.get("LoaiPhong")) || !"HOAT_DONG".equals(p.get("TrangThai"))) {
            throw new LoiNghiepVu("Chọn phòng khám bệnh đang hoạt động");
        }
        if (!bs.get("MaCK").equals(p.get("MaCK"))) {
            throw new LoiNghiepVu("Phòng không thuộc chuyên khoa của bác sĩ");
        }
    }

    private static int thoiLuong(Integer t) {
        int v = t == null ? 15 : t;
        if (v < 5 || v > 60 || v % 5 != 0) {
            throw new LoiNghiepVu("Thời lượng khung giờ từ 5 đến 60 phút, theo bước 5 phút");
        }
        return v;
    }

    /** Khóa dòng bác sĩ để hai người không tạo trùng ca cho cùng bác sĩ cùng lúc. */
    private void khoaBacSi(Integer maBS) {
        tv.mot("SELECT MaNV FROM NhanVien WHERE MaNV = ? FOR UPDATE", maBS);
    }

    private Map<String, Object> khoaCa(Integer maCa) {
        Map<String, Object> ca = tv.mot("""
                SELECT ca.MaCa, ca.MaBS, nv.HoTen AS BacSi, ca.NgayLam, ca.CaLam, ca.MaPhong, ca.MaDK
                FROM CaLamViec ca JOIN NhanVien nv ON nv.MaNV = ca.MaBS WHERE ca.MaCa = ? FOR UPDATE""", maCa);
        if (ca == null) {
            throw new KhongTimThay("Không tìm thấy ca làm việc");
        }
        return ca;
    }

    private Map<String, Object> khoaDangKy(Integer maDK) {
        Map<String, Object> dk = tv.mot("SELECT MaDK, MaBS, NgayLam, CaLam, TrangThai FROM DangKyCa WHERE MaDK = ? FOR UPDATE",
                maDK);
        if (dk == null) {
            throw new KhongTimThay("Không tìm thấy đăng ký ca");
        }
        if (!"CHO_DUYET".equals(dk.get("TrangThai"))) {
            throw new LoiNghiepVu("Đăng ký đã được xử lý hoặc bác sĩ đã rút");
        }
        if (((LocalDate) dk.get("NgayLam")).isBefore(dongHo.homNay())) {
            throw new LoiNghiepVu("Ngày đăng ký đã qua");
        }
        return dk;
    }

    private void kiemTraChuaKetThuc(Map<String, Object> ca) {
        LocalDateTime ketThuc = LocalDateTime.of((LocalDate) ca.get("NgayLam"), GIO_CA.get((String) ca.get("CaLam"))[1]);
        if (!ketThuc.isAfter(dongHo.bayGio())) {
            throw new LoiNghiepVu("Ca đã kết thúc, không thể thay đổi");
        }
    }

    private List<Map<String, Object>> lichHenCuaCa(Integer maCa, List<String> trangThai) {
        return tv.ds("""
                SELECT lk.MaLK, lk.MaBN, lk.MaLichHen, lk.KenhDat, kg.NgayKham, kg.GioBatDau
                FROM LuotKham lk JOIN KhungGio kg ON kg.MaKG = lk.MaKG
                WHERE kg.MaCa = ? AND lk.TrangThai IN (?) FOR UPDATE""", maCa, trangThai);
    }

    private static String gioHen(Map<String, Object> lk) {
        return LocalDateTime.of((LocalDate) lk.get("NgayKham"), LocalTime.parse((String) lk.get("GioBatDau")))
                .format(GIO_NGAY);
    }

    private static String moTaCa(Map<String, Object> ca) {
        return TEN_CA.get(ca.get("CaLam")) + " " + DatLichService.ngay((LocalDate) ca.get("NgayLam"));
    }
}
