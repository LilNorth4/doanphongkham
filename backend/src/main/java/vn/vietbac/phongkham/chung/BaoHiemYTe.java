package vn.vietbac.phongkham.chung;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Quy tắc thẻ BHYT. Số thẻ 15 ký tự chia 4 ô: mã đối tượng (2 chữ) + mã mức hưởng (1 số, 1-5)
 * + mã tỉnh nơi phát hành (2 số, 01-99) + mã số BHXH (10 số), VD "DN 4 19 0123456789".
 * <p>
 * Mức hưởng theo ô 2 (QĐ 1351/QĐ-BHXH, giữ nguyên ở mẫu thẻ QĐ 1666/QĐ-BHXH):
 * 1 = 100% không giới hạn tỷ lệ thuốc, DVKT; 2 = 100% có giới hạn tỷ lệ; 3 = 95%; 4 = 80%;
 * 5 = 100% kể cả chi phí ngoài phạm vi hưởng BHYT. Mức 3, 4 được hưởng 100% khi chi phí một lần khám dưới 15% lương
 * cơ sở, hoặc khi có giấy miễn cùng chi trả trong năm (đủ 5 năm liên tục, cùng chi trả trong năm vượt 6 tháng lương cơ sở).
 * <p>
 * Ghi chú phát triển: thẻ thật tra qua cổng giám định BHXH; ở đây cổng được giả lập bằng bảng TheBHYT. Cổng thật còn
 * cho xem lịch sử khám, hồ sơ bệnh án ở mọi cơ sở (chưa làm do ngoài phạm vi một phòng khám), và kiểm tra tuyến
 * (nơi đăng ký KCB ban đầu) - hiện chỉ lưu nơi đăng ký để tham khảo, chưa giảm mức hưởng khi khám trái tuyến.
 */
public final class BaoHiemYTe {

    /** Mã đối tượng (ô 1) theo mã mức hưởng tương ứng (ô 2). */
    public static final Map<Integer, List<String>> DOI_TUONG = new LinkedHashMap<>();

    static {
        DOI_TUONG.put(1, List.of("CC", "TE"));
        DOI_TUONG.put(2, List.of("CK", "CB", "KC", "HN", "DT", "DK", "XD", "BT", "TS"));
        DOI_TUONG.put(3, List.of("HT", "TC", "CN"));
        DOI_TUONG.put(4, List.of("DN", "HX", "CH", "NN", "TK", "HC", "XK", "TB", "NO", "XB", "TN", "CS", "XN", "MS",
                "HD", "TQ", "TA", "TY", "HG", "LS", "PV", "HS", "SV", "GB", "GD"));
        DOI_TUONG.put(5, List.of("QN", "CA", "CY"));
    }

    /** Tên nhóm đối tượng hay gặp, hiện cho lễ tân khi giải mã thẻ. */
    public static final Map<String, String> TEN_DOI_TUONG = Map.ofEntries(
            Map.entry("CC", "Người có công với cách mạng"), Map.entry("TE", "Trẻ em dưới 6 tuổi"),
            Map.entry("CB", "Cựu chiến binh"), Map.entry("HN", "Hộ gia đình nghèo"),
            Map.entry("DT", "Dân tộc thiểu số vùng khó khăn"), Map.entry("BT", "Hưởng trợ cấp bảo trợ xã hội"),
            Map.entry("TS", "Thân nhân liệt sĩ"), Map.entry("HT", "Hưởng lương hưu"),
            Map.entry("CN", "Hộ gia đình cận nghèo"), Map.entry("DN", "Người lao động doanh nghiệp"),
            Map.entry("CH", "Cán bộ, công chức, viên chức"), Map.entry("HS", "Học sinh"), Map.entry("SV", "Sinh viên"),
            Map.entry("GD", "Hộ gia đình"), Map.entry("QN", "Quân nhân"), Map.entry("CA", "Công an nhân dân"),
            Map.entry("CY", "Người làm công tác cơ yếu"));

    public record The(String maThe, String doiTuong, int maMuc, String maTinh, String maSoBhxh, int tyLe) {
        public String tenDoiTuong() {
            return TEN_DOI_TUONG.getOrDefault(doiTuong, "Mã đối tượng " + doiTuong);
        }
    }

    private BaoHiemYTe() {
    }

    /** Bỏ khoảng trắng, dấu gạch giữa các ô và viết hoa: "dn 4-19 0123456789" -> "DN4190123456789". */
    public static String chuanHoa(String s) {
        return s == null ? "" : s.replaceAll("[\\s.-]", "").toUpperCase();
    }

    /** Kiểm tra định dạng và giải mã số thẻ 15 ký tự; sai thì báo lỗi rõ ô nào sai. */
    public static The giaiMa(String soThe) {
        String s = chuanHoa(soThe);
        if (s.length() != 15) {
            throw new LoiNghiepVu("Số thẻ BHYT gồm 15 ký tự (2 chữ + 1 số mức hưởng + 2 số mã tỉnh + 10 số mã BHXH)");
        }
        String doiTuong = s.substring(0, 2);
        if (!doiTuong.matches("[A-Z]{2}")) {
            throw new LoiNghiepVu("Ô 1 (mã đối tượng) phải là 2 chữ cái, VD DN, HT, TE");
        }
        if (!s.substring(2, 3).matches("[1-5]")) {
            throw new LoiNghiepVu("Ô 2 (mã mức hưởng) phải là một số từ 1 đến 5");
        }
        int maMuc = s.charAt(2) - '0';
        String maTinh = s.substring(3, 5);
        if (!maTinh.matches("\\d{2}") || "00".equals(maTinh)) {
            throw new LoiNghiepVu("Ô 3 (mã tỉnh phát hành) phải là 2 số từ 01 đến 99");
        }
        String maBhxh = s.substring(5);
        if (!maBhxh.matches("\\d{10}")) {
            throw new LoiNghiepVu("Ô 4 (mã số BHXH) phải là 10 chữ số");
        }
        Integer mucDung = DOI_TUONG.entrySet().stream().filter(e -> e.getValue().contains(doiTuong))
                .map(Map.Entry::getKey).findFirst().orElse(null);
        if (mucDung == null) {
            throw new LoiNghiepVu("Mã đối tượng " + doiTuong + " không có trong danh mục BHXH");
        }
        if (mucDung != maMuc) {
            throw new LoiNghiepVu("Đối tượng " + doiTuong + " có mã mức hưởng " + mucDung + ", thẻ ghi " + maMuc
                    + ". Kiểm tra lại số thẻ");
        }
        return new The(s, doiTuong, maMuc, maTinh, maBhxh, tyLe(maMuc));
    }

    /** Tỷ lệ quỹ BHYT chi trả (%) theo mã mức hưởng. */
    public static int tyLe(int maMuc) {
        return switch (maMuc) {
            case 3 -> 95;
            case 4 -> 80;
            default -> 100;
        };
    }

    /** Mức 3, 4 mới có phần cùng chi trả nên mới có các trường hợp miễn. */
    public static boolean coCungChiTra(int maMuc) {
        return maMuc == 3 || maMuc == 4;
    }

    /** Lương cơ sở tại ngày khám: 2.340.000 đ từ 01/7/2024, 2.530.000 đ từ 01/7/2026 (NĐ 161/2026/NĐ-CP). */
    public static BigDecimal luongCoSo(LocalDate ngay) {
        return BigDecimal.valueOf(ngay.isBefore(LocalDate.of(2026, 7, 1)) ? 2_340_000 : 2_530_000);
    }

    /** Chi phí một lần khám (trong phạm vi BHYT) dưới ngưỡng này thì quỹ trả 100%: 15% lương cơ sở. */
    public static BigDecimal nguongMienCungChiTra(LocalDate ngay) {
        return luongCoSo(ngay).multiply(BigDecimal.valueOf(15)).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
    }

    /**
     * Phần BHYT chi trả một dòng (khám, CLS, thuốc). maMuc 5: trả cả phần ngoài phạm vi (toàn bộ thành tiền);
     * còn lại: giá BHYT x số lượng x tỷ lệ, thuốc / dịch vụ ngoài danh mục (giá BHYT null) không được trả.
     */
    public static BigDecimal chiTra(Integer maMuc, int tyLe, BigDecimal giaBhyt, int soLuong, BigDecimal thanhTien) {
        if (maMuc == null || tyLe <= 0) {
            return BigDecimal.ZERO;
        }
        if (maMuc == 5) {
            return thanhTien;
        }
        if (giaBhyt == null) {
            return BigDecimal.ZERO;
        }
        return giaBhyt.multiply(BigDecimal.valueOf((long) soLuong * tyLe))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).min(thanhTien);
    }
}
