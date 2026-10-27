package vn.vietbac.phongkham.api;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonProperty;

import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.dichvu.HoanTienService;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 10: phiếu hoàn tiền (UC10.4, BR31): lễ tân lập và chi, quản trị viên duyệt phiếu vượt ngưỡng. */
@RestController
@RequestMapping("/api/hoan-tien")
public class HoanTienController {

    private static final String LAP = "HOAN_TIEN.LAP";
    private static final String DUYET = "HOAN_TIEN.DUYET";

    private final HoanTienService hoanTien;

    public HoanTienController(HoanTienService hoanTien) {
        this.hoanTien = hoanTien;
    }

    public record DeNghi(@JsonProperty("ma_bl") Integer maBL, @JsonProperty("ma_hd") Integer maHD,
                         @JsonProperty("ly_do") String lyDo, @JsonProperty("ghi_chu") String ghiChu,
                         @JsonProperty("so_tien") BigDecimal soTien) {
    }

    public record Duyet(@JsonProperty("dong_y") boolean dongY, @JsonProperty("ly_do") String lyDo) {
    }

    public record ChiTien(@JsonProperty("hinh_thuc") String hinhThuc, @JsonProperty("ngan_hang") String nganHang,
                          @JsonProperty("so_tai_khoan") String soTaiKhoan, @JsonProperty("ten_tai_khoan") String tenTaiKhoan) {
    }

    @GetMapping
    @CanQuyen({LAP, DUYET})
    public List<Map<String, Object>> ds(@RequestParam(value = "trang_thai", required = false) List<String> trangThai,
                                        @RequestParam(value = "tu_khoa", required = false) String tuKhoa) {
        return hoanTien.dsPhieu(trangThai, tuKhoa);
    }

    /** Số phiếu chờ xử lý cho menu: lễ tân thấy chờ hoàn, quản trị viên thấy chờ duyệt. */
    @GetMapping("/so-cho")
    @CanQuyen({LAP, DUYET})
    public Map<String, Object> soCho(NguoiDung nd) {
        return Map.of("so_luong", hoanTien.soCho(nd.co(LAP) ? "CHO_HOAN" : "CHO_DUYET"));
    }

    @GetMapping("/{maPHT}")
    @CanQuyen({LAP, DUYET})
    public Map<String, Object> chiTiet(@PathVariable Integer maPHT) {
        return hoanTien.chiTiet(maPHT);
    }

    /** Lễ tân lập đề nghị thủ công từ một biên lai hoặc hóa đơn (VD bệnh nhân chuyển khoản thừa). */
    @PostMapping
    @CanQuyen(LAP)
    public Map<String, Object> lap(@RequestBody DeNghi b, NguoiDung nd) {
        return Map.of("ma_pht", hoanTien.taoDeNghi(b.maBL(), b.maHD(), null, b.lyDo(), b.ghiChu(), b.soTien(), nd.maTK()));
    }

    @PostMapping("/{maPHT}/duyet")
    @CanQuyen(DUYET)
    public Map<String, Object> duyet(@PathVariable Integer maPHT, @RequestBody Duyet b, NguoiDung nd) {
        hoanTien.duyet(maPHT, b.dongY(), b.lyDo(), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/{maPHT}/hoan")
    @CanQuyen(LAP)
    public Map<String, Object> hoan(@PathVariable Integer maPHT, @RequestBody ChiTien b, NguoiDung nd) {
        if (nd.maNV() == null) {
            throw new LoiQuyen("Tài khoản không gắn với hồ sơ nhân viên");
        }
        return hoanTien.hoan(maPHT, b.hinhThuc(), b.nganHang(), b.soTaiKhoan(), b.tenTaiKhoan(), nd.maNV(), nd.maTK());
    }
}
