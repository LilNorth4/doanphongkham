package vn.vietbac.phongkham.api;

import java.nio.file.Path;
import java.util.Map;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.chung.LuuAnh;
import vn.vietbac.phongkham.chung.TepBaoMat;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Phục vụ tệp y tế (ảnh / PDF kết quả cận lâm sàng, tệp góp ý) qua đường dẫn có chữ ký do TepBaoMat phát. Không cần
 * token (thẻ img, tab PDF mở thẳng) nhưng chữ ký chỉ có trong các API đã kiểm tra quyền và hết hạn sau 2 giờ.
 */
@RestController
public class TepController {

    private static final Map<String, MediaType> KIEU = Map.of("JPG", MediaType.IMAGE_JPEG, "PNG", MediaType.IMAGE_PNG,
            "PDF", MediaType.APPLICATION_PDF);

    private final TepBaoMat tepBaoMat;
    private final LuuAnh luuAnh;
    private final TruyVan tv;

    public TepController(TepBaoMat tepBaoMat, LuuAnh luuAnh, TruyVan tv) {
        this.tepBaoMat = tepBaoMat;
        this.luuAnh = luuAnh;
        this.tv = tv;
    }

    @GetMapping(TepBaoMat.DUONG_DAN + "{maTep}")
    public ResponseEntity<Resource> tep(@PathVariable Integer maTep, @RequestParam long het, @RequestParam String ky) {
        if (!tepBaoMat.hopLe(maTep, het, ky)) {
            throw new LoiQuyen("Đường dẫn tệp đã hết hạn, vui lòng tải lại trang");
        }
        Map<String, Object> t = tv.mot("SELECT DuongDan, TenTep, LoaiTep FROM TepDinhKem WHERE MaTep = ?", maTep);
        Path tep = t == null ? null : luuAnh.tepTrenDia((String) t.get("DuongDan"));
        if (tep == null) {
            throw new KhongTimThay("Không tìm thấy tệp");
        }
        return ResponseEntity.ok()
                .contentType(KIEU.getOrDefault((String) t.get("LoaiTep"), MediaType.APPLICATION_OCTET_STREAM))
                // Mở ngay trong trình duyệt (ảnh, PDF), giữ tên gốc khi người dùng lưu về máy
                .header("Content-Disposition", ContentDisposition.inline()
                        .filename((String) t.get("TenTep"), java.nio.charset.StandardCharsets.UTF_8).build().toString())
                .cacheControl(CacheControl.noStore().cachePrivate())
                .body(new FileSystemResource(tep));
    }
}
