package vn.vietbac.phongkham.chung;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Lưu ảnh người dùng tải lên (ảnh đại diện) vào thư mục trên đĩa, phục vụ lại qua /api/tep/**
 * (khai báo trong CauHinhWeb). Chỉ nhận JPEG, PNG, WEBP; nhận dạng theo byte đầu file chứ không tin đuôi file.
 */
@Component
public class LuuAnh {

    public static final String DUONG_DAN_WEB = "/api/tep/";
    private static final long TOI_DA = 2L * 1024 * 1024;

    private final Path thuMuc;

    public LuuAnh(@Value("${phongkham.thu-muc-tai-len}") String thuMuc) {
        this.thuMuc = Path.of(thuMuc).toAbsolutePath().normalize();
    }

    public Path thuMuc() {
        return thuMuc;
    }

    /** Lưu ảnh vào thư mục con, trả về đường dẫn web để ghi vào CSDL (VD /api/tep/anh-dai-dien/abc.jpg). */
    public String luu(MultipartFile tep, String thuMucCon, String tienTo) {
        if (tep == null || tep.isEmpty()) {
            throw new LoiNghiepVu("Vui lòng chọn ảnh");
        }
        if (tep.getSize() > TOI_DA) {
            throw new LoiNghiepVu("Ảnh tối đa 2 MB");
        }
        try {
            byte[] dau;
            try (InputStream in = tep.getInputStream()) {
                dau = in.readNBytes(12);
            }
            String duoi = duoiAnh(dau);
            if (duoi == null) {
                throw new LoiNghiepVu("Chỉ nhận ảnh JPG, PNG hoặc WEBP");
            }
            Path dich = thuMuc.resolve(thuMucCon);
            Files.createDirectories(dich);
            String ten = tienTo + "-" + UUID.randomUUID().toString().replace("-", "") + "." + duoi;
            try (InputStream in = tep.getInputStream()) {
                Files.copy(in, dich.resolve(ten));
            }
            return DUONG_DAN_WEB + thuMucCon + "/" + ten;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Xóa file theo đường dẫn web đã lưu; bỏ qua nếu không phải file do hệ thống lưu. */
    public void xoa(String duongDanWeb) {
        if (duongDanWeb == null || !duongDanWeb.startsWith(DUONG_DAN_WEB)) {
            return;
        }
        Path tep = thuMuc.resolve(duongDanWeb.substring(DUONG_DAN_WEB.length())).normalize();
        if (!tep.startsWith(thuMuc)) {
            return;
        }
        try {
            Files.deleteIfExists(tep);
        } catch (IOException e) {
            // File mồ côi không ảnh hưởng nghiệp vụ, chỉ tốn chỗ
        }
    }

    private static String duoiAnh(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if (b.length >= 8 && Arrays.equals(Arrays.copyOf(b, 8),
                new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})) {
            return "png";
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "webp";
        }
        return null;
    }
}
