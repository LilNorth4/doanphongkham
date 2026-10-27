package vn.vietbac.phongkham.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonProperty;

import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.dichvu.ThuNganService;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 10: lễ tân tạm thu chi phí cận lâm sàng (UC10.7). */
@RestController
@RequestMapping("/api/thu-ngan")
public class ThuNganController {

    private final ThuNganService thuNgan;

    public ThuNganController(ThuNganService thuNgan) {
        this.thuNgan = thuNgan;
    }

    public record TamThu(@JsonProperty("ma_lk") Integer maLK, @JsonProperty("ma_pcd") List<Integer> maPCD,
                         @JsonProperty("hinh_thuc") String hinhThuc,
                         @JsonProperty("tien_khach_dua") BigDecimal tienKhachDua) {
    }

    @GetMapping("/tam-thu")
    @CanQuyen("THANH_TOAN.THU")
    public List<Map<String, Object>> dsChoTamThu(@RequestParam(value = "tu_khoa", required = false) String tuKhoa) {
        return thuNgan.dsChoTamThu(tuKhoa);
    }

    /** Số lượt chờ tạm thu, hiện trên menu. */
    @GetMapping("/tam-thu/so-cho")
    @CanQuyen("THANH_TOAN.THU")
    public Map<String, Object> soChoTamThu() {
        return Map.of("so_luong", thuNgan.soChoTamThu());
    }

    @PostMapping("/tam-thu")
    @CanQuyen("THANH_TOAN.THU")
    public Map<String, Object> thu(@RequestBody TamThu b, NguoiDung nd) {
        if (nd.maNV() == null) {
            throw new LoiQuyen("Tài khoản không gắn với hồ sơ nhân viên");
        }
        return thuNgan.thu(b.maLK(), b.maPCD(), b.hinhThuc(), b.tienKhachDua(), nd.maNV(), nd.maTK());
    }

    @GetMapping("/bien-lai")
    @CanQuyen("THANH_TOAN.THU")
    public List<Map<String, Object>> dsBienLai(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay) {
        return thuNgan.dsBienLai(ngay);
    }

    @GetMapping("/bien-lai/{maBL}")
    @CanQuyen("THANH_TOAN.THU")
    public Map<String, Object> bienLai(@PathVariable Integer maBL) {
        return thuNgan.bienLai(maBL);
    }

    @GetMapping("/tai-khoan-nhan")
    @CanQuyen("THANH_TOAN.THU")
    public Map<String, Object> taiKhoanNhan() {
        return thuNgan.taiKhoanNhan();
    }
}
