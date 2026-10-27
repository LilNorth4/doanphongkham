package vn.vietbac.phongkham.dichvu;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * Gói 13: tác vụ tự động chạy mỗi phút (giữ chỗ hết hạn UC13.9, tự vắng mặt UC13.3, nhắc lịch UC13.2), mỗi 15 phút
 * (mời đánh giá UC15.10, tự đóng góp ý BR25) và mỗi giờ (phân tích đánh giá UC15.8).
 */
@Slf4j
@Component
public class TacVuDinhKy {

    private final DatLichService datLich;
    private final TiepDonService tiepDon;
    private final DanhGiaService danhGia;
    private final GopYService gopY;

    public TacVuDinhKy(DatLichService datLich, TiepDonService tiepDon, DanhGiaService danhGia, GopYService gopY) {
        this.datLich = datLich;
        this.tiepDon = tiepDon;
        this.danhGia = danhGia;
        this.gopY = gopY;
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = 60_000)
    public void chay() {
        chay("xử lý giữ chỗ hết hạn", datLich::xuLyGiuChoHetHan);
        chay("tự động vắng mặt", datLich::tuDongVangMat);
        chay("nhắc lịch", datLich::nhacLich);
        // Giờ dự kiến vào khám trôi theo thời gian thực, không chỉ đổi khi có người check-in (UC13.4)
        chay("cập nhật thời gian chờ", () -> tiepDon.capNhatThoiGianCho(null));
    }

    @Scheduled(initialDelay = 90_000, fixedDelay = 15 * 60_000)
    public void moiMuoiLamPhut() {
        chay("mời đánh giá", danhGia::guiLoiMoi);
        chay("tự đóng góp ý", gopY::tuDongDong);
    }

    @Scheduled(initialDelay = 120_000, fixedDelay = 60 * 60_000)
    public void moiGio() {
        chay("phân tích đánh giá", danhGia::phanTich);
    }

    /** Mỗi tác vụ chạy riêng: một tác vụ lỗi không chặn các tác vụ còn lại. */
    private static void chay(String ten, Runnable viec) {
        try {
            viec.run();
        } catch (RuntimeException e) {
            log.error("Tác vụ định kỳ '{}' lỗi", ten, e);
        }
    }
}
