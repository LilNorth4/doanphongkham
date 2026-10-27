package vn.vietbac.phongkham.api;

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

import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.dichvu.DatLichService;
import vn.vietbac.phongkham.dichvu.DatLichService.LocLichHen;
import vn.vietbac.phongkham.dichvu.TiepDonService;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 7: lễ tân quản lý lịch hẹn (UC7.1-7.4), đặt lịch hộ (UC7.7, 7.13, 7.14), tiếp đón (UC7.5, 7.8-7.10). */
@RestController
@RequestMapping("/api/le-tan")
public class LeTanController {

    private static final List<String> KENH_LE_TAN = List.of("DIEN_THOAI", "TIN_NHAN", "TAI_QUAY");

    private final DatLichService datLich;
    private final TiepDonService tiepDon;
    private final TruyVan tv;

    public LeTanController(DatLichService datLich, TiepDonService tiepDon, TruyVan tv) {
        this.datLich = datLich;
        this.tiepDon = tiepDon;
        this.tv = tv;
    }

    public record DatLichHo(@JsonProperty("ma_bn") Integer maBN, @JsonProperty("ma_kg") Integer maKG, String kenh,
                            @JsonProperty("ly_do") String lyDo, @JsonProperty("trieu_chung") String trieuChung) {
    }

    public record CheckIn(@JsonProperty("ma_the") String maThe) {
    }

    public record BenhNhanMoi(@JsonProperty("ho_ten") String hoTen, @JsonProperty("ngay_sinh") LocalDate ngaySinh,
                              @JsonProperty("gioi_tinh") String gioiTinh, String sdt, String cccd,
                              @JsonProperty("dia_chi") String diaChi,
                              @JsonProperty("nguoi_lien_he") String nguoiLienHe,
                              @JsonProperty("sdt_nguoi_lien_he") String sdtNguoiLienHe) {
    }

    // ---------- Lịch hẹn ----------

    /** Lễ tân xem để xử lý; quản trị viên (LICH_HEN.XEM) chỉ xem để giám sát. */
    @GetMapping("/lich-hen")
    @CanQuyen({"LICH_HEN.DUYET", "LICH_HEN.XEM"})
    public List<Map<String, Object>> dsLichHen(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam(value = "trang_thai", required = false) List<String> trangThai,
            @RequestParam(value = "ma_bs", required = false) Integer maBS,
            @RequestParam(value = "tu_khoa", required = false) String tuKhoa) {
        return datLich.dsLichHen(new LocLichHen(null, maBS, ngay, trangThai, tuKhoa, false));
    }

    /** Số lịch chờ duyệt, hiện trên menu của lễ tân. */
    @GetMapping("/cho-xac-nhan")
    @CanQuyen("LICH_HEN.DUYET")
    public Map<String, Object> soChoXacNhan() {
        return Map.of("so_luong", tv.dem("SELECT COUNT(*) FROM LuotKham WHERE TrangThai = 'CHO_XAC_NHAN'"));
    }

    /** UC7.13 điện thoại, UC7.14 tin nhắn, UC7.7 vãng lai: xác nhận ngay (BR23). */
    @PostMapping("/lich-hen")
    @CanQuyen("LICH_HEN.DUYET")
    public Map<String, Object> datLichHo(@RequestBody DatLichHo b, NguoiDung nd) {
        if (!KENH_LE_TAN.contains(b.kenh())) {
            throw new LoiNghiepVu("Kênh đặt lịch không hợp lệ");
        }
        return Map.of("ma_lk", datLich.datLich(b.maBN(), b.maKG(), b.kenh(), DatLichController.rong(b.lyDo()),
                DatLichController.rong(b.trieuChung()), nd.maTK()));
    }

    @PostMapping("/lich-hen/{maLK}/duyet")
    @CanQuyen("LICH_HEN.DUYET")
    public Map<String, Object> duyet(@PathVariable Integer maLK, NguoiDung nd) {
        datLich.duyetLich(maLK, nd.maTK());
        return XacThucController.OK;
    }

    /** UC7.3 từ chối / UC7.4 hủy thay: bắt buộc lý do, không ràng buộc BR04. */
    @PostMapping("/lich-hen/{maLK}/huy")
    @CanQuyen("LICH_HEN.DUYET")
    public Map<String, Object> huyThay(@PathVariable Integer maLK, @RequestBody DatLichController.LyDo b, NguoiDung nd) {
        String lyDo = DatLichController.rong(b.lyDo());
        if (lyDo == null) {
            throw new LoiNghiepVu("Vui lòng nhập lý do");
        }
        datLich.huyLich(maLK, lyDo, nd.maTK(), true);
        return XacThucController.OK;
    }

    // ---------- Tiếp đón ----------

    @PostMapping("/lich-hen/{maLK}/check-in")
    @CanQuyen("TIEP_DON.CHECK_IN")
    public Map<String, Object> checkIn(@PathVariable Integer maLK, @RequestBody(required = false) CheckIn b,
                                       NguoiDung nd) {
        return tiepDon.checkIn(maLK, nd.maNV(), b == null ? null : b.maThe(), nd.maTK());
    }

    @PostMapping("/lich-hen/{maLK}/vang-mat")
    @CanQuyen("TIEP_DON.CHECK_IN")
    public Map<String, Object> vangMat(@PathVariable Integer maLK, NguoiDung nd) {
        tiepDon.danhDauVangMat(maLK, nd.maTK());
        return XacThucController.OK;
    }

    @GetMapping("/benh-nhan")
    @CanQuyen("BENH_NHAN.QUAN_LY")
    public List<Map<String, Object>> timBenhNhan(@RequestParam(required = false) String sdt,
                                                 @RequestParam(required = false) String cccd) {
        return tiepDon.timBenhNhan(sdt, cccd);
    }

    @PostMapping("/benh-nhan")
    @CanQuyen("BENH_NHAN.QUAN_LY")
    public Map<String, Object> themBenhNhan(@RequestBody BenhNhanMoi b, NguoiDung nd) {
        return Map.of("ma_bn", tiepDon.themBenhNhan(b.hoTen(), b.ngaySinh(), b.gioiTinh(), b.sdt(), b.cccd(),
                b.diaChi(), b.nguoiLienHe(), b.sdtNguoiLienHe(), nd.maTK()));
    }

    @GetMapping("/benh-nhan/{maBN}/the-bhyt")
    @CanQuyen("TIEP_DON.CHECK_IN")
    public List<Map<String, Object>> theBhyt(@PathVariable Integer maBN) {
        return tiepDon.theBhyt(maBN);
    }
}
