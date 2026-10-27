package vn.vietbac.phongkham.dichvu;

import java.math.BigDecimal;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LuuAnh;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Gói 3 – quản trị danh mục: chuyên khoa (UC3.1, BR07), phòng, dịch vụ và ràng buộc thứ tự (UC3.3, BR18),
 * thuốc (UC3.4), thông tin phòng khám (UC3.6), mẫu chỉ số xét nghiệm (UC3.7), mã ICD-10 (UC3.8).
 * Danh mục đã dùng trong hồ sơ không xóa mà chuyển "Ngừng hoạt động" để giữ lịch sử.
 */
@Service
public class DanhMucService {

    private static final String HOAT_DONG = "HOAT_DONG";
    private static final String NGUNG = "NGUNG_HOAT_DONG";
    private static final List<String> LICH_CON_HIEU_LUC = List.of("CHO_XAC_NHAN", "DA_XAC_NHAN", "DA_CHECK_IN");
    /** BR11: loại dịch vụ CLS -> loại phòng thực hiện. */
    private static final Map<String, List<String>> PHONG_CUA_DICH_VU = Map.of(
            "XET_NGHIEM", List.of("XET_NGHIEM"),
            "CDHA", List.of("X_QUANG", "SIEU_AM"),
            "NOI_SOI", List.of("NOI_SOI"));
    private static final List<String> LOAI_PHONG = List.of("KHAM_BENH", "XET_NGHIEM", "X_QUANG", "SIEU_AM", "NOI_SOI");

    private final NhatKyService nhatKy;
    private final LuuAnh luuAnh;
    private final TruyVan tv;
    private final DongHo dongHo;

    public DanhMucService(NhatKyService nhatKy, LuuAnh luuAnh, TruyVan tv, DongHo dongHo) {
        this.nhatKy = nhatKy;
        this.luuAnh = luuAnh;
        this.tv = tv;
        this.dongHo = dongHo;
    }

    public record ChuyenKhoa(String tenCK, String moTa, BigDecimal phiKhamCoBan) {
    }

    public record Phong(String maSoPhong, String tenPhong, Integer maTang, String loaiPhong, Integer maCK) {
    }

    public record DichVu(String tenDV, String loaiDV, Integer maCK, Integer maPhong, BigDecimal giaDichVu,
                         BigDecimal giaBHYT, String mauKetQua, Boolean yeuCauNhinAn, Integer thoiGianThucHien,
                         Integer thoiGianTraKetQua) {
    }

    public record ChiSo(String tenChiSo, String donVi, BigDecimal gioiHanDuoi, BigDecimal gioiHanTren, Boolean batBuoc,
                        Integer thuTu) {
    }

    public record Thuoc(String tenThuoc, String hoatChat, String hamLuong, String donViTinh, BigDecimal donGia,
                        BigDecimal giaBHYT) {
    }

    public record ThongTin(String tenPhongKham, String gioiThieu, String diaChi, String gioLamViec, String hotline,
                           String email, String maNganHang, String soTaiKhoan, String tenTaiKhoan) {
    }

    // ================= Chuyên khoa =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsChuyenKhoa() {
        return tv.ds("""
                SELECT ck.MaCK, ck.TenCK, ck.MoTa, ck.AnhDaiDien, ck.PhiKhamCoBan, ck.TrangThai,
                       (SELECT COUNT(*) FROM NhanVien nv WHERE nv.MaCK = ck.MaCK AND nv.TrangThai = 'HOAT_DONG') AS SoBacSi,
                       (SELECT COUNT(*) FROM Phong p WHERE p.MaCK = ck.MaCK AND p.TrangThai = 'HOAT_DONG') AS SoPhong
                FROM ChuyenKhoa ck ORDER BY ck.MaCK""");
    }

    /** Thêm chuyên khoa kèm dịch vụ "Khám ..." cùng giá để thu phí khám (BR09 tính theo bảng DichVu). */
    @Transactional
    public Integer themChuyenKhoa(ChuyenKhoa b, Integer maTK) {
        String ten = batBuoc(b.tenCK(), "tên chuyên khoa");
        BigDecimal phi = khongAm(b.phiKhamCoBan(), "Phí khám");
        if (tv.dem("SELECT COUNT(*) FROM ChuyenKhoa WHERE TenCK = ?", ten) > 0) {
            throw new LoiNghiepVu("Đã có chuyên khoa " + ten);
        }
        tv.capNhat("INSERT INTO ChuyenKhoa (TenCK, MoTa, PhiKhamCoBan) VALUES (?, ?, ?)", ten, rong(b.moTa()), phi);
        Integer ma = moiNhat();
        tv.capNhat("""
                INSERT INTO DichVu (TenDV, LoaiDV, MaCK, GiaDichVu, ThoiGianThucHien) VALUES (?, 'KHAM', ?, ?, 15)""",
                "Khám " + ten, ma, phi);
        nhatKy.ghi(maTK, "THEM_DANH_MUC", "ChuyenKhoa", ma, ten);
        return ma;
    }

    @Transactional
    public void suaChuyenKhoa(Integer maCK, ChuyenKhoa b, Integer maTK) {
        Map<String, Object> cu = timThay(tv.mot("SELECT TenCK, PhiKhamCoBan FROM ChuyenKhoa WHERE MaCK = ?", maCK),
                "chuyên khoa");
        String ten = batBuoc(b.tenCK(), "tên chuyên khoa");
        BigDecimal phi = khongAm(b.phiKhamCoBan(), "Phí khám");
        if (tv.dem("SELECT COUNT(*) FROM ChuyenKhoa WHERE TenCK = ? AND MaCK <> ?", ten, maCK) > 0) {
            throw new LoiNghiepVu("Đã có chuyên khoa " + ten);
        }
        tv.capNhat("UPDATE ChuyenKhoa SET TenCK = ?, MoTa = ?, PhiKhamCoBan = ? WHERE MaCK = ?",
                ten, rong(b.moTa()), phi, maCK);
        // Giữ dịch vụ khám của chuyên khoa cùng giá; giá BHYT nếu có phải không vượt giá mới
        tv.capNhat("""
                UPDATE DichVu SET GiaDichVu = ?, GiaBHYT = IF(GiaBHYT > ?, ?, GiaBHYT) WHERE LoaiDV = 'KHAM' AND MaCK = ?""",
                phi, phi, phi, maCK);
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "ChuyenKhoa", maCK, cu.get("TenCK") + (ten.equals(cu.get("TenCK")) ? "" : " -> " + ten)
                + (phi.compareTo((BigDecimal) cu.get("PhiKhamCoBan")) == 0 ? "" : ", phí khám " + phi.toPlainString()));
    }

    /** BR07: không ngừng chuyên khoa khi còn lịch hẹn sắp tới; chuyên khoa ngừng thì bệnh nhân không đặt được. */
    @Transactional
    public void doiTrangThaiChuyenKhoa(Integer maCK, boolean hoatDong, Integer maTK) {
        String ten = timThay(tv.giaTri("SELECT TenCK FROM ChuyenKhoa WHERE MaCK = ?", maCK), "chuyên khoa");
        if (!hoatDong) {
            long n = tv.dem("""
                    SELECT COUNT(*) FROM LuotKham lk JOIN NhanVien bs ON bs.MaNV = lk.MaBS
                    WHERE bs.MaCK = ? AND lk.NgayKham >= ? AND lk.TrangThai IN (?)""",
                    maCK, dongHo.homNay(), LICH_CON_HIEU_LUC);
            if (n > 0) {
                throw new LoiNghiepVu("Chuyên khoa còn " + n + " lịch hẹn sắp tới, hãy xử lý các lịch hẹn trước khi ngừng");
            }
        }
        tv.capNhat("UPDATE ChuyenKhoa SET TrangThai = ? WHERE MaCK = ?", hoatDong ? HOAT_DONG : NGUNG, maCK);
        tv.capNhat("UPDATE DichVu SET TrangThai = ? WHERE LoaiDV = 'KHAM' AND MaCK = ?", hoatDong ? HOAT_DONG : NGUNG, maCK);
        nhatKy.ghi(maTK, hoatDong ? "MO_DANH_MUC" : "NGUNG_DANH_MUC", "ChuyenKhoa", maCK, ten);
    }

    @Transactional
    public String doiAnhChuyenKhoa(Integer maCK, MultipartFile anh, Integer maTK) {
        String cu = tv.giaTri("SELECT AnhDaiDien FROM ChuyenKhoa WHERE MaCK = ?", maCK);
        timThay(tv.giaTri("SELECT TenCK FROM ChuyenKhoa WHERE MaCK = ?", maCK), "chuyên khoa");
        String moi = luuAnh.luu(anh, "chuyen-khoa", "ck" + maCK);
        tv.capNhat("UPDATE ChuyenKhoa SET AnhDaiDien = ? WHERE MaCK = ?", moi, maCK);
        luuAnh.xoa(cu);
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "ChuyenKhoa", maCK, "Đổi ảnh chuyên khoa");
        return moi;
    }

    // ================= Phòng =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsTang() {
        return tv.ds("SELECT MaTang, SoTang, TenTang FROM Tang ORDER BY SoTang");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsPhong() {
        return tv.ds("""
                SELECT p.MaPhong, p.MaSoPhong, p.TenPhong, p.MaTang, t.TenTang, p.LoaiPhong, p.MaCK, ck.TenCK, p.TrangThai,
                       EXISTS (SELECT 1 FROM DiemNut d WHERE d.MaPhong = p.MaPhong) AS CoTrenSoDo
                FROM Phong p JOIN Tang t ON t.MaTang = p.MaTang LEFT JOIN ChuyenKhoa ck ON ck.MaCK = p.MaCK
                ORDER BY t.SoTang, p.MaSoPhong""");
    }

    @Transactional
    public Integer themPhong(Phong b, Integer maTK) {
        kiemTraPhong(null, b);
        tv.capNhat("INSERT INTO Phong (MaSoPhong, TenPhong, MaTang, LoaiPhong, MaCK) VALUES (?, ?, ?, ?, ?)",
                b.maSoPhong().strip().toUpperCase(), b.tenPhong().strip(), b.maTang(), b.loaiPhong(),
                "KHAM_BENH".equals(b.loaiPhong()) ? b.maCK() : null);
        Integer ma = moiNhat();
        nhatKy.ghi(maTK, "THEM_DANH_MUC", "Phong", ma, b.maSoPhong().strip().toUpperCase() + " - " + b.tenPhong().strip());
        return ma;
    }

    @Transactional
    public void suaPhong(Integer maPhong, Phong b, Integer maTK) {
        Map<String, Object> cu = timThay(tv.mot("SELECT MaSoPhong, LoaiPhong, MaCK, MaTang FROM Phong WHERE MaPhong = ?",
                maPhong), "phòng");
        kiemTraPhong(maPhong, b);
        boolean doiCongNang = !b.loaiPhong().equals(cu.get("LoaiPhong"))
                || ("KHAM_BENH".equals(b.loaiPhong()) && !b.maCK().equals(cu.get("MaCK")));
        if (doiCongNang) {
            if (tv.dem("SELECT COUNT(*) FROM CaLamViec WHERE MaPhong = ? AND NgayLam >= ?", maPhong, dongHo.homNay()) > 0) {
                throw new LoiNghiepVu("Phòng đã được xếp ca làm việc sắp tới, không đổi loại phòng hoặc chuyên khoa được");
            }
            if (tv.dem("SELECT COUNT(*) FROM DichVu WHERE MaPhong = ? AND TrangThai = 'HOAT_DONG'", maPhong) > 0
                    || tv.dem("SELECT COUNT(*) FROM NhanVien WHERE MaPhongPhuTrach = ? AND TrangThai = 'HOAT_DONG'", maPhong) > 0) {
                throw new LoiNghiepVu("Phòng đang gắn với dịch vụ hoặc bác sĩ cận lâm sàng, hãy chuyển họ sang phòng khác trước");
            }
        }
        if (!b.maTang().equals(cu.get("MaTang"))
                && tv.dem("SELECT COUNT(*) FROM DiemNut WHERE MaPhong = ?", maPhong) > 0) {
            throw new LoiNghiepVu("Phòng đã có trên sơ đồ tầng cũ, hãy xóa điểm của phòng trên sơ đồ trước khi đổi tầng");
        }
        tv.capNhat("UPDATE Phong SET MaSoPhong = ?, TenPhong = ?, MaTang = ?, LoaiPhong = ?, MaCK = ? WHERE MaPhong = ?",
                b.maSoPhong().strip().toUpperCase(), b.tenPhong().strip(), b.maTang(), b.loaiPhong(),
                "KHAM_BENH".equals(b.loaiPhong()) ? b.maCK() : null, maPhong);
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "Phong", maPhong, cu.get("MaSoPhong") + " - " + b.tenPhong().strip());
    }

    @Transactional
    public void doiTrangThaiPhong(Integer maPhong, boolean hoatDong, Integer maTK) {
        String so = timThay(tv.giaTri("SELECT MaSoPhong FROM Phong WHERE MaPhong = ?", maPhong), "phòng");
        if (!hoatDong) {
            long n = tv.dem("SELECT COUNT(*) FROM CaLamViec WHERE MaPhong = ? AND NgayLam >= ?", maPhong, dongHo.homNay());
            if (n > 0) {
                throw new LoiNghiepVu("Phòng còn " + n + " ca làm việc sắp tới, hãy đổi phòng cho các ca đó trước");
            }
            if (tv.dem("SELECT COUNT(*) FROM DichVu WHERE MaPhong = ? AND TrangThai = 'HOAT_DONG'", maPhong) > 0) {
                throw new LoiNghiepVu("Phòng còn dịch vụ cận lâm sàng đang hoạt động, hãy chuyển dịch vụ sang phòng khác trước");
            }
        }
        tv.capNhat("UPDATE Phong SET TrangThai = ? WHERE MaPhong = ?", hoatDong ? HOAT_DONG : NGUNG, maPhong);
        nhatKy.ghi(maTK, hoatDong ? "MO_DANH_MUC" : "NGUNG_DANH_MUC", "Phong", maPhong, so);
    }

    private void kiemTraPhong(Integer maPhong, Phong b) {
        String so = batBuoc(b.maSoPhong(), "mã số phòng").toUpperCase();
        batBuoc(b.tenPhong(), "tên phòng");
        if (!so.matches("[A-Z0-9-]{1,10}")) {
            throw new LoiNghiepVu("Mã số phòng tối đa 10 ký tự gồm chữ, số, dấu gạch ngang (VD P101)");
        }
        if (!LOAI_PHONG.contains(b.loaiPhong())) {
            throw new LoiNghiepVu("Loại phòng không hợp lệ");
        }
        if (b.maTang() == null || tv.dem("SELECT COUNT(*) FROM Tang WHERE MaTang = ?", b.maTang()) == 0) {
            throw new LoiNghiepVu("Vui lòng chọn tầng");
        }
        if ("KHAM_BENH".equals(b.loaiPhong()) && (b.maCK() == null
                || tv.dem("SELECT COUNT(*) FROM ChuyenKhoa WHERE MaCK = ? AND TrangThai = 'HOAT_DONG'", b.maCK()) == 0)) {
            throw new LoiNghiepVu("Phòng khám bệnh phải thuộc một chuyên khoa đang hoạt động");
        }
        if (tv.dem("SELECT COUNT(*) FROM Phong WHERE MaSoPhong = ? AND MaPhong <> ?", so, maPhong == null ? 0 : maPhong) > 0) {
            throw new LoiNghiepVu("Mã số phòng " + so + " đã tồn tại");
        }
    }

    // ================= Dịch vụ, ràng buộc thứ tự (BR18) =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsDichVu() {
        List<Map<String, Object>> ds = tv.ds("""
                SELECT dv.MaDV, dv.TenDV, dv.LoaiDV, dv.MaCK, ck.TenCK, dv.MaPhong, p.MaSoPhong, p.TenPhong, dv.GiaDichVu,
                       dv.GiaBHYT, dv.MauKetQua, dv.YeuCauNhinAn, dv.ThoiGianThucHien, dv.ThoiGianTraKetQua, dv.TrangThai,
                       (SELECT COUNT(*) FROM MauChiSo m WHERE m.MaDV = dv.MaDV AND m.TrangThai = 'HOAT_DONG') AS SoChiSo
                FROM DichVu dv LEFT JOIN ChuyenKhoa ck ON ck.MaCK = dv.MaCK LEFT JOIN Phong p ON p.MaPhong = dv.MaPhong
                ORDER BY FIELD(dv.LoaiDV, 'KHAM', 'XET_NGHIEM', 'CDHA', 'NOI_SOI'), dv.TenDV""");
        Map<Object, List<Object>> truoc = new HashMap<>();
        for (Map<String, Object> r : tv.ds("SELECT MaDV, MaDVTruoc FROM RangBuocDichVu")) {
            truoc.computeIfAbsent(r.get("MaDV"), k -> new ArrayList<>()).add(r.get("MaDVTruoc"));
        }
        ds.forEach(d -> d.put("LamTruoc", truoc.getOrDefault(d.get("MaDV"), List.of())));
        return ds;
    }

    @Transactional
    public Integer themDichVu(DichVu b, Integer maTK) {
        kiemTraDichVu(b);
        tv.capNhat("""
                INSERT INTO DichVu (TenDV, LoaiDV, MaCK, MaPhong, GiaDichVu, GiaBHYT, MauKetQua, YeuCauNhinAn,
                       ThoiGianThucHien, ThoiGianTraKetQua) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                b.tenDV().strip(), b.loaiDV(), "KHAM".equals(b.loaiDV()) ? b.maCK() : null,
                "KHAM".equals(b.loaiDV()) ? null : b.maPhong(), b.giaDichVu(), b.giaBHYT(), rong(b.mauKetQua()),
                Boolean.TRUE.equals(b.yeuCauNhinAn()), b.thoiGianThucHien(), b.thoiGianTraKetQua());
        Integer ma = moiNhat();
        nhatKy.ghi(maTK, "THEM_DANH_MUC", "DichVu", ma, b.tenDV().strip() + ", giá " + b.giaDichVu().toPlainString());
        return ma;
    }

    /** Giá mới chỉ áp dụng cho chỉ định sau này; phiếu đã chỉ định giữ giá lúc chỉ định (BR09). */
    @Transactional
    public void suaDichVu(Integer maDV, DichVu b, Integer maTK) {
        Map<String, Object> cu = timThay(tv.mot("SELECT TenDV, LoaiDV, GiaDichVu FROM DichVu WHERE MaDV = ?", maDV), "dịch vụ");
        kiemTraDichVu(b);
        if (!b.loaiDV().equals(cu.get("LoaiDV"))) {
            throw new LoiNghiepVu("Không đổi được loại dịch vụ, hãy ngừng dịch vụ này và tạo dịch vụ mới");
        }
        tv.capNhat("""
                UPDATE DichVu SET TenDV = ?, MaCK = ?, MaPhong = ?, GiaDichVu = ?, GiaBHYT = ?, MauKetQua = ?,
                       YeuCauNhinAn = ?, ThoiGianThucHien = ?, ThoiGianTraKetQua = ? WHERE MaDV = ?""",
                b.tenDV().strip(), "KHAM".equals(b.loaiDV()) ? b.maCK() : null,
                "KHAM".equals(b.loaiDV()) ? null : b.maPhong(), b.giaDichVu(), b.giaBHYT(), rong(b.mauKetQua()),
                Boolean.TRUE.equals(b.yeuCauNhinAn()), b.thoiGianThucHien(), b.thoiGianTraKetQua(), maDV);
        if ("KHAM".equals(b.loaiDV())) {
            tv.capNhat("UPDATE ChuyenKhoa SET PhiKhamCoBan = ? WHERE MaCK = ?", b.giaDichVu(), b.maCK());
        }
        BigDecimal giaCu = (BigDecimal) cu.get("GiaDichVu");
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "DichVu", maDV, b.tenDV().strip()
                + (giaCu.compareTo(b.giaDichVu()) == 0 ? "" : ", giá " + giaCu.toPlainString() + " -> " + b.giaDichVu().toPlainString()));
    }

    @Transactional
    public void doiTrangThaiDichVu(Integer maDV, boolean hoatDong, Integer maTK) {
        Map<String, Object> dv = timThay(tv.mot("SELECT TenDV, LoaiDV, MaCK, MaPhong FROM DichVu WHERE MaDV = ?", maDV), "dịch vụ");
        if (hoatDong && "KHAM".equals(dv.get("LoaiDV"))
                && tv.dem("SELECT COUNT(*) FROM ChuyenKhoa WHERE MaCK = ? AND TrangThai = 'HOAT_DONG'", dv.get("MaCK")) == 0) {
            throw new LoiNghiepVu("Chuyên khoa của dịch vụ đang ngừng, hãy mở lại chuyên khoa");
        }
        if (hoatDong && dv.get("MaPhong") != null
                && tv.dem("SELECT COUNT(*) FROM Phong WHERE MaPhong = ? AND TrangThai = 'HOAT_DONG'", dv.get("MaPhong")) == 0) {
            throw new LoiNghiepVu("Phòng thực hiện đang ngừng, hãy chọn phòng khác cho dịch vụ trước");
        }
        tv.capNhat("UPDATE DichVu SET TrangThai = ? WHERE MaDV = ?", hoatDong ? HOAT_DONG : NGUNG, maDV);
        nhatKy.ghi(maTK, hoatDong ? "MO_DANH_MUC" : "NGUNG_DANH_MUC", "DichVu", maDV, (String) dv.get("TenDV"));
    }

    /** BR18: các dịch vụ phải làm trước dịch vụ maDV; không cho tạo vòng lặp (A trước B, B trước A). */
    @Transactional
    public void luuRangBuoc(Integer maDV, List<Integer> dsTruoc, Integer maTK) {
        String ten = timThay(tv.giaTri("SELECT TenDV FROM DichVu WHERE MaDV = ? AND LoaiDV <> 'KHAM'", maDV),
                "dịch vụ cận lâm sàng");
        Set<Integer> truoc = new LinkedHashSet<>(dsTruoc == null ? List.of() : dsTruoc);
        if (truoc.contains(maDV)) {
            throw new LoiNghiepVu("Dịch vụ không thể phải làm trước chính nó");
        }
        for (Integer t : truoc) {
            if (tv.dem("SELECT COUNT(*) FROM DichVu WHERE MaDV = ? AND LoaiDV <> 'KHAM'", t) == 0) {
                throw new LoiNghiepVu("Chỉ ràng buộc giữa các dịch vụ cận lâm sàng");
            }
            if (lamTruocBacCau(t).contains(maDV)) {
                throw new LoiNghiepVu("Ràng buộc tạo vòng lặp: " + tv.giaTri("SELECT TenDV FROM DichVu WHERE MaDV = ?", t)
                        + " đang phải làm sau " + ten);
            }
        }
        tv.capNhat("DELETE FROM RangBuocDichVu WHERE MaDV = ?", maDV);
        for (Integer t : truoc) {
            tv.capNhat("INSERT INTO RangBuocDichVu (MaDV, MaDVTruoc) VALUES (?, ?)", maDV, t);
        }
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "DichVu", maDV, ten + ": cập nhật " + truoc.size() + " dịch vụ làm trước");
    }

    /** Mọi dịch vụ phải làm trước maDV (bắc cầu). */
    private Set<Integer> lamTruocBacCau(Integer maDV) {
        Set<Integer> kq = new HashSet<>();
        Deque<Integer> hang = new ArrayDeque<>(List.of(maDV));
        while (!hang.isEmpty()) {
            for (Map<String, Object> r : tv.ds("SELECT MaDVTruoc FROM RangBuocDichVu WHERE MaDV = ?", hang.poll())) {
                Integer t = (Integer) r.get("MaDVTruoc");
                if (kq.add(t)) {
                    hang.add(t);
                }
            }
        }
        return kq;
    }

    private void kiemTraDichVu(DichVu b) {
        batBuoc(b.tenDV(), "tên dịch vụ");
        if (!List.of("KHAM", "XET_NGHIEM", "CDHA", "NOI_SOI").contains(b.loaiDV())) {
            throw new LoiNghiepVu("Loại dịch vụ không hợp lệ");
        }
        BigDecimal gia = khongAm(b.giaDichVu(), "Giá dịch vụ");
        if (b.giaBHYT() != null && (b.giaBHYT().signum() < 0 || b.giaBHYT().compareTo(gia) > 0)) {
            throw new LoiNghiepVu("Giá BHYT từ 0 đến giá dịch vụ (để trống nếu ngoài danh mục BHYT)");
        }
        if ("KHAM".equals(b.loaiDV())) {
            if (b.maCK() == null || tv.dem("SELECT COUNT(*) FROM ChuyenKhoa WHERE MaCK = ?", b.maCK()) == 0) {
                throw new LoiNghiepVu("Dịch vụ khám phải thuộc một chuyên khoa");
            }
        } else {
            String loaiPhong = b.maPhong() == null ? null : tv.giaTri(
                    "SELECT LoaiPhong FROM Phong WHERE MaPhong = ? AND TrangThai = 'HOAT_DONG'", b.maPhong());
            if (loaiPhong == null || !PHONG_CUA_DICH_VU.get(b.loaiDV()).contains(loaiPhong)) {
                throw new LoiNghiepVu("Chọn phòng thực hiện đúng loại (BR11): xét nghiệm - phòng xét nghiệm, "
                        + "chẩn đoán hình ảnh - phòng X-quang/siêu âm, nội soi - phòng nội soi");
            }
        }
        for (Integer phut : new Integer[] {b.thoiGianThucHien(), b.thoiGianTraKetQua()}) {
            if (phut != null && (phut < 1 || phut > 1440)) {
                throw new LoiNghiepVu("Thời gian thực hiện / trả kết quả từ 1 đến 1440 phút");
            }
        }
    }

    // ================= Mẫu chỉ số xét nghiệm (UC3.7) =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsChiSo(Integer maDV) {
        return tv.ds("""
                SELECT MaChiSo, TenChiSo, DonVi, GioiHanDuoi, GioiHanTren, BatBuoc, ThuTu, TrangThai
                FROM MauChiSo WHERE MaDV = ? ORDER BY ThuTu, MaChiSo""", maDV);
    }

    @Transactional
    public Integer themChiSo(Integer maDV, ChiSo b, Integer maTK) {
        String tenDV = timThay(tv.giaTri("SELECT TenDV FROM DichVu WHERE MaDV = ? AND LoaiDV = 'XET_NGHIEM'", maDV),
                "dịch vụ xét nghiệm");
        kiemTraChiSo(maDV, null, b);
        tv.capNhat("""
                INSERT INTO MauChiSo (MaDV, TenChiSo, DonVi, GioiHanDuoi, GioiHanTren, BatBuoc, ThuTu)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                maDV, b.tenChiSo().strip(), rong(b.donVi()), b.gioiHanDuoi(), b.gioiHanTren(),
                !Boolean.FALSE.equals(b.batBuoc()), b.thuTu() == null ? 0 : b.thuTu());
        Integer ma = moiNhat();
        nhatKy.ghi(maTK, "THEM_DANH_MUC", "MauChiSo", ma, tenDV + ": " + b.tenChiSo().strip());
        return ma;
    }

    @Transactional
    public void suaChiSo(Integer maChiSo, ChiSo b, Integer maTK) {
        Integer maDV = timThay(tv.giaTri("SELECT MaDV FROM MauChiSo WHERE MaChiSo = ?", maChiSo), "chỉ số");
        kiemTraChiSo(maDV, maChiSo, b);
        tv.capNhat("""
                UPDATE MauChiSo SET TenChiSo = ?, DonVi = ?, GioiHanDuoi = ?, GioiHanTren = ?, BatBuoc = ?, ThuTu = ?
                WHERE MaChiSo = ?""",
                b.tenChiSo().strip(), rong(b.donVi()), b.gioiHanDuoi(), b.gioiHanTren(), !Boolean.FALSE.equals(b.batBuoc()),
                b.thuTu() == null ? 0 : b.thuTu(), maChiSo);
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "MauChiSo", maChiSo, b.tenChiSo().strip());
    }

    @Transactional
    public void doiTrangThaiChiSo(Integer maChiSo, boolean hoatDong, Integer maTK) {
        String ten = timThay(tv.giaTri("SELECT TenChiSo FROM MauChiSo WHERE MaChiSo = ?", maChiSo), "chỉ số");
        tv.capNhat("UPDATE MauChiSo SET TrangThai = ? WHERE MaChiSo = ?", hoatDong ? HOAT_DONG : NGUNG, maChiSo);
        nhatKy.ghi(maTK, hoatDong ? "MO_DANH_MUC" : "NGUNG_DANH_MUC", "MauChiSo", maChiSo, ten);
    }

    private void kiemTraChiSo(Integer maDV, Integer maChiSo, ChiSo b) {
        String ten = batBuoc(b.tenChiSo(), "tên chỉ số");
        if (b.gioiHanDuoi() != null && b.gioiHanTren() != null && b.gioiHanDuoi().compareTo(b.gioiHanTren()) > 0) {
            throw new LoiNghiepVu("Giới hạn dưới phải nhỏ hơn hoặc bằng giới hạn trên");
        }
        if (tv.dem("SELECT COUNT(*) FROM MauChiSo WHERE MaDV = ? AND TenChiSo = ? AND MaChiSo <> ?",
                maDV, ten, maChiSo == null ? 0 : maChiSo) > 0) {
            throw new LoiNghiepVu("Xét nghiệm đã có chỉ số " + ten);
        }
    }

    // ================= Thuốc (UC3.4) =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsThuoc() {
        return tv.ds("""
                SELECT MaThuoc, TenThuoc, HoatChat, HamLuong, DonViTinh, DonGia, GiaBHYT, TrangThai
                FROM Thuoc ORDER BY TenThuoc""");
    }

    @Transactional
    public Integer themThuoc(Thuoc b, Integer maTK) {
        kiemTraThuoc(null, b);
        tv.capNhat("""
                INSERT INTO Thuoc (TenThuoc, HoatChat, HamLuong, DonViTinh, DonGia, GiaBHYT) VALUES (?, ?, ?, ?, ?, ?)""",
                b.tenThuoc().strip(), rong(b.hoatChat()), rong(b.hamLuong()), b.donViTinh().strip(), b.donGia(), b.giaBHYT());
        Integer ma = moiNhat();
        nhatKy.ghi(maTK, "THEM_DANH_MUC", "Thuoc", ma, b.tenThuoc().strip());
        return ma;
    }

    /** Đơn đã kê giữ đơn giá lúc kê (ChiTietDonThuoc.DonGia), sửa giá chỉ áp dụng cho đơn mới. */
    @Transactional
    public void suaThuoc(Integer maThuoc, Thuoc b, Integer maTK) {
        timThay(tv.giaTri("SELECT TenThuoc FROM Thuoc WHERE MaThuoc = ?", maThuoc), "thuốc");
        kiemTraThuoc(maThuoc, b);
        tv.capNhat("""
                UPDATE Thuoc SET TenThuoc = ?, HoatChat = ?, HamLuong = ?, DonViTinh = ?, DonGia = ?, GiaBHYT = ?
                WHERE MaThuoc = ?""",
                b.tenThuoc().strip(), rong(b.hoatChat()), rong(b.hamLuong()), b.donViTinh().strip(), b.donGia(),
                b.giaBHYT(), maThuoc);
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "Thuoc", maThuoc, b.tenThuoc().strip());
    }

    @Transactional
    public void doiTrangThaiThuoc(Integer maThuoc, boolean hoatDong, Integer maTK) {
        String ten = timThay(tv.giaTri("SELECT TenThuoc FROM Thuoc WHERE MaThuoc = ?", maThuoc), "thuốc");
        tv.capNhat("UPDATE Thuoc SET TrangThai = ? WHERE MaThuoc = ?", hoatDong ? HOAT_DONG : NGUNG, maThuoc);
        nhatKy.ghi(maTK, hoatDong ? "MO_DANH_MUC" : "NGUNG_DANH_MUC", "Thuoc", maThuoc, ten);
    }

    private void kiemTraThuoc(Integer maThuoc, Thuoc b) {
        String ten = batBuoc(b.tenThuoc(), "tên thuốc");
        batBuoc(b.donViTinh(), "đơn vị tính");
        BigDecimal gia = khongAm(b.donGia(), "Đơn giá");
        if (b.giaBHYT() != null && (b.giaBHYT().signum() < 0 || b.giaBHYT().compareTo(gia) > 0)) {
            throw new LoiNghiepVu("Giá BHYT từ 0 đến đơn giá (để trống nếu thuốc ngoài danh mục BHYT)");
        }
        if (tv.dem("SELECT COUNT(*) FROM Thuoc WHERE TenThuoc = ? AND COALESCE(HamLuong, '') = ? AND MaThuoc <> ?",
                ten, rong(b.hamLuong()) == null ? "" : b.hamLuong().strip(), maThuoc == null ? 0 : maThuoc) > 0) {
            throw new LoiNghiepVu("Đã có thuốc " + ten + (rong(b.hamLuong()) == null ? "" : " " + b.hamLuong().strip()));
        }
    }

    // ================= Mã ICD-10 (UC3.8) =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsICD(String tuKhoa) {
        String k = rong(tuKhoa);
        return k == null ? tv.ds("SELECT MaICD, TenBenh, TrangThai FROM BenhICD ORDER BY MaICD")
                : tv.ds("SELECT MaICD, TenBenh, TrangThai FROM BenhICD WHERE MaICD LIKE ? OR TenBenh LIKE ? ORDER BY MaICD",
                        k + "%", "%" + k + "%");
    }

    @Transactional
    public void themICD(String maICD, String tenBenh, Integer maTK) {
        String ma = batBuoc(maICD, "mã ICD").toUpperCase();
        if (!ma.matches("[A-Z]\\d{2}(\\.\\d{1,2})?")) {
            throw new LoiNghiepVu("Mã ICD-10 gồm 1 chữ cái và 2 chữ số, có thể thêm phần thập phân (VD J06.9)");
        }
        String ten = batBuoc(tenBenh, "tên bệnh");
        if (tv.dem("SELECT COUNT(*) FROM BenhICD WHERE MaICD = ?", ma) > 0) {
            throw new LoiNghiepVu("Mã " + ma + " đã có trong danh mục");
        }
        tv.capNhat("INSERT INTO BenhICD (MaICD, TenBenh) VALUES (?, ?)", ma, ten);
        nhatKy.ghi(maTK, "THEM_DANH_MUC", "BenhICD", ma, ten);
    }

    @Transactional
    public void suaICD(String maICD, String tenBenh, Integer maTK) {
        timThay(tv.giaTri("SELECT TenBenh FROM BenhICD WHERE MaICD = ?", maICD), "mã ICD");
        String ten = batBuoc(tenBenh, "tên bệnh");
        tv.capNhat("UPDATE BenhICD SET TenBenh = ? WHERE MaICD = ?", ten, maICD);
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "BenhICD", maICD, ten);
    }

    @Transactional
    public void doiTrangThaiICD(String maICD, boolean hoatDong, Integer maTK) {
        String ten = timThay(tv.giaTri("SELECT TenBenh FROM BenhICD WHERE MaICD = ?", maICD), "mã ICD");
        tv.capNhat("UPDATE BenhICD SET TrangThai = ? WHERE MaICD = ?", hoatDong ? HOAT_DONG : NGUNG, maICD);
        nhatKy.ghi(maTK, hoatDong ? "MO_DANH_MUC" : "NGUNG_DANH_MUC", "BenhICD", maICD, ten);
    }

    // ================= Thông tin phòng khám (UC3.6) =================

    @Transactional(readOnly = true)
    public Map<String, Object> thongTin() {
        return tv.mot("SELECT * FROM ThongTinPhongKham WHERE Id = 1");
    }

    @Transactional
    public void luuThongTin(ThongTin b, Integer maTK) {
        String hotline = batBuoc(b.hotline(), "hotline").replaceAll("[\\s.-]", "");
        if (!hotline.matches("\\d{8,11}")) {
            throw new LoiNghiepVu("Hotline gồm 8 đến 11 chữ số");
        }
        String email = rong(b.email());
        if (email != null && !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
            throw new LoiNghiepVu("Email không hợp lệ");
        }
        String stk = rong(b.soTaiKhoan());
        if (stk != null && !stk.matches("\\d{6,30}")) {
            throw new LoiNghiepVu("Số tài khoản chỉ gồm chữ số");
        }
        tv.capNhat("""
                UPDATE ThongTinPhongKham SET TenPhongKham = ?, GioiThieu = ?, DiaChi = ?, GioLamViec = ?, Hotline = ?,
                       Email = ?, MaNganHang = ?, SoTaiKhoan = ?, TenTaiKhoan = ? WHERE Id = 1""",
                batBuoc(b.tenPhongKham(), "tên phòng khám"), rong(b.gioiThieu()), batBuoc(b.diaChi(), "địa chỉ"),
                batBuoc(b.gioLamViec(), "giờ làm việc"), hotline, email, rong(b.maNganHang()), stk,
                rong(b.tenTaiKhoan()) == null ? null : b.tenTaiKhoan().strip().toUpperCase());
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "ThongTinPhongKham", 1, "Cập nhật thông tin phòng khám");
    }

    // ================= Dùng chung =================

    private Integer moiNhat() {
        return ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
    }

    static <T> T timThay(T giaTri, String ten) {
        if (giaTri == null) {
            throw new KhongTimThay("Không tìm thấy " + ten);
        }
        return giaTri;
    }

    static String batBuoc(String s, String ten) {
        String v = rong(s);
        if (v == null) {
            throw new LoiNghiepVu("Vui lòng nhập " + ten);
        }
        return v;
    }

    private static BigDecimal khongAm(BigDecimal v, String ten) {
        if (v == null || v.signum() < 0) {
            throw new LoiNghiepVu(ten + " phải là số không âm");
        }
        return v;
    }

    static String rong(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
