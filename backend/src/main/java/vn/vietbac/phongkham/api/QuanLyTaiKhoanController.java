package vn.vietbac.phongkham.api;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.dichvu.QuanLyTaiKhoanService;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 2: quản lý tài khoản, phân quyền (UC2.7), nhật ký (UC2.8). */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class QuanLyTaiKhoanController {

    private static final String QUAN_TRI = "TAI_KHOAN.QUAN_LY";
    private static final Map<String, Object> OK = Map.of("ok", true);

    private final QuanLyTaiKhoanService qlTaiKhoan;
    private final TruyVan tv;

    public record NhanVienMoi(@JsonProperty("ho_ten") String hoTen, String email, String sdt,
                              @JsonProperty("loai_nhan_vien") String loaiNhanVien,
                              @JsonProperty("ngay_sinh") LocalDate ngaySinh,
                              @JsonProperty("gioi_tinh") String gioiTinh, @JsonProperty("ma_ck") Integer maCK,
                              @JsonProperty("hoc_ham_hoc_vi") String hocHamHocVi,
                              @JsonProperty("so_nam_kinh_nghiem") Integer soNamKinhNghiem,
                              @JsonProperty("gioi_thieu") String gioiThieu,
                              @JsonProperty("ma_phong_phu_trach") Integer maPhongPhuTrach) {
    }

    public record LyDo(@JsonProperty("ly_do") String lyDo) {
    }

    public record VaiTroMoi(@JsonProperty("vai_tro") String vaiTro, @JsonProperty("ma_ck") Integer maCK,
                            @JsonProperty("ma_phong_phu_trach") Integer maPhongPhuTrach) {
    }

    public record QuyenVaiTro(List<String> quyen) {
    }

    // ---------- Tài khoản ----------

    @GetMapping("/tai-khoan")
    @CanQuyen(QUAN_TRI)
    public List<Map<String, Object>> danhSach(@RequestParam(value = "vai_tro", required = false) String vaiTro,
                                              @RequestParam(value = "trang_thai", required = false) String trangThai,
                                              @RequestParam(value = "tu_khoa", required = false) String tuKhoa) {
        return qlTaiKhoan.danhSach(vaiTro, trangThai, tuKhoa);
    }

    @PostMapping("/tai-khoan/nhan-vien")
    @CanQuyen(QUAN_TRI)
    public Map<String, Object> taoNhanVien(@RequestBody NhanVienMoi b, NguoiDung nd) {
        return qlTaiKhoan.taoNhanVien(nd.maTK(), new QuanLyTaiKhoanService.NhanVienMoi(b.hoTen(), b.email(), b.sdt(),
                b.loaiNhanVien(), b.ngaySinh(), b.gioiTinh(), b.maCK(), b.hocHamHocVi(), b.soNamKinhNghiem(),
                b.gioiThieu(), b.maPhongPhuTrach()));
    }

    @PostMapping("/tai-khoan/{maTK}/khoa")
    @CanQuyen(QUAN_TRI)
    public Map<String, Object> khoa(@PathVariable Integer maTK, @RequestBody LyDo b, NguoiDung nd) {
        qlTaiKhoan.khoa(maTK, b.lyDo(), nd.maTK());
        return OK;
    }

    @PostMapping("/tai-khoan/{maTK}/mo-khoa")
    @CanQuyen(QUAN_TRI)
    public Map<String, Object> moKhoa(@PathVariable Integer maTK, NguoiDung nd) {
        qlTaiKhoan.moKhoa(maTK, nd.maTK());
        return OK;
    }

    @DeleteMapping("/tai-khoan/{maTK}")
    @CanQuyen(QUAN_TRI)
    public Map<String, Object> xoa(@PathVariable Integer maTK, NguoiDung nd) {
        qlTaiKhoan.xoa(maTK, nd.maTK());
        return OK;
    }

    @PostMapping("/tai-khoan/{maTK}/cap-lai-mat-khau")
    @CanQuyen(QUAN_TRI)
    public Map<String, Object> capLaiMatKhau(@PathVariable Integer maTK, NguoiDung nd) {
        return Map.of("mat_khau_tam", qlTaiKhoan.capLaiMatKhau(maTK, nd.maTK()));
    }

    @PostMapping("/tai-khoan/{maTK}/vai-tro")
    @CanQuyen(QUAN_TRI)
    public Map<String, Object> ganVaiTro(@PathVariable Integer maTK, @RequestBody VaiTroMoi b, NguoiDung nd) {
        qlTaiKhoan.ganVaiTro(maTK, b.vaiTro(), nd.maTK(), b.maCK(), b.maPhongPhuTrach());
        return OK;
    }

    @GetMapping("/tai-khoan/{maTK}")
    @CanQuyen(QUAN_TRI)
    public Map<String, Object> chiTiet(@PathVariable Integer maTK) {
        return qlTaiKhoan.chiTiet(maTK);
    }

    /** Chỉ gửi các trường được sửa (tên cột: HoTen, Email...); chuỗi rỗng nghĩa là xóa giá trị. */
    @PutMapping("/tai-khoan/{maTK}/nhan-vien")
    @CanQuyen(QUAN_TRI)
    public Map<String, Object> suaNhanVien(@PathVariable Integer maTK, @RequestBody Map<String, Object> b,
                                           NguoiDung nd) {
        Map<String, Object> truong = new LinkedHashMap<>();
        b.forEach((k, v) -> {
            if (!List.of("HoTen", "NgaySinh", "GioiTinh", "SDT", "Email", "DiaChi", "HocHamHocVi",
                    "SoNamKinhNghiem", "GioiThieu").contains(k)) {
                throw new LoiNghiepVu("Trường không hợp lệ: " + k);
            }
            truong.put(k, v instanceof String s ? (s.isBlank() ? null : s.strip()) : v);
        });
        qlTaiKhoan.capNhatNhanVien(maTK, nd.maTK(), truong);
        return OK;
    }

    @PostMapping("/tai-khoan/{maTK}/thu-hoi-phien")
    @CanQuyen(QUAN_TRI)
    public Map<String, Object> thuHoiPhien(@PathVariable Integer maTK, NguoiDung nd) {
        return Map.of("so_phien", qlTaiKhoan.thuHoiPhien(maTK, nd.maTK()));
    }

    // ---------- Phân quyền, nhật ký ----------

    @GetMapping("/phan-quyen")
    @CanQuyen("VAI_TRO.QUAN_LY")
    public Map<String, Object> bangPhanQuyen() {
        return qlTaiKhoan.bangPhanQuyen();
    }

    @PutMapping("/phan-quyen/{vaiTro}")
    @CanQuyen("VAI_TRO.QUAN_LY")
    public Map<String, Object> luuPhanQuyen(@PathVariable String vaiTro, @RequestBody QuyenVaiTro b, NguoiDung nd) {
        qlTaiKhoan.capNhatQuyenVaiTro(vaiTro, b.quyen() == null ? List.of() : b.quyen(), nd.maTK());
        return OK;
    }

    @PutMapping("/phan-quyen/tai-khoan/{maTK}")
    @CanQuyen("VAI_TRO.QUAN_LY")
    public Map<String, Object> luuQuyenTaiKhoan(@PathVariable Integer maTK, @RequestBody QuyenVaiTro b, NguoiDung nd) {
        qlTaiKhoan.capNhatQuyenTaiKhoan(maTK, b.quyen() == null ? List.of() : b.quyen(), nd.maTK());
        return OK;
    }

    @GetMapping("/nhat-ky/thao-tac")
    @CanQuyen("NHAT_KY.XEM")
    public List<Map<String, Object>> nhatKyThaoTac(
            @RequestParam(value = "tu_ngay", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate tuNgay,
            @RequestParam(value = "den_ngay", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate denNgay,
            @RequestParam(value = "hanh_dong", required = false) String hanhDong,
            @RequestParam(value = "tu_khoa", required = false) String tuKhoa) {
        return qlTaiKhoan.nhatKyThaoTac(tuNgay, denNgay, hanhDong, null, null, tuKhoa, 500);
    }

    @GetMapping("/nhat-ky/truy-cap-ho-so")
    @CanQuyen("NHAT_KY.XEM")
    public List<Map<String, Object>> nhatKyTruyCap(
            @RequestParam(value = "tu_ngay", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate tuNgay,
            @RequestParam(value = "den_ngay", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate denNgay,
            @RequestParam(value = "thao_tac", required = false) String thaoTac,
            @RequestParam(value = "tu_khoa", required = false) String tuKhoa,
            @RequestParam(value = "ngoai_dieu_tri", defaultValue = "false") boolean ngoaiDieuTri) {
        return qlTaiKhoan.nhatKyTruyCap(tuNgay, denNgay, thaoTac, tuKhoa, ngoaiDieuTri);
    }

    // ---------- Danh mục ----------

    @GetMapping("/danh-muc/chuyen-khoa")
    public List<Map<String, Object>> chuyenKhoa(NguoiDung nd) {
        return tv.ds("SELECT MaCK, TenCK, MoTa, PhiKhamCoBan FROM ChuyenKhoa WHERE TrangThai = 'HOAT_DONG' ORDER BY MaCK");
    }

    @GetMapping("/danh-muc/phong")
    @CanQuyen(QUAN_TRI)
    public List<Map<String, Object>> phong() {
        return tv.ds("""
                SELECT MaPhong, MaSoPhong, TenPhong, LoaiPhong FROM Phong
                WHERE TrangThai = 'HOAT_DONG' ORDER BY MaSoPhong""");
    }
}
