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

import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.dichvu.DatLichService;
import vn.vietbac.phongkham.dichvu.DatLichService.LocLichHen;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 5, 6: tra cứu lịch trống (UC5.6), bệnh nhân đặt/hủy/đổi lịch (UC6.1-6.5) và danh sách chờ (UC6.8-6.10). */
@RestController
@RequestMapping("/api")
public class DatLichController {

    private final DatLichService datLich;
    private final TruyVan tv;

    public DatLichController(DatLichService datLich, TruyVan tv) {
        this.datLich = datLich;
        this.tv = tv;
    }

    public record DatLich(@JsonProperty("ma_kg") Integer maKG, @JsonProperty("ly_do") String lyDo,
                          @JsonProperty("trieu_chung") String trieuChung) {
    }

    public record DoiLich(@JsonProperty("ma_kg") Integer maKG) {
    }

    public record LyDo(@JsonProperty("ly_do") String lyDo) {
    }

    public record DangKyCho(@JsonProperty("ma_ck") Integer maCK, LocalDate ngay, String buoi,
                            @JsonProperty("ma_bs") Integer maBS, @JsonProperty("ly_do") String lyDo) {
    }

    // ---------- Tra cứu chung (mọi người dùng đã đăng nhập) ----------

    @GetMapping("/dat-lich/bac-si")
    public List<Map<String, Object>> bacSi(@RequestParam(value = "ma_ck", required = false) Integer maCK, NguoiDung nd) {
        return datLich.dsBacSi(maCK);
    }

    @GetMapping("/dat-lich/ngay-trong")
    public List<Map<String, Object>> ngayTrong(@RequestParam(value = "ma_ck", required = false) Integer maCK,
                                               @RequestParam(value = "ma_bs", required = false) Integer maBS,
                                               NguoiDung nd) {
        return datLich.ngayConTrong(maCK, maBS);
    }

    @GetMapping("/dat-lich/khung-gio")
    public List<Map<String, Object>> khungGio(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam(value = "ma_ck", required = false) Integer maCK,
            @RequestParam(value = "ma_bs", required = false) Integer maBS,
            @RequestParam(value = "vang_lai", defaultValue = "false") boolean vangLai, NguoiDung nd) {
        if (vangLai && !nd.co("LICH_HEN.DUYET")) {
            throw new LoiQuyen("Chỉ lễ tân được xếp bệnh nhân vãng lai");
        }
        datLich.xuLyGiuChoHetHan();
        return datLich.lichTrong(ngay, maBS, maCK, vangLai);
    }

    // ---------- Bệnh nhân (gói 6) ----------

    /** MaBN của người gọi; tài khoản chưa gắn hồ sơ bệnh nhân thì không đặt lịch được. */
    private static Integer maBN(NguoiDung nd) {
        if (nd.maBN() == null) {
            throw new LoiQuyen("Tài khoản chưa gắn hồ sơ bệnh nhân");
        }
        return nd.maBN();
    }

    /** Bệnh nhân chỉ thao tác trên lịch hẹn của mình; lịch của người khác coi như không tồn tại. */
    private void lichCuaToi(Integer maLK, NguoiDung nd) {
        if (!datLich.benhNhanCuaLich(maLK).equals(maBN(nd))) {
            throw new KhongTimThay("Không tìm thấy lịch hẹn");
        }
    }

    /** UC6.1: đặt trên web -> Chờ lễ tân xác nhận. */
    @PostMapping("/lich-hen")
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> datLich(@RequestBody DatLich b, NguoiDung nd) {
        return Map.of("ma_lk", datLich.datLich(maBN(nd), b.maKG(), "WEB", rong(b.lyDo()), rong(b.trieuChung()), nd.maTK()));
    }

    @GetMapping("/lich-hen/cua-toi")
    @CanQuyen("LICH_HEN.DAT")
    public List<Map<String, Object>> lichHenCuaToi(NguoiDung nd) {
        return datLich.dsLichHen(new LocLichHen(maBN(nd), null, null, null, null, true));
    }

    @PostMapping("/lich-hen/{maLK}/huy")
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> huy(@PathVariable Integer maLK, @RequestBody LyDo b, NguoiDung nd) {
        lichCuaToi(maLK, nd);
        String lyDo = rong(b.lyDo());
        datLich.huyLich(maLK, lyDo == null ? "Bệnh nhân hủy" : lyDo, nd.maTK(), false);
        return XacThucController.OK;
    }

    @PostMapping("/lich-hen/{maLK}/doi")
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> doi(@PathVariable Integer maLK, @RequestBody DoiLich b, NguoiDung nd) {
        lichCuaToi(maLK, nd);
        datLich.doiLich(maLK, b.maKG(), nd.maTK());
        return XacThucController.OK;
    }

    // ---------- Danh sách chờ (UC6.8-6.10) ----------

    @GetMapping("/danh-sach-cho")
    @CanQuyen("LICH_HEN.DAT")
    public List<Map<String, Object>> danhSachCho(NguoiDung nd) {
        return datLich.dsDangKyCho(maBN(nd));
    }

    @PostMapping("/danh-sach-cho")
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> dangKyCho(@RequestBody DangKyCho b, NguoiDung nd) {
        return Map.of("ma_dkc", datLich.dangKyCho(maBN(nd), b.maCK(), b.ngay(), b.buoi(), b.maBS(), rong(b.lyDo())));
    }

    @PostMapping("/danh-sach-cho/{maDKC}/nhan")
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> nhanCho(@PathVariable Integer maDKC, NguoiDung nd) {
        if (tv.dem("SELECT COUNT(*) FROM DangKyCho WHERE MaDKC = ? AND MaBN = ?", maDKC, maBN(nd)) == 0) {
            throw new KhongTimThay("Không tìm thấy đăng ký chờ");
        }
        return Map.of("ma_lk", datLich.nhanCho(maDKC, nd.maTK(), "WEB"));
    }

    @PostMapping("/danh-sach-cho/{maDKC}/huy")
    @CanQuyen("LICH_HEN.DAT")
    public Map<String, Object> huyCho(@PathVariable Integer maDKC, NguoiDung nd) {
        datLich.huyDangKyCho(maDKC, maBN(nd));
        return XacThucController.OK;
    }

    static String rong(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
