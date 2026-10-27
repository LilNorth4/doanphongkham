package vn.vietbac.phongkham.chung;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * BR35: cảnh báo khi kê đơn. Mức cao: hoạt chất của thuốc (hoặc nhóm thuốc chứa hoạt chất đó, VD Amoxicillin thuộc
 * nhóm Penicillin) có trong dị ứng đã ghi nhận của bệnh nhân. Mức thường: hai thuốc trong đơn có cùng hoạt chất.
 * Dị ứng lưu dạng văn bản nên so khớp theo tên hoạt chất / tên nhóm sau khi bỏ dấu (PhanTichCamXuc.boDau);
 * dị ứng ghi tên không có trong danh mục (VD "hải sản") không được kiểm tra tự động.
 */
public final class CanhBaoThuoc {

    public static final String CAO = "CAO";
    public static final String THUONG = "THUONG";

    /** Một thuốc trong đơn: hoạt chất có thể gồm nhiều chất, ngăn cách bởi "+", ",", ";" hoặc "/". */
    public record Thuoc(Integer maThuoc, String tenThuoc, String hoatChat) {
    }

    public record CanhBao(@JsonProperty("ma_thuoc") Integer maThuoc, String muc, @JsonProperty("noi_dung") String noiDung) {
    }

    /** Nhóm thuốc hay gặp trong khai báo dị ứng (đã bỏ dấu) -> các hoạt chất thuộc nhóm. */
    private static final Map<String, List<String>> NHOM = new LinkedHashMap<>();

    static {
        NHOM.put("Penicillin", List.of("penicillin", "amoxicillin", "ampicillin", "cloxacillin", "oxacillin",
                "piperacillin", "benzylpenicillin", "phenoxymethylpenicillin"));
        NHOM.put("Cephalosporin", List.of("cefuroxim", "cefixim", "cefalexin", "cephalexin", "ceftriaxon", "cefaclor",
                "cefpodoxim", "cefadroxil", "cefdinir", "cefotaxim", "cefazolin"));
        NHOM.put("Sulfamid", List.of("sulfamethoxazol", "sulfadiazin", "cotrimoxazol"));
        NHOM.put("NSAID", List.of("ibuprofen", "diclofenac", "meloxicam", "naproxen", "piroxicam", "celecoxib",
                "aspirin", "acid acetylsalicylic"));
        NHOM.put("Aspirin", List.of("aspirin", "acid acetylsalicylic"));
    }

    /** Tên khác của nhóm trong văn bản dị ứng (đã bỏ dấu). */
    private static final Map<String, List<String>> TEN_NHOM = Map.of(
            "Penicillin", List.of("penicillin", "penicilin", "beta lactam", "betalactam"),
            "Cephalosporin", List.of("cephalosporin", "cefalosporin", "beta lactam", "betalactam"),
            "Sulfamid", List.of("sulfamid", "sulfonamid", "sulfa"),
            "NSAID", List.of("nsaid", "nsaids", "khang viem khong steroid", "chong viem khong steroid"),
            "Aspirin", List.of("aspirin", "acid acetylsalicylic"));

    private CanhBaoThuoc() {
    }

    /** Các hoạt chất của thuốc, đã bỏ dấu, không có khoảng trắng hai đầu. */
    static List<String> hoatChat(String s) {
        List<String> kq = new ArrayList<>();
        if (s == null) {
            return kq;
        }
        for (String phan : s.split("[+,;/]| và ")) {
            String t = PhanTichCamXuc.boDau(phan).strip();
            if (t.length() >= 3 && !kq.contains(t)) {
                kq.add(t);
            }
        }
        return kq;
    }

    public static List<CanhBao> kiemTra(String diUng, List<Thuoc> don) {
        List<CanhBao> kq = new ArrayList<>();
        String du = PhanTichCamXuc.boDau(diUng);
        for (Thuoc t : don) {
            String lyDo = trungDiUng(du, t);
            if (lyDo != null) {
                kq.add(new CanhBao(t.maThuoc(), CAO, t.tenThuoc() + " " + lyDo + ". Dị ứng đã ghi nhận: " + diUng.strip()));
            }
        }
        for (int i = 0; i < don.size(); i++) {
            for (int j = 0; j < don.size(); j++) {
                if (i == j) {
                    continue;
                }
                List<String> chung = new ArrayList<>(hoatChat(don.get(i).hoatChat()));
                chung.retainAll(hoatChat(don.get(j).hoatChat()));
                if (!chung.isEmpty()) {
                    kq.add(new CanhBao(don.get(i).maThuoc(), THUONG, "Trùng hoạt chất " + goc(don.get(i).hoatChat(), chung.get(0))
                            + " với " + don.get(j).tenThuoc()));
                }
            }
        }
        return kq;
    }

    /** Lý do thuốc trùng dị ứng (VD "có hoạt chất Amoxicillin thuộc nhóm Penicillin"), null nếu không trùng. */
    private static String trungDiUng(String du, Thuoc t) {
        if (du.isBlank()) {
            return null;
        }
        for (String hc : hoatChat(t.hoatChat())) {
            String ten = goc(t.hoatChat(), hc);
            if (du.contains(" " + hc + " ")) {
                return "có hoạt chất " + ten;
            }
            for (Map.Entry<String, List<String>> nhom : NHOM.entrySet()) {
                if (nhom.getValue().contains(hc)
                        && TEN_NHOM.get(nhom.getKey()).stream().anyMatch(n -> du.contains(" " + n + " "))) {
                    return "có hoạt chất " + ten + " thuộc nhóm " + nhom.getKey();
                }
            }
        }
        // Dị ứng ghi theo tên biệt dược (VD "dị ứng Hapacol")
        String tenThuoc = PhanTichCamXuc.boDau(t.tenThuoc()).strip();
        String tenGoc = tenThuoc.split(" ")[0];
        if (tenGoc.length() >= 4 && du.contains(" " + tenGoc + " ")) {
            return "trùng tên thuốc bệnh nhân dị ứng";
        }
        return null;
    }

    /** Tên hoạt chất như ghi trong danh mục (giữ dấu, chữ hoa) ứng với dạng đã bỏ dấu. */
    private static String goc(String hoatChat, String daBoDau) {
        for (String phan : hoatChat.split("[+,;/]| và ")) {
            if (PhanTichCamXuc.boDau(phan).strip().equals(daBoDau)) {
                return phan.strip();
            }
        }
        return daBoDau;
    }
}
