package vn.vietbac.phongkham.api;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.dichvu.DatLichService;
import vn.vietbac.phongkham.dichvu.DatLichService.LocLichHen;
import vn.vietbac.phongkham.dichvu.ThongBaoService;
import vn.vietbac.phongkham.xacthuc.CanQuyen;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/** Lịch khám của bác sĩ và thông báo trong ứng dụng (UC1.8). */
@RestController
@RequestMapping("/api")
public class BacSiThongBaoController {

    private final DatLichService datLich;
    private final ThongBaoService thongBao;
    private final DongHo dongHo;

    public BacSiThongBaoController(DatLichService datLich, ThongBaoService thongBao, DongHo dongHo) {
        this.datLich = datLich;
        this.thongBao = thongBao;
        this.dongHo = dongHo;
    }

    /**
     * Lịch hẹn trong ngày (mặc định hôm nay), bỏ lịch đã hủy: của chính bác sĩ, hoặc của bác sĩ ma_bs
     * khi có quyền giám sát KHAM.XEM.
     */
    @GetMapping("/bac-si/lich-kham")
    @CanQuyen({"KHAM.THUC_HIEN", "KHAM.XEM"})
    public List<Map<String, Object>> lichKham(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam(value = "ma_bs", required = false) Integer maBS, NguoiDung nd) {
        Integer bs = maBS != null && nd.co("KHAM.XEM") ? maBS : nd.co("KHAM.THUC_HIEN") ? nd.maNV() : null;
        if (bs == null) {
            throw new LoiNghiepVu("Vui lòng chọn bác sĩ");
        }
        return datLich.dsLichHen(new LocLichHen(null, bs, ngay == null ? dongHo.homNay() : ngay, null, null, false))
                .stream().filter(lk -> !"DA_HUY".equals(lk.get("TrangThai"))).toList();
    }

    @GetMapping("/thong-bao")
    public Map<String, Object> thongBao(NguoiDung nd) {
        return thongBao.cuaTaiKhoan(nd.maTK());
    }

    @PostMapping("/thong-bao/doc-het")
    public Map<String, Object> docHet(NguoiDung nd) {
        thongBao.danhDauDaDoc(nd.maTK(), null);
        return XacThucController.OK;
    }

    @PostMapping("/thong-bao/{maTB}/da-doc")
    public Map<String, Object> daDoc(@PathVariable Long maTB, NguoiDung nd) {
        thongBao.danhDauDaDoc(nd.maTK(), maTB);
        return XacThucController.OK;
    }
}
