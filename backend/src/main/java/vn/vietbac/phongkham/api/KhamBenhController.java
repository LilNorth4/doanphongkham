package vn.vietbac.phongkham.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonProperty;

import vn.vietbac.phongkham.chung.CanhBaoThuoc;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.dichvu.KhamBenhService;
import vn.vietbac.phongkham.dichvu.KhamBenhService.CapNhatHoSo;
import vn.vietbac.phongkham.dichvu.KhamBenhService.ThuocKe;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 8: bác sĩ khám bệnh (UC8.1-8.15); gói 9: bệnh nhân xem hồ sơ sức khỏe của mình. */
@RestController
@RequestMapping("/api")
public class KhamBenhController {

    private final KhamBenhService kham;

    public KhamBenhController(KhamBenhService kham) {
        this.kham = kham;
    }

    public record Thuoc(@JsonProperty("ma_thuoc") Integer maThuoc, @JsonProperty("so_luong") Integer soLuong,
                        @JsonProperty("lieu_dung") String lieuDung, @JsonProperty("cach_dung") String cachDung,
                        @JsonProperty("so_ngay_dung") Integer soNgayDung,
                        @JsonProperty("ly_do_canh_bao") String lyDoCanhBao) {
    }

    public record KiemTraDon(@JsonProperty("ma_thuoc") List<Integer> maThuoc) {
    }

    public record LuuHoSo(Integer mach, @JsonProperty("huyet_ap") String huyetAp,
                          @JsonProperty("nhiet_do") BigDecimal nhietDo, @JsonProperty("can_nang") BigDecimal canNang,
                          @JsonProperty("chieu_cao") BigDecimal chieuCao, @JsonProperty("trieu_chung") String trieuChung,
                          @JsonProperty("kham_lam_sang") String khamLamSang, @JsonProperty("ma_icd") String maICD,
                          @JsonProperty("chan_doan") String chanDoan, @JsonProperty("loi_dan") String loiDan,
                          @JsonProperty("ngay_tai_kham") LocalDate ngayTaiKham,
                          @JsonProperty("don_thuoc") List<Thuoc> donThuoc) {
    }

    public record ChiDinh(@JsonProperty("ma_dv") List<Integer> maDV, @JsonProperty("yeu_cau") String yeuCau) {
    }

    public record NoiDung(@JsonProperty("noi_dung") String noiDung) {
    }

    public record PhanHoi(@JsonProperty("phan_hoi") String phanHoi) {
    }

    // ---------- Hàng chờ ----------

    @GetMapping("/kham/hang-cho")
    @CanQuyen("KHAM.THUC_HIEN")
    public List<Map<String, Object>> hangCho(NguoiDung nd) {
        return kham.hangCho(bacSi(nd));
    }

    @PostMapping("/kham/{maLK}/goi")
    @CanQuyen("KHAM.THUC_HIEN")
    public Map<String, Object> goi(@PathVariable Integer maLK, NguoiDung nd) {
        kham.goiKham(maLK, bacSi(nd), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/kham/{maLK}/bo-qua")
    @CanQuyen("KHAM.THUC_HIEN")
    public Map<String, Object> boQua(@PathVariable Integer maLK, NguoiDung nd) {
        kham.boQua(maLK, bacSi(nd), nd.maTK());
        return XacThucController.OK;
    }

    // ---------- Hồ sơ bệnh án ----------

    /** Bác sĩ điều trị xem để khám; người giám sát (KHAM.XEM) xem được mọi lượt, chỉ xem. */
    @GetMapping("/kham/{maLK}")
    @CanQuyen({"KHAM.THUC_HIEN", "KHAM.XEM"})
    public Map<String, Object> chiTiet(@PathVariable Integer maLK, NguoiDung nd) {
        return kham.chiTiet(maLK, nd.co("KHAM.XEM") ? null : bacSi(nd), nd.maTK());
    }

    @GetMapping("/kham/{maLK}/lan-truoc/{maLKCu}")
    @CanQuyen("KHAM.THUC_HIEN")
    public Map<String, Object> lanTruoc(@PathVariable Integer maLK, @PathVariable Integer maLKCu, NguoiDung nd) {
        return kham.lanKhamTruoc(maLK, maLKCu, bacSi(nd), nd.maTK());
    }

    @PutMapping("/kham/{maLK}/ho-so")
    @CanQuyen("KHAM.THUC_HIEN")
    public Map<String, Object> luuHoSo(@PathVariable Integer maLK, @RequestBody LuuHoSo b, NguoiDung nd) {
        List<ThuocKe> don = b.donThuoc() == null ? null : b.donThuoc().stream()
                .map(t -> new ThuocKe(t.maThuoc(), t.soLuong(), t.lieuDung(), t.cachDung(), t.soNgayDung(), t.lyDoCanhBao()))
                .toList();
        kham.luuHoSo(maLK, bacSi(nd), new CapNhatHoSo(b.mach(), b.huyetAp(), b.nhietDo(), b.canNang(), b.chieuCao(),
                b.trieuChung(), b.khamLamSang(), b.maICD(), b.chanDoan(), b.loiDan(), b.ngayTaiKham(), don),
                nd.co("KHAM.KE_DON"), nd.maTK());
        return XacThucController.OK;
    }

    /** BR35: cảnh báo dị ứng / trùng hoạt chất cho các thuốc đang kê (chưa lưu). */
    @PostMapping("/kham/{maLK}/kiem-tra-don")
    @CanQuyen("KHAM.KE_DON")
    public List<CanhBaoThuoc.CanhBao> kiemTraDon(@PathVariable Integer maLK, @RequestBody KiemTraDon b, NguoiDung nd) {
        return kham.kiemTraDon(maLK, bacSi(nd), b.maThuoc());
    }

    @PostMapping("/kham/{maLK}/chi-dinh")
    @CanQuyen("KHAM.CHI_DINH")
    public Map<String, Object> chiDinh(@PathVariable Integer maLK, @RequestBody ChiDinh b, NguoiDung nd) {
        return Map.of("ma_pcd", kham.chiDinh(maLK, bacSi(nd), b.maDV(), b.yeuCau(), nd.maTK()));
    }

    @PostMapping("/kham/chi-dinh/{maPCD}/huy")
    @CanQuyen("KHAM.CHI_DINH")
    public Map<String, Object> huyChiDinh(@PathVariable Integer maPCD, @RequestBody DatLichController.LyDo b,
                                          NguoiDung nd) {
        kham.huyChiDinh(maPCD, bacSi(nd), b.lyDo(), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/kham/{maLK}/hoan-tat")
    @CanQuyen("KHAM.THUC_HIEN")
    public Map<String, Object> hoanTat(@PathVariable Integer maLK, NguoiDung nd) {
        kham.hoanTat(maLK, bacSi(nd), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/kham/{maLK}/ghi-chu")
    @CanQuyen("KHAM.THUC_HIEN")
    public Map<String, Object> ghiChu(@PathVariable Integer maLK, @RequestBody NoiDung b, NguoiDung nd) {
        kham.boSungGhiChu(maLK, bacSi(nd), b.noiDung(), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/kham/{maLK}/tom-tat/phan-hoi")
    @CanQuyen("KHAM.THUC_HIEN")
    public Map<String, Object> phanHoiTomTat(@PathVariable Integer maLK, @RequestBody PhanHoi b, NguoiDung nd) {
        kham.phanHoiTomTat(maLK, bacSi(nd), b.phanHoi());
        return XacThucController.OK;
    }

    // ---------- Danh mục tra cứu ----------

    @GetMapping("/kham/danh-muc/icd")
    @CanQuyen("KHAM.THUC_HIEN")
    public List<Map<String, Object>> icd(@RequestParam(value = "tu_khoa", required = false) String tuKhoa) {
        return kham.timICD(tuKhoa);
    }

    @GetMapping("/kham/danh-muc/thuoc")
    @CanQuyen("KHAM.KE_DON")
    public List<Map<String, Object>> thuoc() {
        return kham.dsThuoc();
    }

    @GetMapping("/kham/danh-muc/dich-vu-cls")
    @CanQuyen("KHAM.CHI_DINH")
    public List<Map<String, Object>> dichVuCls() {
        return kham.dsDichVuCls();
    }

    // ---------- Hồ sơ sức khỏe của bệnh nhân ----------

    @GetMapping("/ho-so-suc-khoe")
    @CanQuyen("HO_SO.XEM_CUA_MINH")
    public List<Map<String, Object>> hoSoSucKhoe(NguoiDung nd) {
        return kham.hoSoCuaBenhNhan(nd.maBN());
    }

    @GetMapping("/ho-so-suc-khoe/{maLK}")
    @CanQuyen("HO_SO.XEM_CUA_MINH")
    public Map<String, Object> chiTietHoSoSucKhoe(@PathVariable Integer maLK, NguoiDung nd) {
        return kham.hoSoChiTietCuaBenhNhan(maLK, nd.maBN(), nd.maTK());
    }

    private static Integer bacSi(NguoiDung nd) {
        if (nd.maNV() == null) {
            throw new LoiQuyen("Tài khoản không gắn với hồ sơ bác sĩ");
        }
        return nd.maNV();
    }
}
