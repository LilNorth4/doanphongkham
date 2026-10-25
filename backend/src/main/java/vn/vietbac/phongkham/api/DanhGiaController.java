package vn.vietbac.phongkham.api;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.dichvu.DanhGiaService;
import vn.vietbac.phongkham.dichvu.DanhGiaService.DanhGiaNhap;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 12: đánh giá sau khám (UC12.1) và báo cáo phân tích đánh giá cho quản trị viên (UC13.3). */
@RestController
@RequestMapping("/api/danh-gia")
@RequiredArgsConstructor
public class DanhGiaController {

    private static final String GUI = "DANH_GIA.GUI";
    private static final String XEM = "THONG_KE.XEM";

    private final DanhGiaService danhGia;

    @GetMapping("/cua-toi")
    @CanQuyen(GUI)
    public Map<String, Object> cuaToi(NguoiDung nd) {
        return danhGia.cuaBenhNhan(benhNhan(nd));
    }

    @GetMapping("/luot/{maLK}")
    @CanQuyen(GUI)
    public Map<String, Object> bieuMau(@PathVariable Integer maLK, NguoiDung nd) {
        return danhGia.bieuMau(maLK, benhNhan(nd));
    }

    /** Biểu mẫu multipart: diem_bac_si, nhan_xet_bac_si, nhan_xet_dich_vu, điểm từng tiêu chí theo tên cột, ảnh (anh). */
    @PostMapping("/luot/{maLK}")
    @CanQuyen(GUI)
    public Map<String, Object> gui(@PathVariable Integer maLK, @RequestParam Map<String, String> f,
                                   @RequestParam(value = "anh", required = false) List<MultipartFile> anh, NguoiDung nd) {
        Map<String, Integer> dv = new LinkedHashMap<>();
        DanhGiaService.TIEU_CHI.keySet().forEach(c -> dv.put(c, so(f.get(c))));
        DanhGiaNhap b = new DanhGiaNhap(so(f.get("diem_bac_si")), f.get("nhan_xet_bac_si"), dv, f.get("nhan_xet_dich_vu"));
        return danhGia.gui(maLK, benhNhan(nd), nd.maTK(), b, anh);
    }

    @GetMapping("/bao-cao")
    @CanQuyen(XEM)
    public Map<String, Object> baoCao(
            @RequestParam("tu_ngay") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate tuNgay,
            @RequestParam("den_ngay") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate denNgay,
            @RequestParam(value = "ma_ck", required = false) Integer maCK,
            @RequestParam(value = "ma_bs", required = false) Integer maBS) {
        kiemTraKhoang(tuNgay, denNgay);
        return danhGia.baoCao(tuNgay, denNgay, maCK, maBS);
    }

    @GetMapping
    @CanQuyen(XEM)
    public List<Map<String, Object>> ds(
            @RequestParam("tu_ngay") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate tuNgay,
            @RequestParam("den_ngay") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate denNgay,
            @RequestParam(value = "ma_ck", required = false) Integer maCK,
            @RequestParam(value = "ma_bs", required = false) Integer maBS,
            @RequestParam(value = "chu_de", required = false) String chuDe,
            @RequestParam(value = "cam_xuc", required = false) String camXuc) {
        kiemTraKhoang(tuNgay, denNgay);
        return danhGia.ds(tuNgay, denNgay, maCK, maBS, chuDe, camXuc);
    }

    /** Chạy ngay tác vụ phân tích (bình thường chạy mỗi giờ, UC15.8). */
    @PostMapping("/phan-tich")
    @CanQuyen(XEM)
    public Map<String, Object> phanTich() {
        return Map.of("so_luong", danhGia.phanTich());
    }

    private static void kiemTraKhoang(LocalDate tu, LocalDate den) {
        if (den.isBefore(tu)) {
            throw new LoiNghiepVu("Ngày kết thúc phải sau ngày bắt đầu");
        }
    }

    private static Integer so(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        try {
            return Integer.valueOf(s.strip());
        } catch (NumberFormatException e) {
            throw new LoiNghiepVu("Điểm đánh giá không hợp lệ");
        }
    }

    private static Integer benhNhan(NguoiDung nd) {
        if (nd.maBN() == null) {
            throw new LoiQuyen("Tài khoản không gắn với hồ sơ bệnh nhân");
        }
        return nd.maBN();
    }
}
