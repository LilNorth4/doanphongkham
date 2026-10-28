package vn.vietbac.phongkham.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.extern.slf4j.Slf4j;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.dichvu.HoaDonService;
import vn.vietbac.phongkham.dichvu.NguoiThanService;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 10: thanh toán hóa đơn cuối lượt khám tại quầy hoặc qua ví MoMo (UC10.1-10.3). */
@Slf4j
@RestController
@RequestMapping("/api/thanh-toan")
public class ThanhToanController {

    private final HoaDonService hoaDon;
    private final NguoiThanService nguoiThan;

    public ThanhToanController(HoaDonService hoaDon, NguoiThanService nguoiThan) {
        this.hoaDon = hoaDon;
        this.nguoiThan = nguoiThan;
    }

    public record ThuTien(@JsonProperty("hinh_thuc") String hinhThuc,
                          @JsonProperty("tien_khach_dua") BigDecimal tienKhachDua) {
    }

    // ---------- Thu ngân ----------

    /** Thu ngân thu tiền; quản trị viên (HOA_DON.HUY) tra cứu để hủy. */
    @GetMapping("/hoa-don")
    @CanQuyen({"THANH_TOAN.THU", "HOA_DON.HUY"})
    public List<Map<String, Object>> dsHoaDon(
            @RequestParam(value = "trang_thai", defaultValue = "CHUA_THANH_TOAN") String trangThai,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam(value = "tu_khoa", required = false) String tuKhoa) {
        return hoaDon.dsHoaDon(trangThai, ngay, tuKhoa);
    }

    @GetMapping("/hoa-don/so-cho")
    @CanQuyen("THANH_TOAN.THU")
    public Map<String, Object> soCho() {
        return Map.of("so_luong", hoaDon.soChoThanhToan());
    }

    @GetMapping("/hoa-don/{maHD}")
    @CanQuyen({"THANH_TOAN.THU", "HOA_DON.HUY"})
    public Map<String, Object> chiTiet(@PathVariable Integer maHD) {
        return hoaDon.chiTiet(maHD, null);
    }

    @PostMapping("/hoa-don/{maHD}/thu")
    @CanQuyen("THANH_TOAN.THU")
    public Map<String, Object> thu(@PathVariable Integer maHD, @RequestBody ThuTien b, NguoiDung nd) {
        if (nd.maNV() == null) {
            throw new LoiQuyen("Tài khoản không gắn với hồ sơ nhân viên");
        }
        return hoaDon.thuTaiQuay(maHD, b.hinhThuc(), b.tienKhachDua(), nd.maNV(), nd.maTK());
    }

    @PostMapping("/hoa-don/{maHD}/huy")
    @CanQuyen("HOA_DON.HUY")
    public Map<String, Object> huy(@PathVariable Integer maHD, @RequestBody DatLichController.LyDo b, NguoiDung nd) {
        if (nd.maNV() == null) {
            throw new LoiQuyen("Tài khoản không gắn với hồ sơ nhân viên");
        }
        return hoaDon.huyHoaDon(maHD, b.lyDo(), nd.maNV(), nd.maTK());
    }

    @PostMapping("/hoa-don/{maHD}/momo")
    @CanQuyen("THANH_TOAN.THU")
    public Map<String, Object> momoTaiQuay(@PathVariable Integer maHD, NguoiDung nd) {
        return hoaDon.taoThanhToanMoMo(maHD, null, nd.maTK());
    }

    // ---------- Bệnh nhân ----------

    @GetMapping("/cua-toi")
    @CanQuyen("HO_SO.XEM_CUA_MINH")
    public List<Map<String, Object>> cuaToi(NguoiDung nd) {
        return hoaDon.cuaBenhNhan(nguoiThan.quanLy(nd));
    }

    @GetMapping("/cua-toi/{maHD}")
    @CanQuyen("HO_SO.XEM_CUA_MINH")
    public Map<String, Object> chiTietCuaToi(@PathVariable Integer maHD, NguoiDung nd) {
        return hoaDon.chiTiet(maHD, chuHoaDon(maHD, nd));
    }

    @PostMapping("/cua-toi/{maHD}/momo")
    @CanQuyen("HO_SO.XEM_CUA_MINH")
    public Map<String, Object> momoCuaToi(@PathVariable Integer maHD, NguoiDung nd) {
        return hoaDon.taoThanhToanMoMo(maHD, chuHoaDon(maHD, nd), nd.maTK());
    }

    // ---------- Kết quả MoMo ----------

    /** Trạng thái giao dịch (trang chờ quét mã QR hỏi định kỳ). Thu ngân xem mọi giao dịch, bệnh nhân chỉ của mình. */
    @GetMapping("/momo/{maDon}")
    public Map<String, Object> trangThaiMoMo(@PathVariable String maDon, NguoiDung nd) {
        return hoaDon.capNhatMoMo(maDon, nd.co("THANH_TOAN.THU") ? null : chuGiaoDich(maDon, nd));
    }

    /** Trình duyệt quay về từ MoMo: giao diện gửi lại các tham số MoMo gắn trên đường dẫn. */
    @PostMapping("/momo/ket-qua")
    public Map<String, Object> ketQuaMoMo(@RequestBody Map<String, Object> thamSo, NguoiDung nd) {
        return hoaDon.xuLyKetQuaMoMo(chuoi(thamSo), nd.co("THANH_TOAN.THU") ? null : chuGiaoDich(String.valueOf(thamSo.get("orderId")), nd));
    }

    /** IPN: MoMo gọi thẳng máy chủ (chỉ tới được khi phòng khám có địa chỉ công khai). Không cần đăng nhập, xác thực bằng chữ ký. */
    @PostMapping("/momo/ipn")
    public ResponseEntity<Void> ipn(@RequestBody Map<String, Object> thamSo) {
        try {
            hoaDon.xuLyKetQuaMoMo(chuoi(thamSo), null);
        } catch (RuntimeException e) {
            log.warn("IPN MoMo không xử lý được: {}", e.getMessage());
        }
        return ResponseEntity.noContent().build();
    }

    private static Map<String, String> chuoi(Map<String, Object> m) {
        Map<String, String> kq = new HashMap<>();
        m.forEach((k, v) -> kq.put(k, v == null ? "" : String.valueOf(v)));
        return kq;
    }

    /** Bệnh nhân xem / trả hóa đơn của mình và của người thân do tài khoản quản lý (UC1.7). */
    private Integer chuHoaDon(Integer maHD, NguoiDung nd) {
        Integer maBN = hoaDon.chuHoaDon(maHD);
        nguoiThan.kiemTra(nd, maBN, "Không tìm thấy hóa đơn");
        return maBN;
    }

    private Integer chuGiaoDich(String maDon, NguoiDung nd) {
        Integer maBN = hoaDon.chuGiaoDich(maDon);
        nguoiThan.kiemTra(nd, maBN, "Không tìm thấy giao dịch MoMo");
        return maBN;
    }
}
