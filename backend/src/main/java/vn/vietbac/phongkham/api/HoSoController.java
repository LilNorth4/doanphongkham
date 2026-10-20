package vn.vietbac.phongkham.api;

import java.time.LocalDate;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.dichvu.HoSoService;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Hồ sơ cá nhân của người đang đăng nhập: xem, sửa thông tin, đổi ảnh đại diện. */
@RestController
@RequestMapping("/api/ho-so")
@RequiredArgsConstructor
public class HoSoController {

    private final HoSoService hoSo;

    public record CapNhat(@JsonProperty("ho_ten") String hoTen, @JsonProperty("ngay_sinh") LocalDate ngaySinh,
                          @JsonProperty("gioi_tinh") String gioiTinh, @JsonProperty("dia_chi") String diaChi,
                          String cccd, @JsonProperty("nguoi_lien_he") String nguoiLienHe,
                          @JsonProperty("sdt_nguoi_lien_he") String sdtNguoiLienHe,
                          @JsonProperty("gioi_thieu") String gioiThieu) {
    }

    @GetMapping
    public Map<String, Object> xem(NguoiDung nd) {
        return hoSo.xem(nd);
    }

    @PutMapping
    public Map<String, Object> capNhat(@RequestBody CapNhat b, NguoiDung nd) {
        return hoSo.capNhat(nd, new HoSoService.CapNhat(b.hoTen(), b.ngaySinh(), b.gioiTinh(), b.diaChi(), b.cccd(),
                b.nguoiLienHe(), b.sdtNguoiLienHe(), b.gioiThieu()));
    }

    @PostMapping("/anh-dai-dien")
    public Map<String, Object> doiAnh(@RequestParam("anh") MultipartFile anh, NguoiDung nd) {
        return hoSo.doiAnh(nd, anh);
    }

    @DeleteMapping("/anh-dai-dien")
    public Map<String, Object> xoaAnh(NguoiDung nd) {
        hoSo.xoaAnh(nd);
        return XacThucController.OK;
    }
}
