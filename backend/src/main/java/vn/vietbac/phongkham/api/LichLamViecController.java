package vn.vietbac.phongkham.api;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.dichvu.LichLamViecService;
import vn.vietbac.phongkham.dichvu.LichLamViecService.YeuCauTaoCa;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 4: lịch làm việc, đăng ký ca (UC4.1-4.4) và khóa khung giờ. */
@RestController
@RequestMapping("/api/lich-lam-viec")
@RequiredArgsConstructor
public class LichLamViecController {

    private static final String QUAN_LY = "LICH_LV.QUAN_LY";

    private final LichLamViecService lichLV;

    public record TaoCa(@JsonProperty("ma_bs") Integer maBS, @JsonProperty("ma_phong") Integer maPhong,
                        @JsonProperty("ca_lam") List<String> caLam, @JsonProperty("tu_ngay") LocalDate tuNgay,
                        @JsonProperty("den_ngay") LocalDate denNgay, List<Integer> thu,
                        @JsonProperty("thoi_luong") Integer thoiLuong) {
    }

    public record DoiPhong(@JsonProperty("ma_phong") Integer maPhong) {
    }

    public record KhungGioChon(@JsonProperty("ma_kg") List<Integer> maKG, @JsonProperty("ly_do") String lyDo) {
    }

    public record DangKyCa(LocalDate ngay, @JsonProperty("ca_lam") String caLam, @JsonProperty("ghi_chu") String ghiChu) {
    }

    public record DuyetDangKy(@JsonProperty("ma_phong") Integer maPhong, @JsonProperty("thoi_luong") Integer thoiLuong) {
    }

    // ---------- Xem lịch ----------

    @GetMapping("/ca")
    @CanQuyen("LICH_LV.XEM")
    public List<Map<String, Object>> dsCa(
            @RequestParam("tu_ngay") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate tuNgay,
            @RequestParam("den_ngay") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate denNgay,
            @RequestParam(value = "ma_bs", required = false) Integer maBS,
            @RequestParam(value = "ma_ck", required = false) Integer maCK) {
        return lichLV.dsCa(tuNgay, denNgay, maBS, maCK);
    }

    @GetMapping("/ca/{maCa}")
    @CanQuyen("LICH_LV.XEM")
    public Map<String, Object> chiTietCa(@PathVariable Integer maCa) {
        return lichLV.chiTietCa(maCa);
    }

    // ---------- Quản trị viên xếp ca ----------

    @GetMapping("/phong")
    @CanQuyen(QUAN_LY)
    public List<Map<String, Object>> phong(
            @RequestParam("ma_bs") Integer maBS,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam(value = "ca_lam", required = false) String caLam) {
        return lichLV.phongChoBacSi(maBS, ngay, caLam);
    }

    @PostMapping("/ca")
    @CanQuyen(QUAN_LY)
    public Map<String, Object> taoCa(@RequestBody TaoCa b, NguoiDung nd) {
        return lichLV.taoCa(new YeuCauTaoCa(b.maBS(), b.maPhong(), b.caLam(), b.tuNgay(), b.denNgay(), b.thu(),
                b.thoiLuong()), nd.maTK());
    }

    @PutMapping("/ca/{maCa}/phong")
    @CanQuyen(QUAN_LY)
    public Map<String, Object> doiPhong(@PathVariable Integer maCa, @RequestBody DoiPhong b, NguoiDung nd) {
        lichLV.doiPhong(maCa, b.maPhong(), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/ca/{maCa}/huy")
    @CanQuyen(QUAN_LY)
    public Map<String, Object> huyCa(@PathVariable Integer maCa, @RequestBody DatLichController.LyDo b, NguoiDung nd) {
        return lichLV.huyCa(maCa, b.lyDo(), nd.maTK());
    }

    // ---------- Khóa, mở khung giờ ----------

    /** Bác sĩ chỉ khóa trong ca của mình; người có quyền xếp ca khóa được mọi ca. */
    @PostMapping("/khung-gio/khoa")
    @CanQuyen("KHUNG_GIO.KHOA")
    public Map<String, Object> khoa(@RequestBody KhungGioChon b, NguoiDung nd) {
        return Map.of("so_luong", lichLV.khoaKhungGio(b.maKG(), b.lyDo(), nd.maTK(), gioiHan(nd)));
    }

    @PostMapping("/khung-gio/mo")
    @CanQuyen("KHUNG_GIO.KHOA")
    public Map<String, Object> mo(@RequestBody KhungGioChon b, NguoiDung nd) {
        return Map.of("so_luong", lichLV.moKhungGio(b.maKG(), gioiHan(nd)));
    }

    private static Integer gioiHan(NguoiDung nd) {
        return nd.co(QUAN_LY) ? null : nd.maNV();
    }

    // ---------- Đăng ký ca (bác sĩ) ----------

    @GetMapping("/dang-ky/cua-toi")
    @CanQuyen("LICH_LV.DANG_KY")
    public List<Map<String, Object>> dangKyCuaToi(NguoiDung nd) {
        return lichLV.dsDangKyCa(nd.maNV(), null);
    }

    @PostMapping("/dang-ky")
    @CanQuyen("LICH_LV.DANG_KY")
    public Map<String, Object> dangKy(@RequestBody DangKyCa b, NguoiDung nd) {
        return Map.of("ma_dk", lichLV.dangKyCa(nd.maNV(), b.ngay(), b.caLam(), b.ghiChu()));
    }

    @PostMapping("/dang-ky/{maDK}/huy")
    @CanQuyen("LICH_LV.DANG_KY")
    public Map<String, Object> huyDangKy(@PathVariable Integer maDK, NguoiDung nd) {
        lichLV.huyDangKyCa(maDK, nd.maNV());
        return XacThucController.OK;
    }

    // ---------- Duyệt đăng ký (quản trị viên) ----------

    @GetMapping("/dang-ky")
    @CanQuyen(QUAN_LY)
    public List<Map<String, Object>> dsDangKy(@RequestParam(value = "trang_thai", required = false) List<String> trangThai,
                                              @RequestParam(value = "ma_bs", required = false) Integer maBS) {
        return lichLV.dsDangKyCa(maBS, trangThai);
    }

    @GetMapping("/dang-ky/cho-duyet")
    @CanQuyen(QUAN_LY)
    public Map<String, Object> soChoDuyet() {
        return Map.of("so_luong", lichLV.soDangKyChoDuyet());
    }

    @PostMapping("/dang-ky/{maDK}/duyet")
    @CanQuyen(QUAN_LY)
    public Map<String, Object> duyet(@PathVariable Integer maDK, @RequestBody DuyetDangKy b, NguoiDung nd) {
        return Map.of("ma_ca", lichLV.duyetDangKyCa(maDK, b.maPhong(), b.thoiLuong(), nd.maNV(), nd.maTK()));
    }

    @PostMapping("/dang-ky/{maDK}/tu-choi")
    @CanQuyen(QUAN_LY)
    public Map<String, Object> tuChoi(@PathVariable Integer maDK, @RequestBody DatLichController.LyDo b, NguoiDung nd) {
        lichLV.tuChoiDangKyCa(maDK, b.lyDo(), nd.maNV(), nd.maTK());
        return XacThucController.OK;
    }
}
