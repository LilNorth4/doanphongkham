package vn.vietbac.phongkham.chung;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Component;

/**
 * Đường dẫn có chữ ký cho tệp y tế (ảnh / PDF kết quả cận lâm sàng, tệp góp ý): /api/tep-kq/{maTep}?het=...&ky=...
 * Đường dẫn chỉ được phát kèm các API đã kiểm tra quyền (bác sĩ điều trị, phòng CLS, bệnh nhân / người thân,
 * quản trị xử lý góp ý), hết hạn sau 2 giờ; thẻ img và tab PDF mở thẳng được mà không cần gửi token.
 * Khóa ký sinh ngẫu nhiên mỗi lần khởi động máy chủ: khởi động lại thì đường dẫn cũ hết hiệu lực, giao diện tải lại là có mới.
 */
@Component
public class TepBaoMat {

    public static final String DUONG_DAN = "/api/tep-kq/";
    private static final Duration HAN = Duration.ofHours(2);

    private final byte[] khoa = new byte[32];

    public TepBaoMat() {
        new SecureRandom().nextBytes(khoa);
    }

    /** Đường dẫn có chữ ký cho một tệp. */
    public String ky(Integer maTep) {
        long het = Instant.now().plus(HAN).getEpochSecond();
        return DUONG_DAN + maTep + "?het=" + het + "&ky=" + hmac(maTep + ":" + het);
    }

    /** Thay cột DuongDan (đường dẫn lưu trữ) của danh sách tệp bằng đường dẫn có chữ ký. */
    public List<Map<String, Object>> kyDanhSach(List<Map<String, Object>> ds) {
        for (Map<String, Object> t : ds) {
            t.put("DuongDan", ky((Integer) t.get("MaTep")));
        }
        return ds;
    }

    /** Chữ ký đúng và chưa hết hạn. */
    public boolean hopLe(Integer maTep, long het, String chuKy) {
        if (chuKy == null || Instant.now().getEpochSecond() > het) {
            return false;
        }
        return MessageDigest.isEqual(hmac(maTep + ":" + het).getBytes(StandardCharsets.US_ASCII),
                chuKy.getBytes(StandardCharsets.US_ASCII));
    }

    private String hmac(String s) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(khoa, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(s.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
