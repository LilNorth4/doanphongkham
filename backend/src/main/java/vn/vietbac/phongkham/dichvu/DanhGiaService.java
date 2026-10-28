package vn.vietbac.phongkham.dichvu;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import tools.jackson.databind.ObjectMapper;

import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LuuAnh;
import vn.vietbac.phongkham.chung.PhanTichCamXuc;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Gói 12 – đánh giá sau khám (UC12.1, BR24): mỗi lượt khám đã thanh toán được đánh giá một lần trong 7 ngày,
 * gồm điểm bác sĩ và 6 tiêu chí dịch vụ (bỏ qua được tiêu chí không dùng). Kèm lời mời đánh giá tự động
 * (UC15.10), phân tích cảm xúc, chủ đề (UC15.8) và báo cáo đánh giá cho quản trị viên (UC13.3).
 */
@Service
public class DanhGiaService {

    public static final int HAN_NGAY = 7;
    private static final int GIO_MOI = 2;
    private static final int SO_ANH_TOI_DA = 3;
    private static final int TOI_THIEU_TONG_HOP = 5;

    /** Cột điểm dịch vụ (BR24) và tên hiển thị, theo thứ tự trên biểu mẫu. */
    public static final Map<String, String> TIEU_CHI = new LinkedHashMap<>();

    static {
        TIEU_CHI.put("DiemThoiGianCho", "Thời gian chờ");
        TIEU_CHI.put("DiemThuTucTiepDon", "Thủ tục tiếp đón");
        TIEU_CHI.put("DiemThaiDoNhanVien", "Thái độ nhân viên");
        TIEU_CHI.put("DiemCoSoVatChat", "Cơ sở vật chất");
        TIEU_CHI.put("DiemDichVuCLS", "Dịch vụ cận lâm sàng");
        TIEU_CHI.put("DiemChiPhi", "Chi phí");
    }

    private static final Map<String, String> TEN_CHU_DE = Map.of("THOI_GIAN_CHO", "thời gian chờ", "THAI_DO", "thái độ phục vụ",
            "CHUYEN_MON", "chuyên môn", "CO_SO_VAT_CHAT", "cơ sở vật chất", "CHI_PHI", "chi phí", "THU_TUC", "thủ tục");

    public record DanhGiaNhap(Integer diemBacSi, String nhanXetBacSi, Map<String, Integer> diemDichVu, String nhanXetDichVu) {
    }

    /** Điểm một nhân viên (lễ tân, bác sĩ) trong đánh giá tự do. */
    public record DiemNhanVien(Integer maNV, Integer diem, String nhanXet) {
    }

    /** Đánh giá tự do: tiêu chí dịch vụ, điểm từng nhân viên, góp ý; mục nào bỏ trống cũng được. */
    public record DanhGiaTuDo(Map<String, Integer> diemDichVu, List<DiemNhanVien> nhanVien, String gopY) {
    }

    /** Loại nhân viên bệnh nhân được đánh giá và tên nhóm hiển thị. */
    public static final Map<String, String> NHOM_NHAN_VIEN = new LinkedHashMap<>();

    static {
        NHOM_NHAN_VIEN.put("LE_TAN", "Lễ tân");
        NHOM_NHAN_VIEN.put("BAC_SI", "Bác sĩ khám bệnh");
        NHOM_NHAN_VIEN.put("BS_XET_NGHIEM", "Bác sĩ xét nghiệm");
        NHOM_NHAN_VIEN.put("BS_CDHA", "Bác sĩ chẩn đoán hình ảnh");
        NHOM_NHAN_VIEN.put("BS_NOI_SOI", "Bác sĩ nội soi");
    }

    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final LuuAnh luuAnh;
    private final TruyVan tv;
    private final DongHo dongHo;
    private final ObjectMapper json;

    public DanhGiaService(ThongBaoService thongBao, NhatKyService nhatKy, LuuAnh luuAnh, TruyVan tv, DongHo dongHo, ObjectMapper json) {
        this.thongBao = thongBao;
        this.nhatKy = nhatKy;
        this.luuAnh = luuAnh;
        this.tv = tv;
        this.dongHo = dongHo;
        this.json = json;
    }

    // ================= Bệnh nhân =================

    /** Lượt khám còn chờ đánh giá (đã thanh toán, trong hạn 7 ngày, chưa đánh giá) và các đánh giá đã gửi. */
    @Transactional(readOnly = true)
    public Map<String, Object> cuaBenhNhan(Integer maBN) {
        if (maBN == null) {
            throw new KhongTimThay("Tài khoản chưa có hồ sơ");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        List<Map<String, Object>> cho = tv.ds("""
                SELECT lk.MaLK, lk.MaLichHen, lk.NgayKham, bs.HoTen AS BacSi, bs.HocHamHocVi, ck.TenCK, hd.NgayThanhToan,
                       DATE_ADD(hd.NgayThanhToan, INTERVAL 7 DAY) AS HanDanhGia
                FROM LuotKham lk JOIN HoaDon hd ON hd.MaLK = lk.MaLK AND hd.TrangThai = 'DA_THANH_TOAN'
                JOIN NhanVien bs ON bs.MaNV = lk.MaBS LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                WHERE lk.MaBN = ? AND lk.TrangThai = 'HOAN_THANH' AND hd.NgayThanhToan > ?
                  AND NOT EXISTS (SELECT 1 FROM DanhGia dg WHERE dg.MaLK = lk.MaLK)
                ORDER BY hd.NgayThanhToan""", maBN, bayGio.minusDays(HAN_NGAY));
        List<Map<String, Object>> daGui = tv.ds("""
                SELECT dg.*, lk.MaLichHen, lk.NgayKham, bs.HoTen AS BacSi, ck.TenCK
                FROM DanhGia dg LEFT JOIN LuotKham lk ON lk.MaLK = dg.MaLK LEFT JOIN NhanVien bs ON bs.MaNV = dg.MaBS
                LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                WHERE dg.MaBN = ? ORDER BY dg.ThoiGian DESC""", maBN);
        daGui.forEach(this::kemAnh);
        return Map.of("ChoDanhGia", cho, "DaDanhGia", daGui);
    }

    /** Thông tin biểu mẫu của một lượt khám (UC12.1 bước 2): còn đánh giá được hay không và vì sao. */
    @Transactional(readOnly = true)
    public Map<String, Object> bieuMau(Integer maLK, Integer maBN) {
        Map<String, Object> lk = luot(maLK, maBN);
        Map<String, Object> dg = tv.mot("SELECT * FROM DanhGia WHERE MaLK = ?", maLK);
        if (dg != null) {
            kemAnh(dg);
        }
        lk.put("DanhGia", dg);
        lk.put("LyDoKhongDuoc", lyDoKhongDuoc(lk, dg));
        lk.put("TieuChi", TIEU_CHI);
        return lk;
    }

    @Transactional
    public Map<String, Object> gui(Integer maLK, Integer maBN, Integer maTK, DanhGiaNhap b, List<MultipartFile> anh) {
        if (b == null) {
            throw new LoiNghiepVu("Thiếu nội dung đánh giá");
        }
        Map<String, Object> lk = luot(maLK, maBN);
        String khong = lyDoKhongDuoc(lk, tv.mot("SELECT MaDG FROM DanhGia WHERE MaLK = ?", maLK));
        if (khong != null) {
            throw new LoiNghiepVu(khong);
        }
        if (b.diemBacSi() == null) {
            throw new LoiNghiepVu("Vui lòng chấm điểm bác sĩ");
        }
        diem(b.diemBacSi(), "bác sĩ");
        Map<String, Integer> dv = b.diemDichVu() == null ? Map.of() : b.diemDichVu();
        for (Map.Entry<String, Integer> e : dv.entrySet()) {
            if (!TIEU_CHI.containsKey(e.getKey())) {
                throw new LoiNghiepVu("Tiêu chí đánh giá không hợp lệ: " + e.getKey());
            }
            if (e.getValue() != null) {
                diem(e.getValue(), TIEU_CHI.get(e.getKey()).toLowerCase(Locale.ROOT));
            }
        }
        // Tiêu chí dịch vụ không bắt buộc: bệnh nhân có thể chỉ chấm bác sĩ
        String nxBS = vanBan(b.nhanXetBacSi(), "Nhận xét về bác sĩ"), nxDV = vanBan(b.nhanXetDichVu(), "Nhận xét về dịch vụ");
        List<MultipartFile> tep = anh == null ? List.of() : anh.stream().filter(t -> t != null && !t.isEmpty()).toList();
        if (tep.size() > SO_ANH_TOI_DA) {
            throw new LoiNghiepVu("Đính kèm tối đa " + SO_ANH_TOI_DA + " ảnh");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        // MaBN, MaBS do trigger trg_DanhGia_bi điền từ lượt khám (đồng thời chặn lại BR24 ở tầng CSDL)
        tv.capNhat("""
                INSERT INTO DanhGia (MaLK, MaBN, MaBS, DiemBacSi, NhanXetBacSi, DiemThoiGianCho, DiemThuTucTiepDon,
                                     DiemThaiDoNhanVien, DiemCoSoVatChat, DiemDichVuCLS, DiemChiPhi, NhanXetDichVu, ThoiGian)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                maLK, maBN, lk.get("MaBS"), b.diemBacSi(), nxBS, dv.get("DiemThoiGianCho"), dv.get("DiemThuTucTiepDon"),
                dv.get("DiemThaiDoNhanVien"), dv.get("DiemCoSoVatChat"), dv.get("DiemDichVuCLS"), dv.get("DiemChiPhi"), nxDV,
                bayGio);
        Integer maDG = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        for (MultipartFile t : tep) {
            String duongDan = luuAnh.luu(t, "danh-gia", "dg" + maDG, 2L * 1024 * 1024, Set.of("jpg", "png"));
            tv.capNhat("""
                    INSERT INTO TepDinhKem (DuongDan, TenTep, LoaiTep, KichThuoc, MaDG, MaNguoiTaiLen, ThoiGian)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""", duongDan, tenTep(t, duongDan),
                    duongDan.substring(duongDan.lastIndexOf('.') + 1).toUpperCase(Locale.ROOT), t.getSize(), maDG, maTK, bayGio);
        }
        capNhatDiemBacSi((Integer) lk.get("MaBS"));
        nhatKy.ghi(maTK, "GUI_DANH_GIA", "DanhGia", maDG, lk.get("MaLichHen") + ": bác sĩ " + b.diemBacSi() + " sao");
        return Map.of("ma_dg", maDG);
    }

    // ================= Đánh giá tự do (không cần sau khám) =================

    /** Biểu mẫu đánh giá tự do: tiêu chí dịch vụ và danh sách lễ tân, bác sĩ đang làm việc theo nhóm. */
    @Transactional(readOnly = true)
    public Map<String, Object> bieuMauTuDo() {
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("TieuChi", TIEU_CHI);
        kq.put("NhomNhanVien", NHOM_NHAN_VIEN);
        kq.put("NhanVien", tv.ds("""
                SELECT nv.MaNV, nv.HoTen, nv.LoaiNhanVien, nv.HocHamHocVi, nv.AnhDaiDien, nv.DiemDanhGiaTB, nv.SoLuotDanhGia,
                       ck.TenCK, p.MaSoPhong
                FROM NhanVien nv JOIN TaiKhoan tk ON tk.MaTK = nv.MaTK LEFT JOIN ChuyenKhoa ck ON ck.MaCK = nv.MaCK
                LEFT JOIN Phong p ON p.MaPhong = nv.MaPhongPhuTrach
                WHERE nv.TrangThai = 'HOAT_DONG' AND tk.TrangThai = 'HOAT_DONG' AND nv.LoaiNhanVien IN (?)
                ORDER BY FIELD(nv.LoaiNhanVien, 'LE_TAN', 'BAC_SI', 'BS_XET_NGHIEM', 'BS_CDHA', 'BS_NOI_SOI'), ck.MaCK, nv.HoTen""",
                new ArrayList<>(NHOM_NHAN_VIEN.keySet())));
        return kq;
    }

    /**
     * Gửi đánh giá tự do bất kỳ lúc nào: chấm tiêu chí dịch vụ (cơ sở vật chất, thời gian chờ...), chấm lễ tân, bác sĩ
     * nào cũng được (không bắt buộc chấm hết) và viết góp ý. Phải có ít nhất một mục; mỗi ngày gửi một lần để tránh spam.
     */
    @Transactional
    public Map<String, Object> guiTuDo(Integer maBN, Integer maTK, DanhGiaTuDo b) {
        if (maBN == null) {
            throw new KhongTimThay("Tài khoản chưa có hồ sơ");
        }
        Map<String, Integer> dv = b == null || b.diemDichVu() == null ? Map.of() : b.diemDichVu();
        for (Map.Entry<String, Integer> e : dv.entrySet()) {
            if (!TIEU_CHI.containsKey(e.getKey())) {
                throw new LoiNghiepVu("Tiêu chí đánh giá không hợp lệ: " + e.getKey());
            }
            if (e.getValue() != null) {
                diem(e.getValue(), TIEU_CHI.get(e.getKey()).toLowerCase(Locale.ROOT));
            }
        }
        List<DiemNhanVien> nv = new ArrayList<>();
        java.util.Set<Integer> daCham = new java.util.HashSet<>();
        for (DiemNhanVien d : b == null || b.nhanVien() == null ? List.<DiemNhanVien>of() : b.nhanVien()) {
            if (d == null || d.maNV() == null || d.diem() == null) {
                continue;
            }
            String ten = tv.giaTri("SELECT HoTen FROM NhanVien WHERE MaNV = ? AND TrangThai = 'HOAT_DONG' AND LoaiNhanVien IN (?)",
                    d.maNV(), new ArrayList<>(NHOM_NHAN_VIEN.keySet()));
            if (ten == null) {
                throw new LoiNghiepVu("Nhân viên được đánh giá không hợp lệ");
            }
            if (!daCham.add(d.maNV())) {
                throw new LoiNghiepVu("Mỗi nhân viên chỉ chấm một lần trong một đánh giá");
            }
            diem(d.diem(), ten);
            String nx = d.nhanXet() == null || d.nhanXet().isBlank() ? null : d.nhanXet().strip();
            if (nx != null && nx.length() > 500) {
                throw new LoiNghiepVu("Nhận xét về " + ten + " tối đa 500 ký tự");
            }
            nv.add(new DiemNhanVien(d.maNV(), d.diem(), nx));
        }
        String gopY = vanBan(b == null ? null : b.gopY(), "Góp ý");
        if (dv.values().stream().allMatch(java.util.Objects::isNull) && nv.isEmpty() && gopY == null) {
            throw new LoiNghiepVu("Hãy chấm ít nhất một mục, một nhân viên hoặc viết góp ý");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        if (tv.dem("SELECT COUNT(*) FROM DanhGia WHERE MaBN = ? AND LoaiDanhGia = 'TU_DO' AND ThoiGian > ?",
                maBN, bayGio.minusDays(1)) > 0) {
            throw new LoiNghiepVu("Bạn đã gửi đánh giá trong 24 giờ qua, vui lòng gửi lại sau");
        }
        tv.capNhat("""
                INSERT INTO DanhGia (LoaiDanhGia, MaBN, DiemThoiGianCho, DiemThuTucTiepDon, DiemThaiDoNhanVien, DiemCoSoVatChat,
                                     DiemDichVuCLS, DiemChiPhi, NhanXetDichVu, ThoiGian)
                VALUES ('TU_DO', ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                maBN, dv.get("DiemThoiGianCho"), dv.get("DiemThuTucTiepDon"), dv.get("DiemThaiDoNhanVien"),
                dv.get("DiemCoSoVatChat"), dv.get("DiemDichVuCLS"), dv.get("DiemChiPhi"), gopY, bayGio);
        Integer maDG = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        for (DiemNhanVien d : nv) {
            tv.capNhat("INSERT INTO DanhGiaNhanVien (MaDG, MaNV, Diem, NhanXet) VALUES (?, ?, ?, ?)",
                    maDG, d.maNV(), d.diem(), d.nhanXet());
            capNhatDiemBacSi(d.maNV());
        }
        nhatKy.ghi(maTK, "GUI_DANH_GIA", "DanhGia", maDG, "Đánh giá tự do: " + nv.size() + " nhân viên"
                + (gopY != null ? ", có góp ý" : ""));
        return Map.of("ma_dg", maDG);
    }

    // ================= Tác vụ định kỳ =================

    /**
     * UC15.10: lượt khám có hóa đơn đã thanh toán đủ 2 giờ và chưa được mời thì gửi lời mời kèm liên kết biểu mẫu.
     * Bệnh nhân chưa có tài khoản, lượt đã hết hạn đánh giá hoặc đã đánh giá chỉ được đánh dấu đã xử lý.
     */
    @Transactional
    public int guiLoiMoi() {
        LocalDateTime bayGio = dongHo.bayGio();
        int da = 0;
        for (Map<String, Object> r : tv.ds("""
                SELECT lk.MaLK, lk.MaBN, lk.MaLichHen, lk.NgayKham, bs.HoTen AS BacSi, bn.MaTK, hd.NgayThanhToan,
                       EXISTS (SELECT 1 FROM DanhGia dg WHERE dg.MaLK = lk.MaLK) AS DaDanhGia
                FROM LuotKham lk JOIN HoaDon hd ON hd.MaLK = lk.MaLK AND hd.TrangThai = 'DA_THANH_TOAN'
                JOIN NhanVien bs ON bs.MaNV = lk.MaBS JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                WHERE lk.DaGuiLoiMoiDanhGia = FALSE AND lk.TrangThai = 'HOAN_THANH' AND hd.NgayThanhToan <= ?""",
                bayGio.minusHours(GIO_MOI))) {
            Integer maLK = (Integer) r.get("MaLK");
            LocalDateTime tt = (LocalDateTime) r.get("NgayThanhToan");
            boolean conHan = tt.plusDays(HAN_NGAY).isAfter(bayGio) && ((Number) r.get("DaDanhGia")).intValue() == 0;
            if (conHan && r.get("MaTK") != null) {
                thongBao.benhNhan((Integer) r.get("MaBN"), "MOI_DANH_GIA", "Mời đánh giá lượt khám",
                        "Cảm ơn bạn đã khám cùng " + r.get("BacSi") + " (" + r.get("MaLichHen")
                                + "). Mời bạn dành một phút đánh giá trước " + ngayGio(tt.plusDays(HAN_NGAY)) + ".",
                        "DANH_GIA", maLK, false);
                da++;
            }
            tv.capNhat("UPDATE LuotKham SET DaGuiLoiMoiDanhGia = TRUE WHERE MaLK = ?", maLK);
        }
        return da;
    }

    /**
     * UC15.8: phân tích các đánh giá và phiếu góp ý chưa phân tích (luật thay cho LLM, xem PhanTichCamXuc).
     * Nội dung tiêu cực mức nghiêm trọng cao được báo cho quản trị viên.
     */
    @Transactional
    public int phanTich() {
        int n = 0;
        for (Map<String, Object> d : tv.ds("SELECT * FROM DanhGia WHERE TrangThaiPhanTich = 'CHUA_PHAN_TICH'")) {
            List<Integer> sao = new ArrayList<>();
            if (d.get("DiemBacSi") != null) {
                sao.add(((Number) d.get("DiemBacSi")).intValue());
            }
            TIEU_CHI.keySet().forEach(c -> {
                if (d.get(c) != null) {
                    sao.add(((Number) d.get(c)).intValue());
                }
            });
            Double tb = sao.isEmpty() ? null : sao.stream().mapToInt(Integer::intValue).average().orElse(3);
            String vb = String.join(". ", chuoi(d.get("NhanXetBacSi")), chuoi(d.get("NhanXetDichVu"))).strip();
            PhanTichCamXuc.KetQua kq = PhanTichCamXuc.phanTich(vb, tb, null);
            List<String> chuDe = new ArrayList<>(kq.chuDe());
            // Tiêu chí bị chấm thấp (≤ 2) hoặc rất cao (5) cũng là chủ đề được nhắc tới
            themChuDeTheoDiem(d, chuDe);
            tv.capNhat("""
                    UPDATE DanhGia SET TrangThaiPhanTich = 'DA_PHAN_TICH', CamXuc = ?, ChuDe = CAST(? AS JSON), MucDoNghiemTrong = ?
                    WHERE MaDG = ?""", kq.camXuc(), viet(chuDe), kq.mucDo(), d.get("MaDG"));
            if ("CAO".equals(kq.mucDo())) {
                Map<String, Object> lk = d.get("MaLK") == null ? null : tv.mot("""
                        SELECT lk.MaLichHen, bs.HoTen FROM LuotKham lk JOIN NhanVien bs ON bs.MaNV = lk.MaBS WHERE lk.MaLK = ?""",
                        d.get("MaLK"));
                thongBao.vaiTro("QUAN_TRI", "CANH_BAO", "Đánh giá tiêu cực mức cao",
                        (lk == null ? "Đánh giá tự do" : "Lượt " + lk.get("MaLichHen") + " (" + lk.get("HoTen") + ")") + ": "
                                + tomTat(vb), "DANH_GIA_BAO_CAO", (Integer) d.get("MaDG"));
            }
            n++;
        }
        for (Map<String, Object> g : tv.ds("SELECT * FROM PhieuGopY WHERE TrangThaiPhanTich = 'CHUA_PHAN_TICH'")) {
            PhanTichCamXuc.KetQua kq = PhanTichCamXuc.phanTich(g.get("ChuDe") + ". " + g.get("NoiDung"), null,
                    "KHIEU_NAI".equals(g.get("Loai")) ? "TIEU_CUC" : null);
            tv.capNhat("""
                    UPDATE PhieuGopY SET TrangThaiPhanTich = 'DA_PHAN_TICH', CamXuc = ?, MucDoNghiemTrong = ? WHERE MaPhieu = ?""",
                    kq.camXuc(), kq.mucDo(), g.get("MaPhieu"));
            if ("CAO".equals(kq.mucDo())) {
                thongBao.vaiTro("QUAN_TRI", "CANH_BAO", "Phiếu " + g.get("MaSoPhieu") + " nghiêm trọng mức cao",
                        g.get("ChuDe") + ": " + tomTat(chuoi(g.get("NoiDung"))), "PHIEU_GOP_Y", (Integer) g.get("MaPhieu"));
            }
            n++;
        }
        return n;
    }

    // ================= Báo cáo đánh giá (UC13.3) =================

    @Transactional(readOnly = true)
    public Map<String, Object> baoCao(LocalDate tu, LocalDate den, Integer maCK, Integer maBS) {
        List<Object> ts = new ArrayList<>();
        String dk = dieuKien(tu, den, maCK, maBS, ts);
        Map<String, Object> kq = new LinkedHashMap<>();
        Map<String, Object> tong = tv.mot("""
                SELECT COUNT(*) AS SoDanhGia, ROUND(AVG(dg.DiemBacSi), 2) AS DiemBacSi,
                       ROUND(AVG(dg.DiemThoiGianCho), 2) AS DiemThoiGianCho, ROUND(AVG(dg.DiemThuTucTiepDon), 2) AS DiemThuTucTiepDon,
                       ROUND(AVG(dg.DiemThaiDoNhanVien), 2) AS DiemThaiDoNhanVien, ROUND(AVG(dg.DiemCoSoVatChat), 2) AS DiemCoSoVatChat,
                       ROUND(AVG(dg.DiemDichVuCLS), 2) AS DiemDichVuCLS, ROUND(AVG(dg.DiemChiPhi), 2) AS DiemChiPhi,
                       COALESCE(SUM(dg.CamXuc = 'TICH_CUC'), 0) AS TichCuc, COALESCE(SUM(dg.CamXuc = 'TRUNG_TINH'), 0) AS TrungTinh,
                       COALESCE(SUM(dg.CamXuc = 'TIEU_CUC'), 0) AS TieuCuc,
                       COALESCE(SUM(dg.TrangThaiPhanTich = 'CHUA_PHAN_TICH'), 0) AS ChuaPhanTich
                FROM DanhGia dg LEFT JOIN NhanVien bs ON bs.MaNV = dg.MaBS WHERE\s""" + dk, ts.toArray());
        kq.put("TongQuan", tong);
        kq.put("TheoThang", tv.ds("""
                SELECT DATE_FORMAT(dg.ThoiGian, '%Y-%m') AS Thang, COUNT(*) AS SoDanhGia, ROUND(AVG(dg.DiemBacSi), 2) AS DiemBacSi,
                       ROUND(AVG((COALESCE(dg.DiemThoiGianCho, 0) + COALESCE(dg.DiemThuTucTiepDon, 0) + COALESCE(dg.DiemThaiDoNhanVien, 0)
                                  + COALESCE(dg.DiemCoSoVatChat, 0) + COALESCE(dg.DiemDichVuCLS, 0) + COALESCE(dg.DiemChiPhi, 0))
                                 / NULLIF((dg.DiemThoiGianCho IS NOT NULL) + (dg.DiemThuTucTiepDon IS NOT NULL)
                                  + (dg.DiemThaiDoNhanVien IS NOT NULL) + (dg.DiemCoSoVatChat IS NOT NULL)
                                  + (dg.DiemDichVuCLS IS NOT NULL) + (dg.DiemChiPhi IS NOT NULL), 0)), 2) AS DiemDichVu,
                       COALESCE(SUM(dg.CamXuc = 'TICH_CUC'), 0) AS TichCuc, COALESCE(SUM(dg.CamXuc = 'TIEU_CUC'), 0) AS TieuCuc
                FROM DanhGia dg LEFT JOIN NhanVien bs ON bs.MaNV = dg.MaBS WHERE\s""" + dk + " GROUP BY Thang ORDER BY Thang",
                ts.toArray()));
        // Cảm xúc của từng chủ đề lấy theo điểm tiêu chí tương ứng nếu có chấm (VD khen bác sĩ nhưng chê thời gian chờ),
        // không thì theo cảm xúc chung của đánh giá
        String diem = "(CASE jt.Ma WHEN 'THOI_GIAN_CHO' THEN dg.DiemThoiGianCho WHEN 'THU_TUC' THEN dg.DiemThuTucTiepDon"
                + " WHEN 'THAI_DO' THEN dg.DiemThaiDoNhanVien WHEN 'CO_SO_VAT_CHAT' THEN dg.DiemCoSoVatChat"
                + " WHEN 'CHI_PHI' THEN dg.DiemChiPhi WHEN 'CHUYEN_MON' THEN dg.DiemBacSi END)";
        List<Map<String, Object>> chuDe = tv.ds("""
                SELECT t.ChuDe, COALESCE(SUM(t.CamXuc = 'TICH_CUC'), 0) AS TichCuc,
                       COALESCE(SUM(t.CamXuc = 'TRUNG_TINH'), 0) AS TrungTinh, COALESCE(SUM(t.CamXuc = 'TIEU_CUC'), 0) AS TieuCuc
                FROM (SELECT jt.Ma AS ChuDe, CASE WHEN\s""" + diem + " IS NULL THEN dg.CamXuc WHEN " + diem
                + " <= 2 THEN 'TIEU_CUC' WHEN " + diem + " = 3 THEN 'TRUNG_TINH' ELSE 'TICH_CUC' END AS CamXuc"
                + " FROM DanhGia dg JOIN JSON_TABLE(dg.ChuDe, '$[*]' COLUMNS (Ma VARCHAR(30) PATH '$')) jt"
                + " LEFT JOIN NhanVien bs ON bs.MaNV = dg.MaBS WHERE " + dk + ") t GROUP BY t.ChuDe ORDER BY COUNT(*) DESC",
                ts.toArray());
        kq.put("ChuDe", chuDe);
        // Xếp hạng nhân viên: điểm bác sĩ của đánh giá sau khám và điểm từng lễ tân, bác sĩ trong đánh giá tự do
        List<Object> tsNV = new ArrayList<>(List.of(tu.atStartOfDay(), den.plusDays(1).atStartOfDay()));
        StringBuilder dkNV = new StringBuilder();
        if (maCK != null) {
            dkNV.append(" AND nv.MaCK = ?");
            tsNV.add(maCK);
        }
        if (maBS != null) {
            dkNV.append(" AND nv.MaNV = ?");
            tsNV.add(maBS);
        }
        kq.put("BacSi", tv.ds("""
                SELECT nv.MaNV, nv.HoTen, nv.LoaiNhanVien, ck.TenCK, COUNT(*) AS SoDanhGia, ROUND(AVG(x.Diem), 2) AS DiemBacSi,
                       COALESCE(SUM(x.TieuCuc), 0) AS TieuCuc
                FROM (SELECT dg.MaBS AS MaNV, dg.DiemBacSi AS Diem, dg.CamXuc = 'TIEU_CUC' AS TieuCuc, dg.ThoiGian
                      FROM DanhGia dg WHERE dg.DiemBacSi IS NOT NULL
                      UNION ALL
                      SELECT d.MaNV, d.Diem, d.Diem <= 2, dg.ThoiGian FROM DanhGiaNhanVien d JOIN DanhGia dg ON dg.MaDG = d.MaDG) x
                JOIN NhanVien nv ON nv.MaNV = x.MaNV LEFT JOIN ChuyenKhoa ck ON ck.MaCK = nv.MaCK
                WHERE x.ThoiGian >= ? AND x.ThoiGian < ?""" + dkNV
                + " GROUP BY nv.MaNV, nv.HoTen, nv.LoaiNhanVien, ck.TenCK ORDER BY DiemBacSi DESC, SoDanhGia DESC",
                tsNV.toArray()));
        kq.put("TongHop", tongHop(tong, chuDe));
        return kq;
    }

    /** Danh sách đánh giá theo bộ lọc của báo cáo, thêm chủ đề và cảm xúc (UC13.3 bước 5). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> ds(LocalDate tu, LocalDate den, Integer maCK, Integer maBS, String chuDe, String camXuc) {
        List<Object> ts = new ArrayList<>();
        StringBuilder dk = new StringBuilder(dieuKien(tu, den, maCK, maBS, ts));
        if (chuDe != null && !chuDe.isBlank()) {
            dk.append(" AND JSON_CONTAINS(dg.ChuDe, JSON_QUOTE(?))");
            ts.add(chuDe);
        }
        if (camXuc != null && !camXuc.isBlank()) {
            dk.append(" AND dg.CamXuc = ?");
            ts.add(camXuc);
        }
        List<Map<String, Object>> ds = tv.ds("""
                SELECT dg.*, lk.MaLichHen, lk.NgayKham, bs.HoTen AS BacSi, ck.TenCK, bn.HoTen AS BenhNhan
                FROM DanhGia dg LEFT JOIN LuotKham lk ON lk.MaLK = dg.MaLK LEFT JOIN NhanVien bs ON bs.MaNV = dg.MaBS
                LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK JOIN BenhNhan bn ON bn.MaBN = dg.MaBN
                WHERE\s""" + dk + " ORDER BY dg.ThoiGian DESC LIMIT 500", ts.toArray());
        ds.forEach(this::kemAnh);
        return ds;
    }

    // ================= Hỗ trợ =================

    private Map<String, Object> luot(Integer maLK, Integer maBN) {
        if (maBN == null) {
            throw new KhongTimThay("Tài khoản chưa có hồ sơ");
        }
        Map<String, Object> lk = tv.mot("""
                SELECT lk.MaLK, lk.MaLichHen, lk.NgayKham, lk.TrangThai, lk.MaBN, lk.MaBS, bs.HoTen AS BacSi, bs.HocHamHocVi,
                       bs.AnhDaiDien, ck.TenCK, hd.NgayThanhToan,
                       (SELECT COUNT(*) FROM PhieuChiDinh p WHERE p.MaLK = lk.MaLK AND p.TrangThai = 'CO_KET_QUA') AS SoCLS
                FROM LuotKham lk JOIN NhanVien bs ON bs.MaNV = lk.MaBS LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                LEFT JOIN HoaDon hd ON hd.MaLK = lk.MaLK AND hd.TrangThai = 'DA_THANH_TOAN'
                WHERE lk.MaLK = ?""", maLK);
        if (lk == null || !maBN.equals(lk.get("MaBN"))) {
            throw new KhongTimThay("Không tìm thấy lượt khám");
        }
        LocalDateTime tt = (LocalDateTime) lk.get("NgayThanhToan");
        lk.put("HanDanhGia", tt == null ? null : tt.plusDays(HAN_NGAY));
        return lk;
    }

    private String lyDoKhongDuoc(Map<String, Object> lk, Map<String, Object> dg) {
        if (dg != null) {
            return "Lượt khám này đã được đánh giá";
        }
        LocalDateTime han = (LocalDateTime) lk.get("HanDanhGia");
        if (!"HOAN_THANH".equals(lk.get("TrangThai")) || han == null) {
            return "Chỉ đánh giá được lượt khám đã hoàn tất và thanh toán";
        }
        if (!han.isAfter(dongHo.bayGio())) {
            return "Đã quá hạn đánh giá (" + HAN_NGAY + " ngày sau khi thanh toán)";
        }
        return null;
    }

    private void capNhatDiemBacSi(Integer maBS) {
        tv.capNhat("""
                UPDATE NhanVien nv JOIN (
                    SELECT ROUND(AVG(d), 2) AS tb, COUNT(*) AS so FROM (
                        SELECT DiemBacSi AS d FROM DanhGia WHERE MaBS = ? AND DiemBacSi IS NOT NULL
                        UNION ALL SELECT Diem FROM DanhGiaNhanVien WHERE MaNV = ?) x) t
                SET nv.DiemDanhGiaTB = t.tb, nv.SoLuotDanhGia = t.so
                WHERE nv.MaNV = ?""", maBS, maBS, maBS);
    }

    private void kemAnh(Map<String, Object> dg) {
        dg.put("NhanVien", tv.ds("""
                SELECT d.MaNV, d.Diem, d.NhanXet, nv.HoTen, nv.LoaiNhanVien, ck.TenCK FROM DanhGiaNhanVien d
                JOIN NhanVien nv ON nv.MaNV = d.MaNV LEFT JOIN ChuyenKhoa ck ON ck.MaCK = nv.MaCK
                WHERE d.MaDG = ? ORDER BY FIELD(nv.LoaiNhanVien, 'LE_TAN', 'BAC_SI'), nv.HoTen""", dg.get("MaDG")));
        dg.put("Anh", tv.ds("SELECT MaTep, DuongDan, TenTep FROM TepDinhKem WHERE MaDG = ? ORDER BY MaTep", dg.get("MaDG")));
        Object cd = dg.get("ChuDe");
        if (cd != null) {
            try {
                dg.put("ChuDe", json.readValue(cd.toString(), List.class));
            } catch (Exception e) {
                dg.put("ChuDe", List.of());
            }
        }
    }

    private static void themChuDeTheoDiem(Map<String, Object> d, List<String> chuDe) {
        Map<String, String> theoCot = Map.of("DiemThoiGianCho", "THOI_GIAN_CHO", "DiemThuTucTiepDon", "THU_TUC",
                "DiemThaiDoNhanVien", "THAI_DO", "DiemCoSoVatChat", "CO_SO_VAT_CHAT", "DiemChiPhi", "CHI_PHI");
        theoCot.forEach((cot, ma) -> {
            Object v = d.get(cot);
            if (v != null && ((Number) v).intValue() <= 2 && !chuDe.contains(ma)) {
                chuDe.add(ma);
            }
        });
        Object bs = d.get("DiemBacSi");
        if (bs != null && ((Number) bs).intValue() <= 2 && !chuDe.contains("CHUYEN_MON")) {
            chuDe.add("CHUYEN_MON");
        }
    }

    private static String dieuKien(LocalDate tu, LocalDate den, Integer maCK, Integer maBS, List<Object> ts) {
        StringBuilder dk = new StringBuilder("dg.ThoiGian >= ? AND dg.ThoiGian < ?");
        ts.add(tu.atStartOfDay());
        ts.add(den.plusDays(1).atStartOfDay());
        // Lọc theo chuyên khoa / bác sĩ: bác sĩ của lượt khám, hoặc nhân viên được chấm trong đánh giá tự do
        if (maCK != null) {
            dk.append(" AND (bs.MaCK = ? OR EXISTS (SELECT 1 FROM DanhGiaNhanVien x JOIN NhanVien n ON n.MaNV = x.MaNV"
                    + " WHERE x.MaDG = dg.MaDG AND n.MaCK = ?))");
            ts.add(maCK);
            ts.add(maCK);
        }
        if (maBS != null) {
            dk.append(" AND (dg.MaBS = ? OR EXISTS (SELECT 1 FROM DanhGiaNhanVien x WHERE x.MaDG = dg.MaDG AND x.MaNV = ?))");
            ts.add(maBS);
            ts.add(maBS);
        }
        return dk.toString();
    }

    /**
     * Đoạn tổng hợp điểm mạnh và vấn đề cần cải thiện (UC13.3 bước 4) dựng từ số liệu đã phân tích;
     * dưới 5 đánh giá trong kỳ thì không tổng hợp (4a).
     */
    private Map<String, Object> tongHop(Map<String, Object> tong, List<Map<String, Object>> chuDe) {
        long so = ((Number) tong.get("SoDanhGia")).longValue();
        if (so < TOI_THIEU_TONG_HOP) {
            return Map.of("CoTongHop", false, "LyDo", "Cần ít nhất " + TOI_THIEU_TONG_HOP + " đánh giá trong kỳ để tổng hợp");
        }
        Map<String, Double> diem = new LinkedHashMap<>();
        if (tong.get("DiemBacSi") != null) {
            diem.put("Chuyên môn và thái độ của bác sĩ", ((Number) tong.get("DiemBacSi")).doubleValue());
        }
        TIEU_CHI.forEach((cot, ten) -> {
            if (tong.get(cot) != null) {
                diem.put(ten, ((Number) tong.get(cot)).doubleValue());
            }
        });
        List<String> manh = new ArrayList<>(), yeu = new ArrayList<>();
        diem.entrySet().stream().filter(e -> e.getValue() >= 4.0)
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed()).limit(3)
                .forEach(e -> manh.add(e.getKey() + " được chấm cao (" + so1(e.getValue()) + "/5)"));
        diem.entrySet().stream().filter(e -> e.getValue() < 3.5).sorted(Map.Entry.comparingByValue()).limit(3)
                .forEach(e -> yeu.add(e.getKey() + " còn thấp (" + so1(e.getValue()) + "/5)"));
        Comparator<Map<String, Object>> theo = Comparator.comparingLong(m -> ((Number) m.get("TichCuc")).longValue());
        chuDe.stream().filter(m -> ((Number) m.get("TichCuc")).longValue() > ((Number) m.get("TieuCuc")).longValue())
                .sorted(theo.reversed()).limit(2)
                .forEach(m -> manh.add("Bệnh nhân khen về " + TEN_CHU_DE.getOrDefault(m.get("ChuDe"), chuoi(m.get("ChuDe")))
                        + " (" + m.get("TichCuc") + " lượt tích cực)"));
        chuDe.stream().filter(m -> ((Number) m.get("TieuCuc")).longValue() > 0)
                .sorted(Comparator.comparingLong((Map<String, Object> m) -> ((Number) m.get("TieuCuc")).longValue()).reversed())
                .limit(2)
                .forEach(m -> yeu.add("Phàn nàn về " + TEN_CHU_DE.getOrDefault(m.get("ChuDe"), chuoi(m.get("ChuDe")))
                        + " (" + m.get("TieuCuc") + " lượt tiêu cực)"));
        long tc = ((Number) tong.get("TichCuc")).longValue(), tieu = ((Number) tong.get("TieuCuc")).longValue();
        String moDau = "Trong kỳ có " + so + " đánh giá, " + Math.round(tc * 100.0 / so) + "% tích cực và "
                + Math.round(tieu * 100.0 / so) + "% tiêu cực.";
        return Map.of("CoTongHop", true, "MoDau", moDau, "DiemManh", manh, "CanCaiThien", yeu);
    }

    private static void diem(Integer d, String ten) {
        if (d < 1 || d > 5) {
            throw new LoiNghiepVu("Điểm " + ten + " phải từ 1 đến 5 sao");
        }
    }

    private static String vanBan(String s, String ten) {
        String t = s == null || s.isBlank() ? null : s.strip();
        if (t != null && t.length() > 2000) {
            throw new LoiNghiepVu(ten + " tối đa 2000 ký tự");
        }
        return t;
    }

    static String tenTep(MultipartFile t, String duongDan) {
        String ten = t.getOriginalFilename() == null || t.getOriginalFilename().isBlank()
                ? duongDan.substring(duongDan.lastIndexOf('/') + 1) : t.getOriginalFilename().strip();
        return ten.length() > 255 ? ten.substring(ten.length() - 255) : ten;
    }

    private String viet(List<String> ds) {
        try {
            return json.writeValueAsString(ds);
        } catch (Exception e) {
            return "[]";
        }
    }

    private static String chuoi(Object o) {
        return o == null ? "" : o.toString();
    }

    private static String tomTat(String s) {
        String t = s == null ? "" : s.strip();
        return t.length() > 120 ? t.substring(0, 120) + "…" : t;
    }

    private static String so1(double d) {
        return String.format(Locale.ROOT, "%.1f", d).replace('.', ',');
    }

    private static String ngayGio(LocalDateTime t) {
        return t.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
    }
}
