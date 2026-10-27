package vn.vietbac.phongkham.api;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonProperty;

import vn.vietbac.phongkham.dichvu.CanLamSangService;
import vn.vietbac.phongkham.dichvu.CanLamSangService.ChiSoNhap;
import vn.vietbac.phongkham.dichvu.CanLamSangService.KetQuaNhap;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 14: bác sĩ xét nghiệm, chẩn đoán hình ảnh, nội soi tiếp nhận và trả kết quả (UC14.1-14.9). */
@RestController
@RequestMapping("/api/cls")
public class CanLamSangController {

    private final CanLamSangService cls;

    public CanLamSangController(CanLamSangService cls) {
        this.cls = cls;
    }

    public record ChiSo(@JsonProperty("ma_chi_so") Integer maChiSo, @JsonProperty("gia_tri") BigDecimal giaTri) {
    }

    public record KetQua(@JsonProperty("mo_ta") String moTa, @JsonProperty("ket_luan") String ketLuan,
                         @JsonProperty("nhan_xet") String nhanXet, @JsonProperty("chi_so") List<ChiSo> chiSo,
                         @JsonProperty("da_nhin_an") Boolean daNhinAn, @JsonProperty("da_ky_dong_y") Boolean daKyDongY,
                         @JsonProperty("co_sinh_thiet") Boolean coSinhThiet,
                         @JsonProperty("so_mau_sinh_thiet") Integer soMauSinhThiet,
                         @JsonProperty("vi_tri_sinh_thiet") String viTriSinhThiet,
                         @JsonProperty("ly_do_dieu_chinh") String lyDoDieuChinh) {

        KetQuaNhap nhap() {
            return new KetQuaNhap(moTa, ketLuan, nhanXet, chiSo == null ? null
                    : chiSo.stream().map(c -> new ChiSoNhap(c.maChiSo(), c.giaTri())).toList(),
                    daNhinAn, daKyDongY, coSinhThiet, soMauSinhThiet, viTriSinhThiet);
        }
    }

    @GetMapping("/hang-cho")
    @CanQuyen("CLS.THUC_HIEN")
    public Map<String, Object> hangCho(NguoiDung nd) {
        return cls.hangCho(nd.maNV());
    }

    @GetMapping("/hang-cho/so-cho")
    @CanQuyen("CLS.THUC_HIEN")
    public Map<String, Object> soCho(NguoiDung nd) {
        return Map.of("so_luong", cls.soCho(nd.maNV()));
    }

    @GetMapping("/phieu/{maPCD}")
    @CanQuyen("CLS.THUC_HIEN")
    public Map<String, Object> chiTiet(@PathVariable Integer maPCD, NguoiDung nd) {
        return cls.chiTiet(maPCD, nd.maNV());
    }

    @PostMapping("/phieu/{maPCD}/bat-dau")
    @CanQuyen("CLS.THUC_HIEN")
    public Map<String, Object> batDau(@PathVariable Integer maPCD, NguoiDung nd) {
        cls.batDau(maPCD, nd.maNV(), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/phieu/{maPCD}/hoan")
    @CanQuyen("CLS.THUC_HIEN")
    public Map<String, Object> hoan(@PathVariable Integer maPCD, @RequestBody DatLichController.LyDo b, NguoiDung nd) {
        cls.hoanLai(maPCD, nd.maNV(), b.lyDo(), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/phieu/{maPCD}/ket-qua")
    @CanQuyen("CLS.THUC_HIEN")
    public Map<String, Object> traKetQua(@PathVariable Integer maPCD, @RequestBody KetQua b, NguoiDung nd) {
        return Map.of("ma_kq", cls.traKetQua(maPCD, nd.maNV(), b.nhap(), nd.maTK()));
    }

    @PutMapping("/phieu/{maPCD}/ket-qua")
    @CanQuyen("CLS.THUC_HIEN")
    public Map<String, Object> capNhatKetQua(@PathVariable Integer maPCD, @RequestBody KetQua b, NguoiDung nd) {
        cls.capNhatKetQua(maPCD, nd.maNV(), b.nhap(), b.lyDoDieuChinh(), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/phieu/{maPCD}/tep")
    @CanQuyen("CLS.THUC_HIEN")
    public Map<String, Object> themTep(@PathVariable Integer maPCD, @RequestParam("tep") MultipartFile tep,
                                       @RequestParam(value = "mo_ta", required = false) String moTa, NguoiDung nd) {
        return cls.themTep(maPCD, nd.maNV(), tep, moTa, nd.maTK());
    }

    @DeleteMapping("/tep/{maTep}")
    @CanQuyen("CLS.THUC_HIEN")
    public Map<String, Object> xoaTep(@PathVariable Integer maTep, NguoiDung nd) {
        cls.xoaTep(maTep, nd.maNV(), nd.maTK());
        return XacThucController.OK;
    }
}
