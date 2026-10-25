package vn.vietbac.phongkham.api;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.dichvu.GopYService;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Gói 12: bệnh nhân gửi, theo dõi góp ý – khiếu nại (UC12.2); quản trị viên xử lý, phản hồi (UC12.3, BR25). */
@RestController
@RequestMapping("/api/gop-y")
@RequiredArgsConstructor
public class GopYController {

    private static final String GUI = "DANH_GIA.GUI";
    private static final String XU_LY = "GOP_Y.XU_LY";

    private final GopYService gopY;

    public record NoiDung(@JsonProperty("noi_dung") String noiDung) {
    }

    // ---------- Bệnh nhân ----------

    @PostMapping
    @CanQuyen(GUI)
    public Map<String, Object> gui(@RequestParam(value = "loai", required = false) String loai,
                                   @RequestParam(value = "chu_de", required = false) String chuDe,
                                   @RequestParam(value = "ma_lk", required = false) Integer maLK,
                                   @RequestParam(value = "noi_dung", required = false) String noiDung,
                                   @RequestParam(value = "tep", required = false) List<MultipartFile> tep, NguoiDung nd) {
        return gopY.gui(benhNhan(nd), nd.maTK(), loai, chuDe, maLK, noiDung, tep);
    }

    @GetMapping("/cua-toi")
    @CanQuyen(GUI)
    public List<Map<String, Object>> cuaToi(NguoiDung nd) {
        return gopY.cuaBenhNhan(benhNhan(nd));
    }

    @GetMapping("/cua-toi/luot-kham")
    @CanQuyen(GUI)
    public List<Map<String, Object>> luotKham(NguoiDung nd) {
        return gopY.luotGanDay(benhNhan(nd));
    }

    @GetMapping("/cua-toi/{maPhieu}")
    @CanQuyen(GUI)
    public Map<String, Object> chiTietCuaToi(@PathVariable Integer maPhieu, NguoiDung nd) {
        return gopY.chiTiet(maPhieu, benhNhan(nd), false);
    }

    @PostMapping("/cua-toi/{maPhieu}/bo-sung")
    @CanQuyen(GUI)
    public Map<String, Object> boSung(@PathVariable Integer maPhieu, @RequestBody NoiDung b, NguoiDung nd) {
        gopY.boSung(maPhieu, benhNhan(nd), nd.maTK(), b.noiDung());
        return XacThucController.OK;
    }

    @PostMapping("/cua-toi/{maPhieu}/hai-long")
    @CanQuyen(GUI)
    public Map<String, Object> haiLong(@PathVariable Integer maPhieu, NguoiDung nd) {
        gopY.xacNhanHaiLong(maPhieu, benhNhan(nd), nd.maTK());
        return XacThucController.OK;
    }

    // ---------- Quản trị viên ----------

    @GetMapping
    @CanQuyen(XU_LY)
    public List<Map<String, Object>> ds(@RequestParam(required = false) String loai,
                                        @RequestParam(value = "trang_thai", required = false) List<String> trangThai,
                                        @RequestParam(value = "chu_de", required = false) String chuDe,
                                        @RequestParam(value = "muc_do", required = false) String mucDo,
                                        @RequestParam(value = "qua_han", defaultValue = "false") boolean quaHan,
                                        @RequestParam(value = "tu_khoa", required = false) String tuKhoa) {
        return gopY.ds(loai, trangThai, chuDe, mucDo, quaHan, tuKhoa);
    }

    @GetMapping("/so-cho")
    @CanQuyen(XU_LY)
    public Map<String, Object> soCho() {
        return gopY.soCho();
    }

    @GetMapping("/chu-de")
    @CanQuyen(XU_LY)
    public List<String> chuDe() {
        return gopY.dsChuDe();
    }

    @GetMapping("/{maPhieu}")
    @CanQuyen(XU_LY)
    public Map<String, Object> chiTiet(@PathVariable Integer maPhieu) {
        return gopY.chiTiet(maPhieu, null, true);
    }

    @PostMapping("/{maPhieu}/tiep-nhan")
    @CanQuyen(XU_LY)
    public Map<String, Object> tiepNhan(@PathVariable Integer maPhieu, NguoiDung nd) {
        gopY.tiepNhan(maPhieu, nd.maTK());
        return XacThucController.OK;
    }

    @PostMapping("/{maPhieu}/phan-hoi")
    @CanQuyen(XU_LY)
    public Map<String, Object> phanHoi(@PathVariable Integer maPhieu, @RequestBody NoiDung b, NguoiDung nd) {
        gopY.phanHoi(maPhieu, nd.maTK(), b.noiDung());
        return XacThucController.OK;
    }

    @PostMapping("/{maPhieu}/ghi-chu")
    @CanQuyen(XU_LY)
    public Map<String, Object> ghiChu(@PathVariable Integer maPhieu, @RequestBody NoiDung b, NguoiDung nd) {
        gopY.ghiChu(maPhieu, nd.maTK(), b.noiDung());
        return XacThucController.OK;
    }

    private static Integer benhNhan(NguoiDung nd) {
        if (nd.maBN() == null) {
            throw new LoiQuyen("Tài khoản không gắn với hồ sơ bệnh nhân");
        }
        return nd.maBN();
    }
}
