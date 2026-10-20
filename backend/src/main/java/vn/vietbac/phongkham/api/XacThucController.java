package vn.vietbac.phongkham.api;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.chung.ChuanHoa;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.dichvu.XacThucService;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 1: đăng ký, xác thực email, đăng nhập, đăng xuất, đổi/khôi phục mật khẩu. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class XacThucController {

    private final XacThucService xacThuc;
    private final TruyVan tv;

    @Value("${phongkham.che-do-thu}")
    private String cheDoThu;

    private boolean batCheDoThu() {
        return "1".equals(cheDoThu) || "true".equalsIgnoreCase(cheDoThu);
    }

    public record DangKy(@JsonProperty("ho_ten") String hoTen, @JsonProperty("ngay_sinh") LocalDate ngaySinh,
                         @JsonProperty("gioi_tinh") String gioiTinh, String sdt, String email,
                         @JsonProperty("mat_khau") String matKhau, String cccd,
                         @JsonProperty("dia_chi") String diaChi) {
    }

    public record DinhDanh(@JsonProperty("dinh_danh") String dinhDanh) {
    }

    public record XacThucOtp(@JsonProperty("dinh_danh") String dinhDanh, @JsonProperty("ma_otp") String maOtp) {
    }

    public record DangNhap(@JsonProperty("dinh_danh") String dinhDanh, @JsonProperty("mat_khau") String matKhau) {
    }

    public record DatLaiMatKhau(@JsonProperty("dinh_danh") String dinhDanh, @JsonProperty("ma_otp") String maOtp,
                                @JsonProperty("mat_khau_moi") String matKhauMoi) {
    }

    public record DoiMatKhau(@JsonProperty("mat_khau_cu") String matKhauCu,
                             @JsonProperty("mat_khau_moi") String matKhauMoi) {
    }

    static final Map<String, Object> OK = Map.of("ok", true);

    @GetMapping("/cau-hinh")
    public Map<String, Object> cauHinh() {
        return Map.of("che_do_thu", batCheDoThu());
    }

    @PostMapping("/auth/dang-ky")
    public Map<String, Object> dangKy(@RequestBody DangKy b) {
        return Map.of("ma_tk", xacThuc.dangKyBenhNhan(b.hoTen(), b.ngaySinh(), b.gioiTinh(), b.sdt(), b.email(),
                b.matKhau(), b.cccd(), b.diaChi()));
    }

    @PostMapping("/auth/xac-thuc-email")
    public Map<String, Object> xacThucEmail(@RequestBody XacThucOtp b) {
        xacThuc.xacThucEmail(b.dinhDanh(), b.maOtp());
        return OK;
    }

    @PostMapping("/auth/gui-lai-ma")
    public Map<String, Object> guiLaiMa(@RequestBody DinhDanh b) {
        xacThuc.guiLaiMaXacThuc(b.dinhDanh());
        return OK;
    }

    @PostMapping("/auth/dang-nhap")
    public Map<String, Object> dangNhap(@RequestBody DangNhap b,
                                        @RequestHeader(value = "User-Agent", required = false) String thietBi) {
        return xacThuc.dangNhap(b.dinhDanh(), b.matKhau(), thietBi);
    }

    @GetMapping("/auth/toi")
    public Map<String, Object> toi(NguoiDung nd) {
        return nd.thongTin();
    }

    @PostMapping("/auth/dang-xuat")
    public Map<String, Object> dangXuat(NguoiDung nd) {
        xacThuc.dangXuat(nd.token());
        return OK;
    }

    @PostMapping("/auth/doi-mat-khau")
    public Map<String, Object> doiMatKhau(@RequestBody DoiMatKhau b, NguoiDung nd) {
        xacThuc.doiMatKhau(nd, b.matKhauCu(), b.matKhauMoi());
        return OK;
    }

    @PostMapping("/auth/quen-mat-khau")
    public Map<String, Object> quenMatKhau(@RequestBody DinhDanh b) {
        xacThuc.quenMatKhau(b.dinhDanh());
        return OK;
    }

    @PostMapping("/auth/dat-lai-mat-khau")
    public Map<String, Object> datLaiMatKhau(@RequestBody DatLaiMatKhau b) {
        xacThuc.datLaiMatKhau(b.dinhDanh(), b.maOtp(), b.matKhauMoi());
        return OK;
    }

    /** Hộp thư giả lập: email đã xếp hàng gửi cho tài khoản (chỉ ở chế độ thử). */
    @GetMapping("/dev/hop-thu")
    public List<Map<String, Object>> hopThu(@RequestParam("dinh_danh") String dinhDanh) {
        if (!batCheDoThu()) {
            throw new KhongTimThay("Not Found");
        }
        String[] c = ChuanHoa.dinhDanh(dinhDanh);
        return tv.ds("""
                SELECT t.TieuDe, t.NoiDung, t.ThoiGianTao FROM ThongBao t
                JOIN GuiThongBao g ON g.MaTB = t.MaTB AND g.Kenh = 'EMAIL'
                JOIN TaiKhoan tk ON tk.MaTK = t.MaTKNhan
                WHERE tk.%s = ? ORDER BY t.MaTB DESC LIMIT 5""".formatted(c[0]), c[1]);
    }
}
