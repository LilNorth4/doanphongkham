package vn.vietbac.phongkham.dichvu;

import java.sql.SQLIntegrityConstraintViolationException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.chung.ChuanHoa;
import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.MatKhau;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.kho.NhanVienRepository;
import vn.vietbac.phongkham.kho.QuyenRepository;
import vn.vietbac.phongkham.kho.TaiKhoanRepository;
import vn.vietbac.phongkham.kho.VaiTroRepository;
import vn.vietbac.phongkham.thucthe.NhanVien;
import vn.vietbac.phongkham.thucthe.Quyen;
import vn.vietbac.phongkham.thucthe.TaiKhoan;
import vn.vietbac.phongkham.thucthe.VaiTro;

/**
 * Gói 2 – quản lý tài khoản, phân quyền, nhật ký. Các hàm nhận maTKQuanTri là người thực hiện để ghi nhật ký;
 * quyền gọi (TAI_KHOAN.QUAN_LY, VAI_TRO.QUAN_LY, NHAT_KY.XEM) do controller kiểm tra bằng @CanQuyen.
 */
@Service
@RequiredArgsConstructor
public class QuanLyTaiKhoanService {

    /** BR11: bác sĩ cận lâm sàng phụ trách đúng loại phòng. */
    static final Map<String, List<String>> PHONG_CUA_VAI_TRO = Map.of(
            "BS_XET_NGHIEM", List.of("XET_NGHIEM"),
            "BS_CDHA", List.of("X_QUANG", "SIEU_AM"),
            "BS_NOI_SOI", List.of("NOI_SOI"));
    /** Bỏ các quyền này khỏi quản trị viên sẽ khóa luôn màn hình quản trị. */
    static final Set<String> QUYEN_GIU_CHO_QUAN_TRI = Set.of("TAI_KHOAN.QUAN_LY", "VAI_TRO.QUAN_LY");
    static final String TEN_NGUOI = "COALESCE(nv.HoTen, bn.HoTen, tk.Email, tk.SDT)";

    private final TaiKhoanRepository taiKhoanRepo;
    private final NhanVienRepository nhanVienRepo;
    private final VaiTroRepository vaiTroRepo;
    private final QuyenRepository quyenRepo;
    private final XacThucService xacThuc;
    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final TruyVan tv;
    private final DongHo dongHo;

    public record NhanVienMoi(String hoTen, String email, String sdt, String loaiNhanVien, LocalDate ngaySinh,
                              String gioiTinh, Integer maCK, String hocHamHocVi, Integer soNamKinhNghiem,
                              String gioiThieu, Integer maPhongPhuTrach) {
    }

    // ================= Hàm dùng chung =================

    private TaiKhoan taiKhoan(Integer maTK) {
        return taiKhoanRepo.khoa(maTK).orElseThrow(() -> new LoiNghiepVu("Không tìm thấy tài khoản"));
    }

    private NhanVien nhanVienCua(Integer maTK) {
        return nhanVienRepo.findByMaTK(maTK).orElse(null);
    }

    private boolean conQuanTriKhac(Integer maTK) {
        return taiKhoanRepo.demQuanTriKhac(maTK) > 0;
    }

    private String tenVaiTro(String maCode) {
        return vaiTroRepo.findByMaCode(maCode).map(VaiTro::getTenVaiTro).orElse(maCode);
    }

    /** Bác sĩ lâm sàng cần chuyên khoa; bác sĩ CLS cần phòng phụ trách đúng loại (BR11). Trả về {MaCK, MaPhong}. */
    private Integer[] kiemTraChuyenMon(String loai, Integer maCK, Integer maPhong) {
        if (!XacThucService.VAI_TRO_NHAN_VIEN.contains(loai)) {
            throw new LoiNghiepVu("Vai trò nhân viên không hợp lệ");
        }
        if (loai.equals("BAC_SI") && (maCK == null || tv.dem(
                "SELECT COUNT(*) FROM ChuyenKhoa WHERE MaCK = ? AND TrangThai = 'HOAT_DONG'", maCK) == 0)) {
            throw new LoiNghiepVu("Bác sĩ phải thuộc một chuyên khoa đang hoạt động");
        }
        List<String> loaiPhong = PHONG_CUA_VAI_TRO.get(loai);
        if (loaiPhong != null) {
            String lp = maPhong == null ? null
                    : tv.giaTri("SELECT LoaiPhong FROM Phong WHERE MaPhong = ? AND TrangThai = 'HOAT_DONG'", maPhong);
            if (lp == null || !loaiPhong.contains(lp)) {
                throw new LoiNghiepVu("Phòng phụ trách không phù hợp với vai trò của bác sĩ");
            }
        }
        return new Integer[] {loai.equals("BAC_SI") ? maCK : null, loaiPhong != null ? maPhong : null};
    }

    // ================= Danh sách, tạo, khóa, xóa tài khoản =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> danhSach(String vaiTro, String trangThai, String tuKhoa) {
        List<String> dk = new ArrayList<>(List.of("1 = 1"));
        List<Object> ts = new ArrayList<>();
        if (vaiTro != null && !vaiTro.isBlank()) {
            dk.add("vt.MaCode = ?");
            ts.add(vaiTro);
        }
        if (trangThai != null && !trangThai.isBlank()) {
            dk.add("tk.TrangThai = ?");
            ts.add(trangThai);
        }
        if (tuKhoa != null && !tuKhoa.isBlank()) {
            dk.add("(COALESCE(nv.HoTen, bn.HoTen) LIKE ? OR tk.Email LIKE ? OR tk.SDT LIKE ?)");
            for (int i = 0; i < 3; i++) ts.add("%" + tuKhoa + "%");
        }
        return tv.ds("""
                SELECT tk.MaTK, tk.Email, tk.SDT, vt.MaCode AS VaiTro, vt.TenVaiTro, tk.TrangThai, tk.LyDoKhoa,
                       tk.KhoaDen, tk.LanDangNhapCuoi, tk.NgayTao, nv.MaNV, bn.MaBN,
                       COALESCE(nv.HoTen, bn.HoTen) AS HoTen
                FROM TaiKhoan tk JOIN VaiTro vt ON vt.MaVaiTro = tk.MaVaiTro
                LEFT JOIN NhanVien nv ON nv.MaTK = tk.MaTK LEFT JOIN BenhNhan bn ON bn.MaTK = tk.MaTK
                WHERE %s ORDER BY tk.MaTK""".formatted(String.join(" AND ", dk)), ts.toArray());
    }

    /**
     * UC2.2: tạo hồ sơ nhân viên + tài khoản Hoạt động với mật khẩu tạm (gửi email, phải đổi khi đăng nhập
     * lần đầu). Trả về mã nhân viên và mật khẩu tạm để quản trị viên có thể báo trực tiếp.
     */
    @Transactional
    public Map<String, Object> taoNhanVien(Integer maTKQuanTri, NhanVienMoi b) {
        String hoTen = ChuanHoa.hoTen(b.hoTen());
        if (hoTen.isEmpty()) {
            throw new LoiNghiepVu("Vui lòng nhập họ tên");
        }
        String email = ChuanHoa.email(b.email());
        String sdt = ChuanHoa.sdt(b.sdt());
        String matKhau = MatKhau.matKhauTam();
        Integer[] cm = kiemTraChuyenMon(b.loaiNhanVien(), b.maCK(), b.maPhongPhuTrach());
        xacThuc.kiemTraTrungTaiKhoan(email, sdt, null);

        TaiKhoan tk = new TaiKhoan();
        tk.setEmail(email);
        tk.setSdt(sdt);
        tk.setMatKhauHash(MatKhau.bam(matKhau));
        tk.setVaiTro(xacThuc.vaiTro(b.loaiNhanVien()));
        tk.setTrangThai("HOAT_DONG");
        tk.setPhaiDoiMatKhau(true);
        tk.setNgayTao(dongHo.bayGio());
        taiKhoanRepo.save(tk);

        NhanVien nv = new NhanVien();
        nv.setMaTK(tk.getMaTK());
        nv.setHoTen(hoTen);
        nv.setNgaySinh(b.ngaySinh());
        nv.setGioiTinh(b.gioiTinh());
        nv.setSdt(sdt);
        nv.setEmail(email);
        nv.setLoaiNhanVien(b.loaiNhanVien());
        nv.setMaCK(cm[0]);
        nv.setHocHamHocVi(ChuanHoa.rongLaNull(b.hocHamHocVi()));
        nv.setSoNamKinhNghiem(b.soNamKinhNghiem());
        nv.setGioiThieu(ChuanHoa.rongLaNull(b.gioiThieu()));
        nv.setMaPhongPhuTrach(cm[1]);
        nhanVienRepo.save(nv);

        nhatKy.taiKhoan(maTKQuanTri, "TAO_TAI_KHOAN", tk.getMaTK(), "Tạo tài khoản nhân viên " + hoTen);
        nhatKy.taiKhoan(maTKQuanTri, "GAN_VAI_TRO", tk.getMaTK(), "Gán vai trò " + tk.getVaiTro().getTenVaiTro());
        thongBao.email(tk.getMaTK(), "TAI_KHOAN", "Tài khoản Phòng khám Việt Bắc",
                "Tài khoản của bạn đã được tạo. Tên đăng nhập: " + email + " hoặc " + sdt + ". Mật khẩu tạm thời: "
                        + matKhau + ". Vui lòng đổi mật khẩu ở lần đăng nhập đầu tiên.");
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("ma_nv", nv.getMaNV());
        kq.put("mat_khau_tam", matKhau);
        return kq;
    }

    /** Khóa tài khoản và đăng xuất khỏi mọi thiết bị. */
    @Transactional
    public void khoa(Integer maTK, String lyDo, Integer maTKQuanTri) {
        String ld = ChuanHoa.rongLaNull(lyDo);
        if (ld == null) {
            throw new LoiNghiepVu("Vui lòng nhập lý do khóa");
        }
        if (maTK.equals(maTKQuanTri)) {
            throw new LoiNghiepVu("Không thể tự khóa tài khoản của mình");
        }
        TaiKhoan tk = taiKhoan(maTK);
        if ("BI_KHOA".equals(tk.getTrangThai())) {
            throw new LoiNghiepVu("Tài khoản đã bị khóa");
        }
        if ("QUAN_TRI".equals(tk.getVaiTro().getMaCode()) && !conQuanTriKhac(maTK)) {
            throw new LoiNghiepVu("Phải còn ít nhất một quản trị viên hoạt động");
        }
        tk.setTrangThai("BI_KHOA");
        tk.setLyDoKhoa(ld);
        xacThuc.thuHoiPhien(maTK, null);
        nhatKy.taiKhoan(maTKQuanTri, "KHOA_TAI_KHOAN", maTK, ld);
    }

    /** Mở khóa tài khoản bị khóa, đồng thời gỡ khóa tạm do sai mật khẩu (BR15). */
    @Transactional
    public void moKhoa(Integer maTK, Integer maTKQuanTri) {
        TaiKhoan tk = taiKhoan(maTK);
        boolean tamKhoa = tk.getKhoaDen() != null && tk.getKhoaDen().isAfter(dongHo.bayGio());
        if (!"BI_KHOA".equals(tk.getTrangThai()) && !tamKhoa) {
            throw new LoiNghiepVu("Tài khoản không bị khóa");
        }
        if ("BI_KHOA".equals(tk.getTrangThai())) {
            tk.setTrangThai("HOAT_DONG");
        }
        tk.setLyDoKhoa(null);
        tk.setSoLanSai(0);
        tk.setKhoaDen(null);
        nhatKy.taiKhoan(maTKQuanTri, "MO_KHOA_TAI_KHOAN", maTK, null);
        thongBao.taiKhoan(maTK, "TAI_KHOAN", "Tài khoản đã được mở khóa",
                "Tài khoản của bạn đã được mở khóa, bạn có thể đăng nhập lại.");
    }

    /**
     * Xóa hẳn tài khoản kèm hồ sơ nhân viên/bệnh nhân, chỉ khi chưa phát sinh dữ liệu nghiệp vụ. Lịch hẹn, hồ sơ
     * bệnh án, ca làm việc... phải được giữ lại, nên khóa ngoại chặn lệnh DELETE thì chỉ có thể khóa tài khoản.
     */
    @Transactional
    public void xoa(Integer maTK, Integer maTKQuanTri) {
        if (maTK.equals(maTKQuanTri)) {
            throw new LoiNghiepVu("Không thể tự xóa tài khoản của mình");
        }
        TaiKhoan tk = taiKhoan(maTK);
        if ("QUAN_TRI".equals(tk.getVaiTro().getMaCode()) && !conQuanTriKhac(maTK)) {
            throw new LoiNghiepVu("Phải còn ít nhất một quản trị viên hoạt động");
        }
        Map<String, Object> bn = tv.mot("SELECT MaBN, HoTen FROM BenhNhan WHERE MaTK = ?", maTK);
        String hoTenNv = tv.giaTri("SELECT HoTen FROM NhanVien WHERE MaTK = ?", maTK);
        String hoTen = hoTenNv != null ? hoTenNv : bn != null ? (String) bn.get("HoTen") : "";
        String chiTiet = hoTen + " (" + (tk.getEmail() != null ? tk.getEmail() : tk.getSdt()) + ", "
                + tk.getVaiTro().getMaCode() + ")";
        try {
            // Dữ liệu thuần cá nhân; OTP và phiên đăng nhập tự xóa theo (ON DELETE CASCADE)
            if (bn != null) {
                tv.capNhat("DELETE FROM ThongBao WHERE MaTKNhan = ? OR MaBN = ?", maTK, bn.get("MaBN"));
                tv.capNhat("DELETE FROM TheBHYT WHERE MaBN = ?", bn.get("MaBN"));
                tv.capNhat("DELETE FROM BenhNhan WHERE MaBN = ?", bn.get("MaBN"));
            } else {
                tv.capNhat("DELETE FROM ThongBao WHERE MaTKNhan = ?", maTK);
            }
            tv.capNhat("DELETE FROM NhanVien WHERE MaTK = ?", maTK);
            tv.capNhat("DELETE FROM TaiKhoan WHERE MaTK = ?", maTK);
        } catch (RuntimeException e) {
            if (viPhamKhoaNgoai(e)) {
                throw new LoiNghiepVu("Tài khoản đã phát sinh dữ liệu (lịch hẹn, hồ sơ, ca làm việc...) "
                        + "nên không thể xóa. Hãy khóa tài khoản để giữ lịch sử");
            }
            throw e;
        }
        nhatKy.taiKhoan(maTKQuanTri, "XOA_TAI_KHOAN", maTK, chiTiet);
    }

    private static boolean viPhamKhoaNgoai(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof SQLIntegrityConstraintViolationException) {
                return true;
            }
        }
        return false;
    }

    /** UC2.5: cấp mật khẩu tạm mới qua email, bắt đổi ở lần đăng nhập sau, đăng xuất mọi thiết bị. */
    @Transactional
    public String capLaiMatKhau(Integer maTK, Integer maTKQuanTri) {
        String matKhau = MatKhau.matKhauTam();
        TaiKhoan tk = taiKhoan(maTK);
        if ("BI_KHOA".equals(tk.getTrangThai())) {
            throw new LoiNghiepVu("Tài khoản đang bị khóa, hãy mở khóa trước");
        }
        if (tk.getEmail() == null) {
            throw new LoiNghiepVu("Tài khoản chưa có email để nhận mật khẩu tạm");
        }
        tk.setMatKhauHash(MatKhau.bam(matKhau));
        tk.setPhaiDoiMatKhau(true);
        tk.setSoLanSai(0);
        tk.setKhoaDen(null);
        xacThuc.thuHoiPhien(maTK, null);
        nhatKy.taiKhoan(maTKQuanTri, "CAP_LAI_MAT_KHAU", maTK, null);
        thongBao.email(maTK, "TAI_KHOAN", "Mật khẩu tạm thời mới", "Quản trị viên đã cấp lại mật khẩu cho bạn. "
                + "Mật khẩu tạm thời: " + matKhau + ". Vui lòng đổi mật khẩu sau khi đăng nhập.");
        return matKhau;
    }

    /** UC2.6: đổi vai trò nhân viên (bệnh nhân không đổi sang vai trò nhân viên), có ghi nhật ký. */
    @Transactional
    public void ganVaiTro(Integer maTK, String vaiTroMoi, Integer maTKQuanTri, Integer maCK, Integer maPhong) {
        if (maTK.equals(maTKQuanTri)) {
            throw new LoiNghiepVu("Không thể tự đổi vai trò của mình");
        }
        TaiKhoan tk = taiKhoan(maTK);
        NhanVien nv = nhanVienCua(maTK);
        if (nv == null) {
            throw new LoiNghiepVu("Chỉ đổi được vai trò của tài khoản nhân viên");
        }
        Integer[] cm = kiemTraChuyenMon(vaiTroMoi, maCK, maPhong);
        String cu = tk.getVaiTro().getMaCode();
        if (cu.equals("QUAN_TRI") && !vaiTroMoi.equals("QUAN_TRI") && !conQuanTriKhac(maTK)) {
            throw new LoiNghiepVu("Phải còn ít nhất một quản trị viên hoạt động");
        }
        if (cu.equals("BAC_SI") && !vaiTroMoi.equals("BAC_SI") && tv.dem(
                "SELECT COUNT(*) FROM CaLamViec WHERE MaBS = ? AND NgayLam >= ?", nv.getMaNV(), dongHo.homNay()) > 0) {
            throw new LoiNghiepVu("Bác sĩ còn ca làm việc sắp tới, hãy xử lý lịch trước khi đổi vai trò");
        }
        tk.setVaiTro(xacThuc.vaiTro(vaiTroMoi));
        tv.capNhat("DELETE FROM TaiKhoanBoQuyen WHERE MaTK = ?", maTK); // vai trò mới: nhận đủ quyền của vai trò
        nv.setLoaiNhanVien(vaiTroMoi);
        nv.setMaCK(cm[0]);
        nv.setMaPhongPhuTrach(cm[1]);
        nhatKy.taiKhoan(maTKQuanTri, "GAN_VAI_TRO", maTK, tenVaiTro(cu) + " -> " + tenVaiTro(vaiTroMoi));
        thongBao.taiKhoan(maTK, "TAI_KHOAN", "Vai trò đã thay đổi",
                "Vai trò tài khoản của bạn đã được cập nhật, vui lòng đăng nhập lại để dùng chức năng mới.");
    }

    // ================= Phân quyền (UC2.7) =================

    /** Vai trò (kèm số tài khoản), danh mục quyền theo nhóm chức năng và quyền đang gán. */
    @Transactional(readOnly = true)
    public Map<String, Object> bangPhanQuyen() {
        List<Map<String, Object>> vaiTro = tv.ds("""
                SELECT vt.MaVaiTro, vt.MaCode, vt.TenVaiTro, vt.MoTa, COUNT(tk.MaTK) AS SoTaiKhoan
                FROM VaiTro vt LEFT JOIN TaiKhoan tk ON tk.MaVaiTro = vt.MaVaiTro
                GROUP BY vt.MaVaiTro ORDER BY vt.MaVaiTro""");
        List<Map<String, Object>> quyen = tv.ds("SELECT MaQuyen, MaCode, TenQuyen, NhomChucNang FROM Quyen ORDER BY MaQuyen");
        Map<String, List<String>> gan = new LinkedHashMap<>();
        vaiTro.forEach(v -> gan.put((String) v.get("MaCode"), new ArrayList<>()));
        for (Map<String, Object> r : tv.ds("""
                SELECT vt.MaCode AS VaiTro, q.MaCode AS Quyen FROM VaiTroQuyen vq
                JOIN VaiTro vt ON vt.MaVaiTro = vq.MaVaiTro JOIN Quyen q ON q.MaQuyen = vq.MaQuyen""")) {
            gan.get((String) r.get("VaiTro")).add((String) r.get("Quyen"));
        }
        Map<String, List<String>> nhomVaiTro = new LinkedHashMap<>();
        vaiTro.forEach(v -> nhomVaiTro.put((String) v.get("MaCode"), new ArrayList<>()));
        for (Map<String, Object> r : tv.ds("""
                SELECT vt.MaCode AS VaiTro, n.NhomChucNang FROM VaiTroNhomChucNang n
                JOIN VaiTro vt ON vt.MaVaiTro = n.MaVaiTro""")) {
            nhomVaiTro.get((String) r.get("VaiTro")).add((String) r.get("NhomChucNang"));
        }
        Map<Integer, List<String>> boRieng = new LinkedHashMap<>();
        for (Map<String, Object> r : tv.ds("""
                SELECT b.MaTK, q.MaCode FROM TaiKhoanBoQuyen b JOIN Quyen q ON q.MaQuyen = b.MaQuyen
                ORDER BY b.MaTK, q.MaQuyen""")) {
            boRieng.computeIfAbsent((Integer) r.get("MaTK"), k -> new ArrayList<>()).add((String) r.get("MaCode"));
        }
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("vai_tro", vaiTro);
        kq.put("quyen", quyen);
        kq.put("gan", gan);
        kq.put("nhom_vai_tro", nhomVaiTro);
        kq.put("bo_rieng", boRieng);
        return kq;
    }

    /** Thay toàn bộ quyền của một vai trò; nhật ký ghi phần thêm/bỏ bằng tên quyền. */
    @Transactional
    public void capNhatQuyenVaiTro(String maVaiTro, List<String> dsQuyen, Integer maTKQuanTri) {
        Set<String> moi = new HashSet<>(dsQuyen);
        if (maVaiTro.equals("QUAN_TRI") && !moi.containsAll(QUYEN_GIU_CHO_QUAN_TRI)) {
            throw new LoiNghiepVu("Không thể bỏ quyền quản lý tài khoản, vai trò của quản trị viên");
        }
        VaiTro vt = xacThuc.vaiTro(maVaiTro);
        List<Quyen> timThay = moi.isEmpty() ? List.of() : quyenRepo.findByMaCodeIn(moi);
        Set<String> thieu = new TreeSet<>(moi);
        timThay.forEach(q -> thieu.remove(q.getMaCode()));
        if (!thieu.isEmpty()) {
            throw new LoiNghiepVu("Không có quyền: " + String.join(", ", thieu));
        }
        // Chỉ gán được quyền thuộc nhóm chức năng của vai trò (VaiTroNhomChucNang)
        Set<String> nhomDuocPhep = tv.ds("SELECT NhomChucNang FROM VaiTroNhomChucNang WHERE MaVaiTro = ?", vt.getMaVaiTro())
                .stream().map(r -> (String) r.get("NhomChucNang")).collect(Collectors.toSet());
        List<String> ngoaiNhom = timThay.stream().filter(q -> !nhomDuocPhep.contains(q.getNhomChucNang()))
                .map(Quyen::getTenQuyen).sorted().toList();
        if (!ngoaiNhom.isEmpty()) {
            throw new LoiNghiepVu("Vai trò " + vt.getTenVaiTro() + " không có nhóm chức năng của quyền: "
                    + String.join(", ", ngoaiNhom));
        }
        Set<String> cu = vt.getQuyen().stream().map(Quyen::getMaCode).collect(Collectors.toSet());
        vt.getQuyen().clear();
        vt.getQuyen().addAll(timThay);
        // Quyền đã bỏ khỏi vai trò thì dòng bỏ riêng của quyền đó không còn ý nghĩa
        List<Object> thamSo = new ArrayList<>(List.of(vt.getMaVaiTro()));
        thamSo.addAll(moi);
        tv.capNhat("""
                DELETE b FROM TaiKhoanBoQuyen b JOIN TaiKhoan tk ON tk.MaTK = b.MaTK JOIN Quyen q ON q.MaQuyen = b.MaQuyen
                WHERE tk.MaVaiTro = ?""" + (moi.isEmpty() ? "" : " AND q.MaCode NOT IN ("
                        + String.join(",", Collections.nCopies(moi.size(), "?")) + ")"), thamSo.toArray());

        Map<String, String> ten = quyenRepo.findAll().stream()
                .collect(Collectors.toMap(Quyen::getMaCode, Quyen::getTenQuyen));
        List<String> them = new TreeSet<>(moi).stream().filter(q -> !cu.contains(q)).map(ten::get).toList();
        List<String> bo = new TreeSet<>(cu).stream().filter(q -> !moi.contains(q)).map(ten::get).toList();
        List<String> phan = new ArrayList<>();
        if (!them.isEmpty()) phan.add("Thêm: " + String.join(", ", them));
        if (!bo.isEmpty()) phan.add("Bỏ: " + String.join(", ", bo));
        nhatKy.ghi(maTKQuanTri, "CAP_NHAT_QUYEN", "VaiTro", vt.getMaVaiTro(),
                phan.isEmpty() ? "Không thay đổi" : String.join("; ", phan));
    }

    /**
     * Phân quyền riêng một tài khoản: chỉ chọn trong các quyền của vai trò, quyền không chọn bị bỏ riêng
     * với tài khoản này. Có hiệu lực ngay ở yêu cầu kế tiếp của tài khoản đó.
     */
    @Transactional
    public void capNhatQuyenTaiKhoan(Integer maTK, List<String> dsQuyen, Integer maTKQuanTri) {
        TaiKhoan tk = taiKhoan(maTK);
        VaiTro vt = tk.getVaiTro();
        Set<String> moi = new HashSet<>(dsQuyen);
        Map<String, Quyen> cuaVaiTro = vt.getQuyen().stream()
                .collect(Collectors.toMap(Quyen::getMaCode, Function.identity()));
        Set<String> ngoai = new TreeSet<>(moi);
        ngoai.removeAll(cuaVaiTro.keySet());
        if (!ngoai.isEmpty()) {
            throw new LoiNghiepVu("Chỉ chọn được quyền thuộc vai trò " + vt.getTenVaiTro() + ": " + String.join(", ", ngoai));
        }
        if (vt.getMaCode().equals("QUAN_TRI") && !moi.containsAll(QUYEN_GIU_CHO_QUAN_TRI)) {
            throw new LoiNghiepVu("Không thể bỏ quyền quản lý tài khoản, vai trò của quản trị viên");
        }
        Set<String> cu = new HashSet<>(cuaVaiTro.keySet());
        tv.ds("""
                SELECT q.MaCode FROM TaiKhoanBoQuyen b JOIN Quyen q ON q.MaQuyen = b.MaQuyen WHERE b.MaTK = ?""", maTK)
                .forEach(r -> cu.remove((String) r.get("MaCode")));

        tv.capNhat("DELETE FROM TaiKhoanBoQuyen WHERE MaTK = ?", maTK);
        for (Quyen q : cuaVaiTro.values()) {
            if (!moi.contains(q.getMaCode())) {
                tv.capNhat("INSERT INTO TaiKhoanBoQuyen (MaTK, MaQuyen) VALUES (?, ?)", maTK, q.getMaQuyen());
            }
        }

        List<String> them = new TreeSet<>(moi).stream().filter(q -> !cu.contains(q))
                .map(q -> cuaVaiTro.get(q).getTenQuyen()).toList();
        List<String> bo = new TreeSet<>(cu).stream().filter(q -> !moi.contains(q))
                .map(q -> cuaVaiTro.get(q).getTenQuyen()).toList();
        List<String> phan = new ArrayList<>();
        if (!them.isEmpty()) phan.add("Thêm: " + String.join(", ", them));
        if (!bo.isEmpty()) phan.add("Bỏ: " + String.join(", ", bo));
        nhatKy.taiKhoan(maTKQuanTri, "CAP_NHAT_QUYEN", maTK, phan.isEmpty() ? "Không thay đổi" : String.join("; ", phan));
    }

    // ================= Hồ sơ nhân viên, chi tiết tài khoản =================

    /** Các trường sửa được và cách đọc/ghi trên entity NhanVien. */
    private static final Map<String, Function<NhanVien, Object>> DOC = Map.of(
            "HoTen", NhanVien::getHoTen, "NgaySinh", NhanVien::getNgaySinh, "GioiTinh", NhanVien::getGioiTinh,
            "SDT", NhanVien::getSdt, "Email", NhanVien::getEmail, "DiaChi", NhanVien::getDiaChi,
            "HocHamHocVi", NhanVien::getHocHamHocVi, "SoNamKinhNghiem", NhanVien::getSoNamKinhNghiem,
            "GioiThieu", NhanVien::getGioiThieu);

    /**
     * Cập nhật hồ sơ nhân viên; email/SĐT đồng bộ sang tài khoản đăng nhập (UC1.3). Chuyên khoa và phòng
     * phụ trách đổi qua ganVaiTro để giữ ràng buộc BR11. truong: tên cột -> giá trị mới (chỉ các trường gửi lên).
     */
    @Transactional
    public void capNhatNhanVien(Integer maTK, Integer maTKQuanTri, Map<String, Object> truong) {
        Map<String, Object> t = new LinkedHashMap<>(truong);
        if (t.containsKey("HoTen")) {
            String ht = ChuanHoa.hoTen((String) t.get("HoTen"));
            if (ht.isEmpty()) {
                throw new LoiNghiepVu("Vui lòng nhập họ tên");
            }
            t.put("HoTen", ht);
        }
        if (t.containsKey("Email")) {
            t.put("Email", ChuanHoa.email((String) t.get("Email")));
        }
        if (t.containsKey("SDT")) {
            t.put("SDT", ChuanHoa.sdt((String) t.get("SDT")));
        }
        TaiKhoan tk = taiKhoan(maTK);
        NhanVien nv = nhanVienCua(maTK);
        if (nv == null) {
            throw new LoiNghiepVu("Chỉ cập nhật được hồ sơ nhân viên");
        }
        xacThuc.kiemTraTrungTaiKhoan((String) t.get("Email"), (String) t.get("SDT"), maTK);

        Map<String, Object[]> doi = new LinkedHashMap<>();
        t.forEach((k, v) -> {
            Object cu = DOC.get(k).apply(nv);
            if (!Objects.equals(cu == null ? "" : String.valueOf(cu), v == null ? "" : String.valueOf(v))) {
                doi.put(k, new Object[] {cu, v});
            }
        });
        if (doi.isEmpty()) {
            return;
        }
        doi.forEach((k, cuMoi) -> ghi(nv, k, cuMoi[1]));
        List<String> dangNhap = new ArrayList<>();
        if (doi.containsKey("Email")) {
            tk.setEmail(nv.getEmail());
            dangNhap.add("email");
        }
        if (doi.containsKey("SDT")) {
            tk.setSdt(nv.getSdt());
            dangNhap.add("số điện thoại");
        }
        if (!dangNhap.isEmpty()) {
            thongBao.taiKhoan(maTK, "TAI_KHOAN", "Thông tin đăng nhập đã thay đổi",
                    "Quản trị viên đã cập nhật " + String.join(" và ", dangNhap) + " đăng nhập của bạn.");
        }
        nhatKy.taiKhoan(maTKQuanTri, "CAP_NHAT_NHAN_VIEN", maTK, doi.entrySet().stream()
                .map(e -> e.getKey() + ": " + hien(e.getValue()[0]) + " -> " + hien(e.getValue()[1]))
                .collect(Collectors.joining("; ")));
    }

    private static String hien(Object v) {
        return v == null ? "—" : String.valueOf(v);
    }

    private static void ghi(NhanVien nv, String truong, Object v) {
        switch (truong) {
            case "HoTen" -> nv.setHoTen((String) v);
            case "NgaySinh" -> nv.setNgaySinh(v == null ? null : LocalDate.parse(String.valueOf(v)));
            case "GioiTinh" -> nv.setGioiTinh((String) v);
            case "SDT" -> nv.setSdt((String) v);
            case "Email" -> nv.setEmail((String) v);
            case "DiaChi" -> nv.setDiaChi((String) v);
            case "HocHamHocVi" -> nv.setHocHamHocVi((String) v);
            case "SoNamKinhNghiem" -> nv.setSoNamKinhNghiem(v == null ? null : ((Number) v).intValue());
            case "GioiThieu" -> nv.setGioiThieu((String) v);
            default -> throw new IllegalArgumentException("Trường không hợp lệ: " + truong);
        }
    }

    /** Chi tiết tài khoản cho quản trị viên: hồ sơ, phiên đăng nhập còn hiệu lực, nhật ký liên quan. */
    @Transactional(readOnly = true)
    public Map<String, Object> chiTiet(Integer maTK) {
        Map<String, Object> tk = tv.mot("""
                SELECT tk.MaTK, tk.Email, tk.SDT, tk.TrangThai, tk.LyDoKhoa, tk.KhoaDen, tk.SoLanSai, tk.PhaiDoiMatKhau,
                       tk.LanDangNhapCuoi, tk.NgayTao, vt.MaCode AS VaiTro, vt.TenVaiTro
                FROM TaiKhoan tk JOIN VaiTro vt ON vt.MaVaiTro = tk.MaVaiTro WHERE tk.MaTK = ?""", maTK);
        if (tk == null) {
            throw new LoiNghiepVu("Không tìm thấy tài khoản");
        }
        tk.put("NhanVien", tv.mot("""
                SELECT nv.*, ck.TenCK, p.MaSoPhong, p.TenPhong FROM NhanVien nv
                LEFT JOIN ChuyenKhoa ck ON ck.MaCK = nv.MaCK LEFT JOIN Phong p ON p.MaPhong = nv.MaPhongPhuTrach
                WHERE nv.MaTK = ?""", maTK));
        tk.put("BenhNhan", tv.mot("""
                SELECT bn.*, (SELECT COUNT(*) FROM LuotKham lk WHERE lk.MaBN = bn.MaBN) AS SoLuotKham
                FROM BenhNhan bn WHERE bn.MaTK = ?""", maTK));
        tk.put("Phien", tv.ds("""
                SELECT MaPhien, ThietBi, NgayTao, HetHan FROM PhienDangNhap
                WHERE MaTK = ? AND DaThuHoi = FALSE AND HetHan > ? ORDER BY NgayTao DESC""", maTK, dongHo.bayGio()));
        tk.put("NhatKy", nhatKyThaoTac(null, null, null, null, maTK, null, 50));
        return tk;
    }

    /** Đăng xuất tài khoản khỏi mọi thiết bị (VD: nghi lộ mật khẩu). */
    @Transactional
    public int thuHoiPhien(Integer maTK, Integer maTKQuanTri) {
        taiKhoan(maTK);
        int so = xacThuc.thuHoiPhien(maTK, null);
        nhatKy.taiKhoan(maTKQuanTri, "THU_HOI_PHIEN", maTK, "Thu hồi " + so + " phiên đăng nhập");
        return so;
    }

    // ================= Nhật ký (UC2.8) =================

    /**
     * Nhật ký thao tác quản trị. maTK: người thực hiện; maTKLienQuan: tài khoản là người thực hiện
     * hoặc đối tượng bị tác động.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> nhatKyThaoTac(LocalDate tuNgay, LocalDate denNgay, String hanhDong, Integer maTK,
                                                   Integer maTKLienQuan, String tuKhoa, int gioiHan) {
        List<String> dk = new ArrayList<>(List.of("1 = 1"));
        List<Object> ts = new ArrayList<>();
        if (tuNgay != null) {
            dk.add("nk.ThoiGian >= ?");
            ts.add(tuNgay);
        }
        if (denNgay != null) {
            dk.add("nk.ThoiGian < ?");
            ts.add(denNgay.plusDays(1));
        }
        if (hanhDong != null && !hanhDong.isBlank()) {
            dk.add("nk.HanhDong = ?");
            ts.add(hanhDong);
        }
        if (maTK != null) {
            dk.add("nk.MaTK = ?");
            ts.add(maTK);
        }
        if (maTKLienQuan != null) {
            dk.add("(nk.MaTK = ? OR (nk.DoiTuong = 'TaiKhoan' AND nk.MaDoiTuong = ?))");
            ts.add(maTKLienQuan);
            ts.add(String.valueOf(maTKLienQuan));
        }
        if (tuKhoa != null && !tuKhoa.isBlank()) {
            dk.add("(nk.ChiTiet LIKE ? OR nk.MaDoiTuong LIKE ? OR " + TEN_NGUOI
                    + " LIKE ? OR COALESCE(nv2.HoTen, bn2.HoTen, tk2.Email) LIKE ?)");
            for (int i = 0; i < 4; i++) ts.add("%" + tuKhoa + "%");
        }
        ts.add(gioiHan);
        return tv.ds("""
                SELECT nk.MaNK, nk.ThoiGian, nk.HanhDong, nk.DoiTuong, nk.MaDoiTuong, nk.ChiTiet, nk.MaTK,
                       %s AS NguoiThucHien, vt.MaCode AS VaiTroNguoiThucHien,
                       COALESCE(nv2.HoTen, bn2.HoTen, tk2.Email, tk2.SDT, CONCAT('Vai trò ', vt2.TenVaiTro)) AS TenDoiTuong
                FROM NhatKyThaoTac nk
                LEFT JOIN TaiKhoan tk ON tk.MaTK = nk.MaTK LEFT JOIN VaiTro vt ON vt.MaVaiTro = tk.MaVaiTro
                LEFT JOIN NhanVien nv ON nv.MaTK = tk.MaTK LEFT JOIN BenhNhan bn ON bn.MaTK = tk.MaTK
                LEFT JOIN TaiKhoan tk2 ON nk.DoiTuong = 'TaiKhoan' AND tk2.MaTK = nk.MaDoiTuong
                LEFT JOIN NhanVien nv2 ON nv2.MaTK = tk2.MaTK LEFT JOIN BenhNhan bn2 ON bn2.MaTK = tk2.MaTK
                LEFT JOIN VaiTro vt2 ON nk.DoiTuong = 'VaiTro' AND vt2.MaVaiTro = nk.MaDoiTuong
                WHERE %s ORDER BY nk.ThoiGian DESC, nk.MaNK DESC LIMIT ?""".formatted(TEN_NGUOI, String.join(" AND ", dk)),
                ts.toArray());
    }

    /**
     * Ai đã truy cập hồ sơ bệnh án của ai, khi nào. ngoaiDieuTri=true: chỉ các lần người truy cập không phải
     * bác sĩ điều trị và cũng không phải chính bệnh nhân (dấu hiệu cần rà soát).
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> nhatKyTruyCap(LocalDate tuNgay, LocalDate denNgay, String thaoTac, String tuKhoa,
                                                   boolean ngoaiDieuTri) {
        List<String> dk = new ArrayList<>(List.of("1 = 1"));
        List<Object> ts = new ArrayList<>();
        if (tuNgay != null) {
            dk.add("nk.ThoiGian >= ?");
            ts.add(tuNgay);
        }
        if (denNgay != null) {
            dk.add("nk.ThoiGian < ?");
            ts.add(denNgay.plusDays(1));
        }
        if (thaoTac != null && !thaoTac.isBlank()) {
            dk.add("nk.ThaoTac = ?");
            ts.add(thaoTac);
        }
        if (tuKhoa != null && !tuKhoa.isBlank()) {
            dk.add("(" + TEN_NGUOI + " LIKE ? OR bnhs.HoTen LIKE ? OR lk.MaLichHen LIKE ?)");
            for (int i = 0; i < 3; i++) ts.add("%" + tuKhoa + "%");
        }
        if (ngoaiDieuTri) {
            dk.add("nk.MaTK <> bsdt.MaTK AND (bnhs.MaTK IS NULL OR nk.MaTK <> bnhs.MaTK)");
        }
        return tv.ds("""
                SELECT nk.MaNK, nk.ThoiGian, nk.ThaoTac, nk.MaTK, %s AS NguoiTruyCap,
                       vt.MaCode AS VaiTro, hs.MaHSBA, lk.MaLK, lk.MaLichHen, lk.NgayKham,
                       bnhs.MaBN, bnhs.HoTen AS BenhNhan, bsdt.HoTen AS BacSiDieuTri,
                       (nk.MaTK = bsdt.MaTK) AS LaBacSiDieuTri, (nk.MaTK = bnhs.MaTK) AS LaChinhBenhNhan
                FROM NhatKyTruyCapHoSo nk
                JOIN HoSoBenhAn hs ON hs.MaHSBA = nk.MaHSBA JOIN LuotKham lk ON lk.MaLK = hs.MaLK
                JOIN BenhNhan bnhs ON bnhs.MaBN = lk.MaBN JOIN NhanVien bsdt ON bsdt.MaNV = lk.MaBS
                JOIN TaiKhoan tk ON tk.MaTK = nk.MaTK JOIN VaiTro vt ON vt.MaVaiTro = tk.MaVaiTro
                LEFT JOIN NhanVien nv ON nv.MaTK = tk.MaTK LEFT JOIN BenhNhan bn ON bn.MaTK = tk.MaTK
                WHERE %s ORDER BY nk.ThoiGian DESC, nk.MaNK DESC LIMIT 500""".formatted(TEN_NGUOI, String.join(" AND ", dk)),
                ts.toArray());
    }
}
