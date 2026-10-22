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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.dichvu.DanhMucService;
import vn.vietbac.phongkham.dichvu.MatBangService;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 3: quản trị viên quản lý danh mục (UC3.1-3.8) và sơ đồ mặt bằng (UC3.9). */
@RestController
@RequestMapping("/api/quan-ly")
@RequiredArgsConstructor
public class DanhMucController {

    private static final String DANH_MUC = "DANH_MUC.QUAN_LY";
    private static final String MAT_BANG = "MAT_BANG.QUAN_LY";

    private final DanhMucService danhMuc;
    private final MatBangService matBang;

    public record TrangThai(@JsonProperty("hoat_dong") boolean hoatDong) {
    }

    public record ChuyenKhoa(@JsonProperty("ten_ck") String tenCK, @JsonProperty("mo_ta") String moTa,
                             @JsonProperty("phi_kham") BigDecimal phiKham) {
    }

    public record Phong(@JsonProperty("ma_so_phong") String maSoPhong, @JsonProperty("ten_phong") String tenPhong,
                        @JsonProperty("ma_tang") Integer maTang, @JsonProperty("loai_phong") String loaiPhong,
                        @JsonProperty("ma_ck") Integer maCK) {
    }

    public record DichVu(@JsonProperty("ten_dv") String tenDV, @JsonProperty("loai_dv") String loaiDV,
                         @JsonProperty("ma_ck") Integer maCK, @JsonProperty("ma_phong") Integer maPhong,
                         @JsonProperty("gia_dich_vu") BigDecimal giaDichVu, @JsonProperty("gia_bhyt") BigDecimal giaBHYT,
                         @JsonProperty("mau_ket_qua") String mauKetQua,
                         @JsonProperty("yeu_cau_nhin_an") Boolean yeuCauNhinAn,
                         @JsonProperty("thoi_gian_thuc_hien") Integer thoiGianThucHien,
                         @JsonProperty("thoi_gian_tra_ket_qua") Integer thoiGianTraKetQua) {
    }

    public record RangBuoc(@JsonProperty("ma_dv_truoc") List<Integer> maDVTruoc) {
    }

    public record ChiSo(@JsonProperty("ten_chi_so") String tenChiSo, @JsonProperty("don_vi") String donVi,
                        @JsonProperty("gioi_han_duoi") BigDecimal gioiHanDuoi,
                        @JsonProperty("gioi_han_tren") BigDecimal gioiHanTren, @JsonProperty("bat_buoc") Boolean batBuoc,
                        @JsonProperty("thu_tu") Integer thuTu) {
    }

    public record Thuoc(@JsonProperty("ten_thuoc") String tenThuoc, @JsonProperty("hoat_chat") String hoatChat,
                        @JsonProperty("ham_luong") String hamLuong, @JsonProperty("don_vi_tinh") String donViTinh,
                        @JsonProperty("don_gia") BigDecimal donGia, @JsonProperty("gia_bhyt") BigDecimal giaBHYT) {
    }

    public record Icd(@JsonProperty("ma_icd") String maICD, @JsonProperty("ten_benh") String tenBenh) {
    }

    public record ThongTin(@JsonProperty("ten_phong_kham") String tenPhongKham,
                           @JsonProperty("gioi_thieu") String gioiThieu, @JsonProperty("dia_chi") String diaChi,
                           @JsonProperty("gio_lam_viec") String gioLamViec, String hotline, String email,
                           @JsonProperty("ma_ngan_hang") String maNganHang,
                           @JsonProperty("so_tai_khoan") String soTaiKhoan,
                           @JsonProperty("ten_tai_khoan") String tenTaiKhoan) {
    }

    public record Tang(@JsonProperty("so_tang") Integer soTang, @JsonProperty("ten_tang") String tenTang,
                       @JsonProperty("ti_le") BigDecimal tiLe) {
    }

    public record Diem(@JsonProperty("ma_tang") Integer maTang, @JsonProperty("ten_diem") String tenDiem,
                       @JsonProperty("loai_diem") String loaiDiem, Integer x, Integer y,
                       @JsonProperty("ma_phong") Integer maPhong) {
    }

    public record Doan(@JsonProperty("ma_diem_dau") Integer dau, @JsonProperty("ma_diem_cuoi") Integer cuoi,
                       @JsonProperty("loai_doan") String loaiDoan, @JsonProperty("do_dai") BigDecimal doDai) {
    }

    // ---------- Chuyên khoa ----------

    @GetMapping("/chuyen-khoa")
    @CanQuyen(DANH_MUC)
    public List<Map<String, Object>> dsChuyenKhoa() {
        return danhMuc.dsChuyenKhoa();
    }

    @PostMapping("/chuyen-khoa")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> themChuyenKhoa(@RequestBody ChuyenKhoa b, NguoiDung nd) {
        return Map.of("ma_ck", danhMuc.themChuyenKhoa(ck(b), nd.maTK()));
    }

    @PutMapping("/chuyen-khoa/{ma}")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> suaChuyenKhoa(@PathVariable Integer ma, @RequestBody ChuyenKhoa b, NguoiDung nd) {
        danhMuc.suaChuyenKhoa(ma, ck(b), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/chuyen-khoa/{ma}/trang-thai")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> trangThaiChuyenKhoa(@PathVariable Integer ma, @RequestBody TrangThai b, NguoiDung nd) {
        danhMuc.doiTrangThaiChuyenKhoa(ma, b.hoatDong(), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/chuyen-khoa/{ma}/anh")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> anhChuyenKhoa(@PathVariable Integer ma, @RequestPart("anh") MultipartFile anh, NguoiDung nd) {
        return Map.of("AnhDaiDien", danhMuc.doiAnhChuyenKhoa(ma, anh, nd.maTK()));
    }

    // ---------- Phòng ----------

    @GetMapping("/tang")
    @CanQuyen({DANH_MUC, MAT_BANG})
    public List<Map<String, Object>> dsTang() {
        return danhMuc.dsTang();
    }

    @GetMapping("/phong")
    @CanQuyen({DANH_MUC, MAT_BANG})
    public List<Map<String, Object>> dsPhong() {
        return danhMuc.dsPhong();
    }

    @PostMapping("/phong")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> themPhong(@RequestBody Phong b, NguoiDung nd) {
        return Map.of("ma_phong", danhMuc.themPhong(phong(b), nd.maTK()));
    }

    @PutMapping("/phong/{ma}")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> suaPhong(@PathVariable Integer ma, @RequestBody Phong b, NguoiDung nd) {
        danhMuc.suaPhong(ma, phong(b), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/phong/{ma}/trang-thai")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> trangThaiPhong(@PathVariable Integer ma, @RequestBody TrangThai b, NguoiDung nd) {
        danhMuc.doiTrangThaiPhong(ma, b.hoatDong(), nd.maTK());
        return XacThucController.OK;
    }

    // ---------- Dịch vụ, chỉ số ----------

    @GetMapping("/dich-vu")
    @CanQuyen(DANH_MUC)
    public List<Map<String, Object>> dsDichVu() {
        return danhMuc.dsDichVu();
    }

    @PostMapping("/dich-vu")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> themDichVu(@RequestBody DichVu b, NguoiDung nd) {
        return Map.of("ma_dv", danhMuc.themDichVu(dv(b), nd.maTK()));
    }

    @PutMapping("/dich-vu/{ma}")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> suaDichVu(@PathVariable Integer ma, @RequestBody DichVu b, NguoiDung nd) {
        danhMuc.suaDichVu(ma, dv(b), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/dich-vu/{ma}/trang-thai")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> trangThaiDichVu(@PathVariable Integer ma, @RequestBody TrangThai b, NguoiDung nd) {
        danhMuc.doiTrangThaiDichVu(ma, b.hoatDong(), nd.maTK());
        return XacThucController.OK;
    }

    @PutMapping("/dich-vu/{ma}/rang-buoc")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> rangBuoc(@PathVariable Integer ma, @RequestBody RangBuoc b, NguoiDung nd) {
        danhMuc.luuRangBuoc(ma, b.maDVTruoc(), nd.maTK());
        return XacThucController.OK;
    }

    @GetMapping("/dich-vu/{ma}/chi-so")
    @CanQuyen(DANH_MUC)
    public List<Map<String, Object>> dsChiSo(@PathVariable Integer ma) {
        return danhMuc.dsChiSo(ma);
    }

    @PostMapping("/dich-vu/{ma}/chi-so")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> themChiSo(@PathVariable Integer ma, @RequestBody ChiSo b, NguoiDung nd) {
        return Map.of("ma_chi_so", danhMuc.themChiSo(ma, chiSo(b), nd.maTK()));
    }

    @PutMapping("/chi-so/{ma}")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> suaChiSo(@PathVariable Integer ma, @RequestBody ChiSo b, NguoiDung nd) {
        danhMuc.suaChiSo(ma, chiSo(b), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/chi-so/{ma}/trang-thai")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> trangThaiChiSo(@PathVariable Integer ma, @RequestBody TrangThai b, NguoiDung nd) {
        danhMuc.doiTrangThaiChiSo(ma, b.hoatDong(), nd.maTK());
        return XacThucController.OK;
    }

    // ---------- Thuốc ----------

    @GetMapping("/thuoc")
    @CanQuyen(DANH_MUC)
    public List<Map<String, Object>> dsThuoc() {
        return danhMuc.dsThuoc();
    }

    @PostMapping("/thuoc")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> themThuoc(@RequestBody Thuoc b, NguoiDung nd) {
        return Map.of("ma_thuoc", danhMuc.themThuoc(thuoc(b), nd.maTK()));
    }

    @PutMapping("/thuoc/{ma}")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> suaThuoc(@PathVariable Integer ma, @RequestBody Thuoc b, NguoiDung nd) {
        danhMuc.suaThuoc(ma, thuoc(b), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/thuoc/{ma}/trang-thai")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> trangThaiThuoc(@PathVariable Integer ma, @RequestBody TrangThai b, NguoiDung nd) {
        danhMuc.doiTrangThaiThuoc(ma, b.hoatDong(), nd.maTK());
        return XacThucController.OK;
    }

    // ---------- ICD-10 ----------

    @GetMapping("/icd")
    @CanQuyen(DANH_MUC)
    public List<Map<String, Object>> dsIcd(@RequestParam(value = "tu_khoa", required = false) String tuKhoa) {
        return danhMuc.dsICD(tuKhoa);
    }

    @PostMapping("/icd")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> themIcd(@RequestBody Icd b, NguoiDung nd) {
        danhMuc.themICD(b.maICD(), b.tenBenh(), nd.maTK());
        return XacThucController.OK;
    }

    @PutMapping("/icd/{ma}")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> suaIcd(@PathVariable String ma, @RequestBody Icd b, NguoiDung nd) {
        danhMuc.suaICD(ma, b.tenBenh(), nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/icd/{ma}/trang-thai")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> trangThaiIcd(@PathVariable String ma, @RequestBody TrangThai b, NguoiDung nd) {
        danhMuc.doiTrangThaiICD(ma, b.hoatDong(), nd.maTK());
        return XacThucController.OK;
    }

    // ---------- Thông tin phòng khám ----------

    @GetMapping("/thong-tin")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> thongTin() {
        return danhMuc.thongTin();
    }

    @PutMapping("/thong-tin")
    @CanQuyen(DANH_MUC)
    public Map<String, Object> luuThongTin(@RequestBody ThongTin b, NguoiDung nd) {
        danhMuc.luuThongTin(new DanhMucService.ThongTin(b.tenPhongKham(), b.gioiThieu(), b.diaChi(), b.gioLamViec(),
                b.hotline(), b.email(), b.maNganHang(), b.soTaiKhoan(), b.tenTaiKhoan()), nd.maTK());
        return XacThucController.OK;
    }

    // ---------- Sơ đồ mặt bằng ----------

    @GetMapping("/mat-bang")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> soDo() {
        return matBang.soDo();
    }

    @PostMapping("/mat-bang/tang")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> themTang(@RequestBody Tang b, NguoiDung nd) {
        return Map.of("ma_tang", matBang.themTang(b.soTang(), b.tenTang(), b.tiLe(), nd.maTK()));
    }

    @PutMapping("/mat-bang/tang/{ma}")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> suaTang(@PathVariable Integer ma, @RequestBody Tang b, NguoiDung nd) {
        matBang.suaTang(ma, b.soTang(), b.tenTang(), b.tiLe(), nd.maTK());
        return XacThucController.OK;
    }

    @DeleteMapping("/mat-bang/tang/{ma}")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> xoaTang(@PathVariable Integer ma, NguoiDung nd) {
        matBang.xoaTang(ma, nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/mat-bang/tang/{ma}/anh")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> anhTang(@PathVariable Integer ma, @RequestPart("anh") MultipartFile anh, NguoiDung nd) {
        return Map.of("AnhMatBang", matBang.doiAnhTang(ma, anh, nd.maTK()));
    }

    @PostMapping("/mat-bang/diem")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> themDiem(@RequestBody Diem b, NguoiDung nd) {
        return Map.of("ma_diem", matBang.themDiem(b.maTang(), b.tenDiem(), b.loaiDiem(), b.x(), b.y(), b.maPhong(), nd.maTK()));
    }

    @PutMapping("/mat-bang/diem/{ma}")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> suaDiem(@PathVariable Integer ma, @RequestBody Diem b, NguoiDung nd) {
        matBang.suaDiem(ma, b.tenDiem(), b.loaiDiem(), b.x(), b.y(), b.maPhong(), nd.maTK());
        return XacThucController.OK;
    }

    @DeleteMapping("/mat-bang/diem/{ma}")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> xoaDiem(@PathVariable Integer ma, NguoiDung nd) {
        matBang.xoaDiem(ma, nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/mat-bang/doan")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> themDoan(@RequestBody Doan b, NguoiDung nd) {
        return Map.of("ma_doan", matBang.themDoan(b.dau(), b.cuoi(), b.loaiDoan(), b.doDai(), nd.maTK()));
    }

    @PutMapping("/mat-bang/doan/{ma}")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> suaDoan(@PathVariable Integer ma, @RequestBody Doan b, NguoiDung nd) {
        matBang.suaDoDai(ma, b.doDai(), nd.maTK());
        return XacThucController.OK;
    }

    @DeleteMapping("/mat-bang/doan/{ma}")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> xoaDoan(@PathVariable Integer ma, NguoiDung nd) {
        matBang.xoaDoan(ma, nd.maTK());
        return XacThucController.OK;
    }

    @GetMapping("/mat-bang/chi-duong")
    @CanQuyen(MAT_BANG)
    public Map<String, Object> chiDuong(@RequestParam Integer tu, @RequestParam Integer den,
                                        @RequestParam(value = "tranh_cau_thang", defaultValue = "false") boolean tranhCauThang) {
        return matBang.chiDuong(tu, den, tranhCauThang);
    }

    // ---------- Chuyển dữ liệu gửi lên sang kiểu của service ----------

    private static DanhMucService.ChuyenKhoa ck(ChuyenKhoa b) {
        return new DanhMucService.ChuyenKhoa(b.tenCK(), b.moTa(), b.phiKham());
    }

    private static DanhMucService.Phong phong(Phong b) {
        return new DanhMucService.Phong(b.maSoPhong(), b.tenPhong(), b.maTang(), b.loaiPhong(), b.maCK());
    }

    private static DanhMucService.DichVu dv(DichVu b) {
        return new DanhMucService.DichVu(b.tenDV(), b.loaiDV(), b.maCK(), b.maPhong(), b.giaDichVu(), b.giaBHYT(),
                b.mauKetQua(), b.yeuCauNhinAn(), b.thoiGianThucHien(), b.thoiGianTraKetQua());
    }

    private static DanhMucService.ChiSo chiSo(ChiSo b) {
        return new DanhMucService.ChiSo(b.tenChiSo(), b.donVi(), b.gioiHanDuoi(), b.gioiHanTren(), b.batBuoc(), b.thuTu());
    }

    private static DanhMucService.Thuoc thuoc(Thuoc b) {
        return new DanhMucService.Thuoc(b.tenThuoc(), b.hoatChat(), b.hamLuong(), b.donViTinh(), b.donGia(), b.giaBHYT());
    }
}
