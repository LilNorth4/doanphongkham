package vn.vietbac.phongkham.dichvu;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.chung.ChuanHoa;
import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LoiXacThuc;
import vn.vietbac.phongkham.chung.MatKhau;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.kho.BenhNhanRepository;
import vn.vietbac.phongkham.kho.MaOtpRepository;
import vn.vietbac.phongkham.kho.PhienDangNhapRepository;
import vn.vietbac.phongkham.kho.TaiKhoanRepository;
import vn.vietbac.phongkham.kho.VaiTroRepository;
import vn.vietbac.phongkham.thucthe.BenhNhan;
import vn.vietbac.phongkham.thucthe.MaOtp;
import vn.vietbac.phongkham.thucthe.PhienDangNhap;
import vn.vietbac.phongkham.thucthe.TaiKhoan;
import vn.vietbac.phongkham.thucthe.VaiTro;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/**
 * Gói 1 – tài khoản, đăng nhập (BR15). Bệnh nhân tự đăng ký và xác thực email; nhân viên do quản trị viên
 * cấp tài khoản (QuanLyTaiKhoanService). Mọi tác nhân đăng nhập chung một luồng bằng email hoặc SĐT.
 */
@Service
@RequiredArgsConstructor
public class XacThucService {

    public static final int SO_LAN_SAI_TOI_DA = 5;
    static final Duration THOI_GIAN_KHOA = Duration.ofMinutes(15);
    static final Duration HAN_OTP = Duration.ofMinutes(5);
    static final Duration GIAN_CACH_GUI_OTP = Duration.ofSeconds(60);
    static final Duration HAN_PHIEN = Duration.ofDays(30);
    public static final Set<String> VAI_TRO_NHAN_VIEN = Set.of("LE_TAN", "BAC_SI", "BS_XET_NGHIEM", "BS_CDHA",
            "BS_NOI_SOI", "QUAN_TRI");
    static final String LOI_DANG_NHAP = "Email/số điện thoại hoặc mật khẩu không đúng";
    private static final String LOI_OTP_HET_HAN = "Mã OTP đã hết hạn hoặc không tồn tại, vui lòng yêu cầu mã mới";
    private static final DateTimeFormatter GIO_NGAY = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    // So khớp với hash giả khi không có tài khoản để thời gian phản hồi không lộ email/SĐT nào tồn tại
    private static final String HASH_GIA = MatKhau.bam(MatKhau.token());

    private final TaiKhoanRepository taiKhoanRepo;
    private final VaiTroRepository vaiTroRepo;
    private final MaOtpRepository otpRepo;
    private final PhienDangNhapRepository phienRepo;
    private final BenhNhanRepository benhNhanRepo;
    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final TruyVan tv;
    private final DongHo dongHo;

    // ================= Hàm dùng chung =================

    /** Tìm tài khoản theo email hoặc SĐT (khóa dòng để cập nhật bộ đếm an toàn). */
    public TaiKhoan timTaiKhoan(String dinhDanh) {
        String[] c = ChuanHoa.dinhDanh(dinhDanh);
        return (c[0].equals("Email") ? taiKhoanRepo.khoaTheoEmail(c[1]) : taiKhoanRepo.khoaTheoSdt(c[1])).orElse(null);
    }

    public VaiTro vaiTro(String maCode) {
        return vaiTroRepo.findByMaCode(maCode).orElseThrow(() -> new LoiNghiepVu("Không có vai trò " + maCode));
    }

    public void kiemTraTrungTaiKhoan(String email, String sdt, Integer truMaTK) {
        int tru = truMaTK == null ? 0 : truMaTK;
        if (email != null) {
            kiemTraTrung(taiKhoanRepo.findByEmailAndMaTKNot(email, tru).orElse(null), "Email");
        }
        if (sdt != null) {
            kiemTraTrung(taiKhoanRepo.findBySdtAndMaTKNot(sdt, tru).orElse(null), "Số điện thoại");
        }
    }

    private static void kiemTraTrung(TaiKhoan tk, String ten) {
        if (tk == null) {
            return;
        }
        if ("CHUA_KICH_HOAT".equals(tk.getTrangThai())) {
            throw new LoiNghiepVu(ten + " đã được đăng ký nhưng chưa xác thực. "
                    + "Vui lòng nhập mã OTP hoặc yêu cầu gửi lại mã");
        }
        throw new LoiNghiepVu(ten + " đã được dùng cho tài khoản khác");
    }

    // ================= Mã OTP (UC1.2, UC1.4) =================

    /** Hủy mã cũ cùng mục đích, sinh mã 6 số hạn 5 phút và xếp hàng gửi email. */
    public void taoOtp(Integer maTK, String email, String mucDich) {
        if (email == null) {
            throw new LoiNghiepVu("Tài khoản chưa có email để nhận mã OTP, vui lòng liên hệ lễ tân");
        }
        LocalDateTime bayGio = dongHo.bayGio();
        LocalDateTime ganNhat = otpRepo.lanGuiGanNhat(maTK, mucDich);
        if (ganNhat != null && Duration.between(ganNhat, bayGio).compareTo(GIAN_CACH_GUI_OTP) < 0) {
            long con = GIAN_CACH_GUI_OTP.minus(Duration.between(ganNhat, bayGio)).toSeconds();
            throw new LoiNghiepVu("Vui lòng chờ " + con + " giây trước khi yêu cầu mã mới");
        }
        otpRepo.huyMaCu(maTK, mucDich);
        MaOtp otp = new MaOtp();
        otp.setMaTK(maTK);
        otp.setMaSo(MatKhau.otp());
        otp.setMucDich(mucDich);
        otp.setHetHan(bayGio.plus(HAN_OTP));
        otp.setNgayTao(bayGio);
        otpRepo.save(otp);
        String viec = mucDich.equals("XAC_THUC_EMAIL") ? "xác thực email" : "khôi phục mật khẩu";
        thongBao.email(maTK, "TAI_KHOAN", "Mã OTP " + viec, "Mã OTP " + viec + " của bạn là " + otp.getMaSo()
                + ", có hiệu lực 5 phút. Không chia sẻ mã này cho người khác.");
    }

    /**
     * Trả về null nếu mã đúng (và đánh dấu đã dùng), ngược lại trả về thông báo lỗi.
     * Không ném lỗi ở đây để giao dịch vẫn lưu số lần nhập sai; quá 5 lần thì mã bị vô hiệu.
     */
    public String xacMinhOtp(Integer maTK, String mucDich, String maSo) {
        MaOtp otp = otpRepo.findFirstByMaTKAndMucDichAndDaDungFalseAndHetHanGreaterThanEqualOrderByMaOtpDesc(
                maTK, mucDich, dongHo.bayGio()).orElse(null);
        if (otp == null) {
            return LOI_OTP_HET_HAN;
        }
        if (!otp.getMaSo().equals(maSo == null ? "" : maSo.strip())) {
            int soLan = otp.getSoLanSai() + 1;
            otp.setSoLanSai(soLan);
            otp.setDaDung(soLan >= SO_LAN_SAI_TOI_DA);
            if (soLan >= SO_LAN_SAI_TOI_DA) {
                return "Nhập sai mã OTP quá 5 lần, vui lòng yêu cầu mã mới";
            }
            return "Mã OTP không đúng, còn " + (SO_LAN_SAI_TOI_DA - soLan) + " lần thử";
        }
        otp.setDaDung(true);
        return null;
    }

    // ================= Bệnh nhân đăng ký (UC1.1, UC1.2) =================

    /**
     * UC1.1: tạo tài khoản Chưa kích hoạt và gửi OTP xác thực email (UC1.2).
     * Nếu lễ tân đã tạo hồ sơ cho người này (BR23: hồ sơ chưa có tài khoản, trùng SĐT, họ tên, ngày sinh;
     * hoặc trùng CCCD) thì gắn tài khoản vào hồ sơ đó để giữ lịch sử khám.
     */
    @Transactional
    public Integer dangKyBenhNhan(String hoTenNhap, LocalDate ngaySinh, String gioiTinh, String sdtNhap,
                                  String emailNhap, String matKhau, String cccdNhap, String diaChiNhap) {
        String hoTen = ChuanHoa.hoTen(hoTenNhap);
        if (hoTen.isEmpty()) {
            throw new LoiNghiepVu("Vui lòng nhập họ tên");
        }
        if (ngaySinh == null || ngaySinh.isAfter(dongHo.homNay())) {
            throw new LoiNghiepVu("Ngày sinh không hợp lệ");
        }
        if (!"NAM".equals(gioiTinh) && !"NU".equals(gioiTinh)) {
            throw new LoiNghiepVu("Giới tính không hợp lệ");
        }
        String cccd = ChuanHoa.rongLaNull(cccdNhap);
        String diaChi = ChuanHoa.rongLaNull(diaChiNhap);
        ChuanHoa.cccd(cccd);
        String sdt = ChuanHoa.sdt(sdtNhap);
        String email = ChuanHoa.email(emailNhap);
        ChuanHoa.doManhMatKhau(matKhau);

        kiemTraTrungTaiKhoan(email, sdt, null);
        TaiKhoan tk = new TaiKhoan();
        tk.setEmail(email);
        tk.setSdt(sdt);
        tk.setMatKhauHash(MatKhau.bam(matKhau));
        tk.setVaiTro(vaiTro("BENH_NHAN"));
        tk.setTrangThai("CHUA_KICH_HOAT");
        tk.setNgayTao(dongHo.bayGio());
        taiKhoanRepo.save(tk);

        BenhNhan hoSo = null;
        if (cccd != null) {
            hoSo = benhNhanRepo.findFirstByCccd(cccd).orElse(null);
            if (hoSo != null && (hoSo.getMaTK() != null || !trungTen(hoSo, hoTen, ngaySinh))) {
                throw new LoiNghiepVu("Số CCCD đã thuộc hồ sơ khác, vui lòng liên hệ lễ tân");
            }
        }
        if (hoSo == null) {
            // Hồ sơ đã có CCCD thì chỉ gắn khi người đăng ký nhập đúng CCCD (nhánh trên)
            hoSo = benhNhanRepo.findBySdtAndNgaySinhAndMaTKIsNullAndCccdIsNullOrderByMaBN(sdt, ngaySinh).stream()
                    .filter(bn -> trungTen(bn, hoTen, ngaySinh)).findFirst().orElse(null);
        }
        if (hoSo != null) {
            hoSo.setMaTK(tk.getMaTK());
            hoSo.setEmail(email);
            if (hoSo.getGioiTinh() == null) hoSo.setGioiTinh(gioiTinh);
            if (hoSo.getCccd() == null) hoSo.setCccd(cccd);
            if (hoSo.getDiaChi() == null) hoSo.setDiaChi(diaChi);
        } else {
            BenhNhan bn = new BenhNhan();
            bn.setMaTK(tk.getMaTK());
            bn.setHoTen(hoTen);
            bn.setNgaySinh(ngaySinh);
            bn.setGioiTinh(gioiTinh);
            bn.setSdt(sdt);
            bn.setCccd(cccd);
            bn.setEmail(email);
            bn.setDiaChi(diaChi);
            bn.setNgayTao(dongHo.bayGio());
            benhNhanRepo.save(bn);
        }
        taoOtp(tk.getMaTK(), email, "XAC_THUC_EMAIL");
        return tk.getMaTK();
    }

    private static boolean trungTen(BenhNhan bn, String hoTen, LocalDate ngaySinh) {
        return bn.getHoTen().equalsIgnoreCase(hoTen) && ngaySinh.equals(bn.getNgaySinh());
    }

    /** UC1.2: nhập đúng OTP -> tài khoản Hoạt động. */
    @Transactional(noRollbackFor = LoiNghiepVu.class)
    public Integer xacThucEmail(String dinhDanh, String maSo) {
        TaiKhoan tk = timTaiKhoan(dinhDanh);
        if (tk == null || !"CHUA_KICH_HOAT".equals(tk.getTrangThai())) {
            throw new LoiNghiepVu("Tài khoản không ở trạng thái chờ xác thực");
        }
        String loi = xacMinhOtp(tk.getMaTK(), "XAC_THUC_EMAIL", maSo);
        if (loi != null) {
            throw new LoiNghiepVu(loi);
        }
        tk.setTrangThai("HOAT_DONG");
        thongBao.taiKhoan(tk.getMaTK(), "TAI_KHOAN", "Đăng ký thành công",
                "Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập và đặt lịch khám.");
        return tk.getMaTK();
    }

    /** UC1.2 luồng phụ: mã hết hạn hoặc chưa nhận được email. */
    @Transactional
    public void guiLaiMaXacThuc(String dinhDanh) {
        TaiKhoan tk = timTaiKhoan(dinhDanh);
        if (tk == null || !"CHUA_KICH_HOAT".equals(tk.getTrangThai())) {
            throw new LoiNghiepVu("Tài khoản không ở trạng thái chờ xác thực");
        }
        taoOtp(tk.getMaTK(), tk.getEmail(), "XAC_THUC_EMAIL");
    }

    // ================= Phiên đăng nhập =================

    public String taoPhien(Integer maTK, String thietBi) {
        String token = MatKhau.token();
        PhienDangNhap p = new PhienDangNhap();
        p.setMaTK(maTK);
        p.setTokenHash(MatKhau.sha256(token));
        p.setThietBi(thietBi == null || thietBi.isBlank() ? null : thietBi.substring(0, Math.min(255, thietBi.length())));
        p.setNgayTao(dongHo.bayGio());
        p.setHetHan(dongHo.bayGio().plus(HAN_PHIEN));
        phienRepo.save(p);
        return token;
    }

    /** Thu hồi mọi phiên của tài khoản (trừ phiên đang dùng nếu có), dùng khi đổi mật khẩu/khóa tài khoản. */
    public int thuHoiPhien(Integer maTK, String giuToken) {
        return phienRepo.thuHoi(maTK, giuToken == null ? "" : MatKhau.sha256(giuToken));
    }

    /** Thông tin người dùng sau đăng nhập: vai trò, hồ sơ gắn kèm và danh sách quyền (UC2.7). */
    public NguoiDung thongTinTaiKhoan(Integer maTK) {
        Map<String, Object> r = tv.mot("""
                SELECT tk.MaTK, tk.Email, tk.SDT, tk.PhaiDoiMatKhau, tk.MaVaiTro, vt.MaCode AS VaiTro, vt.TenVaiTro,
                       nv.MaNV, bn.MaBN, COALESCE(nv.HoTen, bn.HoTen) AS HoTen,
                       COALESCE(nv.AnhDaiDien, bn.AnhDaiDien) AS AnhDaiDien
                FROM TaiKhoan tk JOIN VaiTro vt ON vt.MaVaiTro = tk.MaVaiTro
                LEFT JOIN NhanVien nv ON nv.MaTK = tk.MaTK LEFT JOIN BenhNhan bn ON bn.MaTK = tk.MaTK
                WHERE tk.MaTK = ?""", maTK);
        List<String> quyen = tv.ds("""
                SELECT q.MaCode FROM VaiTroQuyen vq JOIN Quyen q ON q.MaQuyen = vq.MaQuyen
                WHERE vq.MaVaiTro = ? AND NOT EXISTS (
                  SELECT 1 FROM TaiKhoanBoQuyen b WHERE b.MaTK = ? AND b.MaQuyen = vq.MaQuyen)
                ORDER BY q.MaQuyen""", r.get("MaVaiTro"), maTK)
                .stream().map(q -> (String) q.get("MaCode")).toList();
        return new NguoiDung((Integer) r.get("MaTK"), (String) r.get("Email"), (String) r.get("SDT"),
                Boolean.TRUE.equals(r.get("PhaiDoiMatKhau")), (String) r.get("VaiTro"), (String) r.get("TenVaiTro"),
                (Integer) r.get("MaNV"), (Integer) r.get("MaBN"), (String) r.get("HoTen"), (String) r.get("AnhDaiDien"), quyen,
                null);
    }

    /**
     * UC1.3: đăng nhập bằng email hoặc SĐT cho mọi vai trò. BR15: sai mật khẩu 5 lần liên tiếp -> khóa 15 phút.
     * Trả về thông tin tài khoản kèm "Token"; PhaiDoiMatKhau=true thì giao diện chuyển sang đổi mật khẩu.
     */
    @Transactional(noRollbackFor = LoiNghiepVu.class)
    public Map<String, Object> dangNhap(String dinhDanh, String matKhau, String thietBi) {
        LocalDateTime bayGio = dongHo.bayGio();
        TaiKhoan tk = timTaiKhoan(dinhDanh);
        if (tk == null) {
            MatKhau.kiemTra(matKhau, HASH_GIA);
            throw new LoiNghiepVu(LOI_DANG_NHAP);
        }
        // Sai mật khẩu luôn trả cùng một thông báo như tài khoản không tồn tại, để không dò được tài khoản nào có thật.
        // Thông báo tạm khóa chỉ hiện cho người nhập đúng mật khẩu.
        boolean dungMatKhau = MatKhau.kiemTra(matKhau, tk.getMatKhauHash());
        if (tk.getKhoaDen() != null && tk.getKhoaDen().isAfter(bayGio)) {
            if (!dungMatKhau) {
                throw new LoiNghiepVu(LOI_DANG_NHAP);
            }
            throw new LoiNghiepVu("Tài khoản tạm khóa đến " + tk.getKhoaDen().format(GIO_NGAY)
                    + " do nhập sai mật khẩu " + SO_LAN_SAI_TOI_DA + " lần");
        }
        if (!dungMatKhau) {
            int soLan = tk.getSoLanSai() + 1;
            if (soLan >= SO_LAN_SAI_TOI_DA) {
                tk.setSoLanSai(0);
                tk.setKhoaDen(bayGio.plus(THOI_GIAN_KHOA));
                nhatKy.taiKhoan(null, "KHOA_TAM_THOI", tk.getMaTK(), "Sai mật khẩu " + SO_LAN_SAI_TOI_DA + " lần liên tiếp");
            } else {
                tk.setSoLanSai(soLan);
            }
            throw new LoiNghiepVu(LOI_DANG_NHAP);
        }
        if ("BI_KHOA".equals(tk.getTrangThai())) {
            throw new LoiNghiepVu("Tài khoản đã bị khóa" + (tk.getLyDoKhoa() != null ? ": " + tk.getLyDoKhoa() : "")
                    + ". Vui lòng liên hệ quản trị viên");
        }
        if ("CHUA_KICH_HOAT".equals(tk.getTrangThai())) {
            throw new LoiNghiepVu("Tài khoản chưa xác thực email. Vui lòng nhập mã OTP đã gửi tới email");
        }
        if (VAI_TRO_NHAN_VIEN.contains(tk.getVaiTro().getMaCode())) {
            String tt = tv.giaTri("SELECT TrangThai FROM NhanVien WHERE MaTK = ?", tk.getMaTK());
            if (!"HOAT_DONG".equals(tt)) {
                throw new LoiNghiepVu("Nhân viên đã ngừng hoạt động, không thể đăng nhập");
            }
        }
        tk.setSoLanSai(0);
        tk.setKhoaDen(null);
        tk.setLanDangNhapCuoi(bayGio);
        Map<String, Object> kq = thongTinTaiKhoan(tk.getMaTK()).thongTin();
        kq.put("Token", taoPhien(tk.getMaTK(), thietBi));
        return kq;
    }

    /** Kiểm tra token ở mỗi yêu cầu (gọi từ XacThucInterceptor). */
    @Transactional(readOnly = true)
    public NguoiDung xacThucPhien(String token) {
        Integer maTK = tv.giaTri("""
                SELECT p.MaTK FROM PhienDangNhap p JOIN TaiKhoan tk ON tk.MaTK = p.MaTK
                LEFT JOIN NhanVien nv ON nv.MaTK = tk.MaTK
                WHERE p.RefreshTokenHash = ? AND p.DaThuHoi = FALSE AND p.HetHan > ?
                  AND tk.TrangThai = 'HOAT_DONG' AND (nv.MaNV IS NULL OR nv.TrangThai = 'HOAT_DONG')""",
                MatKhau.sha256(token), dongHo.bayGio());
        if (maTK == null) {
            throw new LoiXacThuc("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        }
        return thongTinTaiKhoan(maTK);
    }

    @Transactional
    public void dangXuat(String token) {
        phienRepo.thuHoiMot(MatKhau.sha256(token));
    }

    // ================= Mật khẩu (UC1.4) =================

    /** Đổi mật khẩu (cả lần đăng nhập đầu với mật khẩu tạm): các thiết bị khác bị đăng xuất. */
    @Transactional
    public void doiMatKhau(NguoiDung nd, String matKhauCu, String matKhauMoi) {
        ChuanHoa.doManhMatKhau(matKhauMoi);
        if (matKhauMoi.equals(matKhauCu)) {
            throw new LoiNghiepVu("Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        TaiKhoan tk = taiKhoanRepo.khoa(nd.maTK()).orElseThrow();
        if (!MatKhau.kiemTra(matKhauCu, tk.getMatKhauHash())) {
            throw new LoiNghiepVu("Mật khẩu hiện tại không đúng");
        }
        tk.setMatKhauHash(MatKhau.bam(matKhauMoi));
        tk.setPhaiDoiMatKhau(false);
        thuHoiPhien(tk.getMaTK(), nd.token());
        thongBao.taiKhoan(tk.getMaTK(), "TAI_KHOAN", "Mật khẩu đã thay đổi", "Mật khẩu tài khoản của bạn đã được đổi lúc "
                + dongHo.bayGio().format(GIO_NGAY) + ". Nếu không phải bạn thực hiện, hãy liên hệ phòng khám ngay.");
    }

    /**
     * UC1.4 bước 1: gửi OTP khôi phục về email. Không báo tài khoản có tồn tại hay không; giao diện luôn
     * hiển thị "Nếu tài khoản tồn tại, mã OTP đã được gửi tới email".
     */
    @Transactional
    public void quenMatKhau(String dinhDanh) {
        TaiKhoan tk = timTaiKhoan(dinhDanh);
        if (tk != null && !"BI_KHOA".equals(tk.getTrangThai()) && tk.getEmail() != null) {
            taoOtp(tk.getMaTK(), tk.getEmail(), "KHOI_PHUC_MAT_KHAU");
        }
    }

    /**
     * UC1.4 bước 2: OTP đúng -> đặt mật khẩu mới, gỡ khóa tạm (BR15), đăng xuất mọi thiết bị.
     * Tài khoản chưa kích hoạt cũng được kích hoạt luôn vì OTP đã chứng minh quyền sở hữu email.
     */
    @Transactional(noRollbackFor = LoiNghiepVu.class)
    public void datLaiMatKhau(String dinhDanh, String maSo, String matKhauMoi) {
        ChuanHoa.doManhMatKhau(matKhauMoi);
        TaiKhoan tk = timTaiKhoan(dinhDanh);
        if (tk == null || "BI_KHOA".equals(tk.getTrangThai())) {
            throw new LoiNghiepVu(LOI_OTP_HET_HAN);
        }
        String loi = xacMinhOtp(tk.getMaTK(), "KHOI_PHUC_MAT_KHAU", maSo);
        if (loi != null) {
            throw new LoiNghiepVu(loi);
        }
        tk.setMatKhauHash(MatKhau.bam(matKhauMoi));
        tk.setPhaiDoiMatKhau(false);
        tk.setSoLanSai(0);
        tk.setKhoaDen(null);
        tk.setTrangThai("HOAT_DONG");
        thuHoiPhien(tk.getMaTK(), null);
        thongBao.taiKhoan(tk.getMaTK(), "TAI_KHOAN", "Mật khẩu đã được đặt lại",
                "Mật khẩu của bạn vừa được đặt lại bằng mã OTP. Mọi thiết bị đã được đăng xuất.");
    }
}
