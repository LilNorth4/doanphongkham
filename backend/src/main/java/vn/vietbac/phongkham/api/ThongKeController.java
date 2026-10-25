package vn.vietbac.phongkham.api;

import java.time.LocalDate;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.dichvu.ThongKeService;
import vn.vietbac.phongkham.dichvu.ThongKeService.BoLoc;
import vn.vietbac.phongkham.xacthuc.CanQuyen;

/** Gói 13: dashboard tổng quan (UC13.1) và thống kê theo tiêu chí (UC13.2) cho quản trị viên. */
@RestController
@RequestMapping("/api/thong-ke")
@RequiredArgsConstructor
public class ThongKeController {

    private final ThongKeService thongKe;

    @GetMapping("/tong-quan")
    @CanQuyen("THONG_KE.XEM")
    public Map<String, Object> tongQuan() {
        return thongKe.tongQuan();
    }

    /** loai: LUOT_KHAM, DOANH_THU, HUY_VANG, HIEU_SUAT, THOI_GIAN_CHO. */
    @GetMapping("/{loai}")
    @CanQuyen("THONG_KE.XEM")
    public Map<String, Object> thongKe(@PathVariable String loai,
            @RequestParam("tu_ngay") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate tuNgay,
            @RequestParam("den_ngay") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate denNgay,
            @RequestParam(value = "ma_ck", required = false) Integer maCK,
            @RequestParam(value = "ma_bs", required = false) Integer maBS,
            @RequestParam(required = false) String kenh) {
        return thongKe.thongKe(loai.toUpperCase(), tuNgay, denNgay, new BoLoc(maCK, maBS, kenh == null || kenh.isBlank() ? null : kenh));
    }
}
