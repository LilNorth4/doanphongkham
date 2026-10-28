package vn.vietbac.phongkham.api;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonProperty;

import vn.vietbac.phongkham.dichvu.NguoiThanService;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** UC1.7: bệnh nhân quản lý hồ sơ người thân (thêm, xác thực OTP, sửa, hủy liên kết). */
@RestController
@RequestMapping("/api/nguoi-than")
public class NguoiThanController {

    private final NguoiThanService nguoiThan;

    public NguoiThanController(NguoiThanService nguoiThan) {
        this.nguoiThan = nguoiThan;
    }

    public record Them(@JsonProperty("ho_ten") String hoTen, @JsonProperty("ngay_sinh") LocalDate ngaySinh,
                       @JsonProperty("gioi_tinh") String gioiTinh, @JsonProperty("quan_he") String quanHe,
                       String sdt, String cccd, @JsonProperty("dia_chi") String diaChi) {
    }

    public record Sua(@JsonProperty("quan_he") String quanHe, String sdt, @JsonProperty("dia_chi") String diaChi) {
    }

    public record Otp(@JsonProperty("ma_otp") String maOtp) {
    }

    @GetMapping
    @CanQuyen("LICH_HEN.DAT")
    public List<Map<String, Object>> ds(NguoiDung nd) {
        nguoiThan.quanLy(nd);
        return nguoiThan.ds(nd.maTK());
    }

    @PostMapping
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> them(@RequestBody Them b, NguoiDung nd) {
        nguoiThan.quanLy(nd);
        return nguoiThan.them(nd, new NguoiThanService.NguoiThanMoi(b.hoTen(), b.ngaySinh(), b.gioiTinh(), b.quanHe(),
                b.sdt(), b.cccd(), b.diaChi()));
    }

    @PostMapping("/{maBN}/otp")
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> xacNhanOtp(@PathVariable Integer maBN, @RequestBody Otp b, NguoiDung nd) {
        nguoiThan.xacNhanOtp(nd, maBN, b.maOtp());
        return XacThucController.OK;
    }

    @PostMapping("/{maBN}/gui-lai-otp")
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> guiLaiOtp(@PathVariable Integer maBN, NguoiDung nd) {
        return nguoiThan.guiLaiOtp(nd, maBN);
    }

    @PutMapping("/{maBN}")
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> sua(@PathVariable Integer maBN, @RequestBody Sua b, NguoiDung nd) {
        nguoiThan.sua(nd, maBN, b.quanHe(), b.sdt(), b.diaChi());
        return XacThucController.OK;
    }

    @DeleteMapping("/{maBN}")
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> huy(@PathVariable Integer maBN, NguoiDung nd) {
        nguoiThan.huy(nd, maBN);
        return XacThucController.OK;
    }
}
