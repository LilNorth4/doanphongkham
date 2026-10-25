package vn.vietbac.phongkham.chung;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Phân tích đánh giá, góp ý bằng luật (thay cho dịch vụ LLM khi chưa tích hợp, UC15.8): cảm xúc từ số sao
 * và từ khóa khen/chê, chủ đề theo từ khóa, mức độ nghiêm trọng theo từ khóa nặng. Văn bản được bỏ dấu
 * trước khi so khớp nên viết có dấu hay không dấu đều nhận ra.
 */
public final class PhanTichCamXuc {

    public record KetQua(String camXuc, List<String> chuDe, String mucDo) {
    }

    /** Chủ đề (UC13.3 bước 3) và từ khóa đã bỏ dấu. */
    public static final Map<String, List<String>> CHU_DE = new LinkedHashMap<>();

    static {
        CHU_DE.put("THOI_GIAN_CHO", List.of("cho lau", "doi lau", "phai cho", "phai doi", "thoi gian cho", "cham qua", "lam cham", "nhanh",
                "dung gio", "tre hen", "lau qua"));
        CHU_DE.put("THAI_DO", List.of("thai do", "nhiet tinh", "than thien", "chu dao", "niem no", "lich su", "cau gat",
                "kho chiu", "tho lo", "quat", "hach dich", "vui ve", "tan tinh", "lanh lung"));
        CHU_DE.put("CHUYEN_MON", List.of("chuyen mon", "chan doan", "tu van", "kham ky", "gioi", "tay nghe", "ke don",
                "dieu tri", "giai thich", "kinh nghiem", "kham qua loa", "sai benh"));
        CHU_DE.put("CO_SO_VAT_CHAT", List.of("co so", "phong kham", "ve sinh", "sach", "ghe", "may moc", "thiet bi", "ban thiu", "khong sach",
                "cho ngoi", "dieu hoa", "nha ve sinh", "rong rai", "chat choi", "gui xe"));
        CHU_DE.put("CHI_PHI", List.of("chi phi", "gia ca", "gia kham", "gia thuoc", "gia dich vu", "gia re", "dat qua", "hoi dat", "qua dat",
                "re hon", "so tien", "tien kham", "tien thuoc", "vien phi", "bao hiem", "bhyt", "thanh toan",
                "hop ly"));
        CHU_DE.put("THU_TUC", List.of("thu tuc", "tiep don", "dang ky", "check-in", "check in", "giay to", "le tan",
                "dat lich", "ung dung", "huong dan", "xep hang"));
    }

    private static final List<String> KHEN = List.of("tot", "hai long", "nhiet tinh", "than thien", "chu dao", "sach se",
            "nhanh", "gioi", "tan tinh", "cam on", "tuyet voi", "hop ly", "chuyen nghiep", "de chiu", "yen tam", "ky luong",
            "rong rai", "vui ve", "niem no", "on dinh");
    private static final List<String> CHE = List.of("kem", "te qua", "rat te", "khong hai long", "that vong", "cham qua", "lam cham", "lau",
            "ban thiu", "khong sach", "dat qua", "hoi dat", "qua dat", "cau gat", "kho chiu", "tho lo", "quat", "qua loa", "sai", "nham", "chat choi", "on ao", "khong tot",
            "khong nhiet tinh", "lanh lung", "hach dich", "phien", "khong ro", "vo trach nhiem", "bat cong");
    private static final List<String> NANG = List.of("sai benh", "chan doan sai", "nham thuoc", "ke nham", "nham ket qua",
            "tho lo", "xuc pham", "quat thao", "vo trach nhiem", "tai bien", "nguy hiem", "nhap vien", "cap cuu",
            "doi tien", "lua dao", "boi thuong", "khoi kien", "to cao", "bao chi", "so y te");

    private PhanTichCamXuc() {
    }

    /** Bỏ dấu tiếng Việt, chữ thường, gom khoảng trắng. */
    public static String boDau(String s) {
        if (s == null) {
            return "";
        }
        String t = Normalizer.normalize(s.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").replace('đ', 'd');
        return " " + t.replaceAll("[^a-z0-9-]+", " ").strip() + " ";
    }

    /**
     * diemTB: trung bình số sao (null nếu không có), coSan: cảm xúc gốc khi không có sao (VD khiếu nại nghiêng tiêu cực).
     * Không có nhận xét: gán theo số sao (1–2 tiêu cực, 3 trung tính, 4–5 tích cực, UC15.8 2a).
     */
    public static KetQua phanTich(String vanBan, Double diemTB, String coSan) {
        String t = boDau(vanBan);
        List<String> chuDe = new ArrayList<>();
        CHU_DE.forEach((ma, tu) -> {
            if (tu.stream().anyMatch(k -> t.contains(" " + k + " "))) {
                chuDe.add(ma);
            }
        });
        long khen = KHEN.stream().filter(k -> t.contains(" " + k + " ")).count();
        // "khong tot", "khong hai long" vừa khớp khen vừa khớp chê: trừ phần khen bị phủ định
        long phuDinh = KHEN.stream().filter(k -> t.contains(" khong " + k + " ") || t.contains(" chua " + k + " ")).count();
        long che = CHE.stream().filter(k -> t.contains(" " + k + " ")).count() + phuDinh;
        khen -= phuDinh;
        boolean nang = NANG.stream().anyMatch(k -> t.contains(" " + k + " "));

        double diem;
        if (diemTB != null) {
            diem = diemTB + Math.max(-1.0, Math.min(1.0, (khen - che) * 0.5));
        } else if (khen + che > 0) {
            diem = 3 + Math.max(-2.0, Math.min(2.0, (khen - che) * 1.0)) + ("TIEU_CUC".equals(coSan) ? -1 : 0);
        } else {
            diem = "TIEU_CUC".equals(coSan) ? 2 : 3;
        }
        String camXuc = diem < 2.75 ? "TIEU_CUC" : diem >= 3.75 ? "TICH_CUC" : "TRUNG_TINH";
        String mucDo;
        if ("TIEU_CUC".equals(camXuc) && (nang || (diemTB != null && diemTB <= 1.5))) {
            mucDo = "CAO";
        } else if (nang || "TIEU_CUC".equals(camXuc)) {
            mucDo = "TRUNG_BINH";
        } else {
            mucDo = "THAP";
        }
        return new KetQua(camXuc, chuDe, mucDo);
    }
}
