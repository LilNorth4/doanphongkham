package vn.vietbac.phongkham.chung;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Mọi lỗi trả về dạng {"detail": "..."} như giao diện đang đọc. */
@RestControllerAdvice
public class XuLyLoi {

    private static final Logger log = LoggerFactory.getLogger(XuLyLoi.class);

    private static ResponseEntity<Map<String, String>> tra(HttpStatus ma, String thongBao) {
        return ResponseEntity.status(ma).body(Map.of("detail", thongBao));
    }

    @ExceptionHandler(LoiNghiepVu.class)
    ResponseEntity<Map<String, String>> nghiepVu(LoiNghiepVu e) {
        return tra(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(LoiXacThuc.class)
    ResponseEntity<Map<String, String>> xacThuc(LoiXacThuc e) {
        return tra(HttpStatus.UNAUTHORIZED, e.getMessage());
    }

    @ExceptionHandler(LoiQuyen.class)
    ResponseEntity<Map<String, String>> quyen(LoiQuyen e) {
        return tra(HttpStatus.FORBIDDEN, e.getMessage());
    }

    @ExceptionHandler(KhongTimThay.class)
    ResponseEntity<Map<String, String>> khongTimThay(KhongTimThay e) {
        return tra(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<Map<String, String>> khongCoDuongDan(NoResourceFoundException e) {
        return tra(HttpStatus.NOT_FOUND, "Not Found");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<Map<String, String>> tepQuaLon(MaxUploadSizeExceededException e) {
        return tra(HttpStatus.BAD_REQUEST, "Tệp tải lên quá lớn (ảnh đại diện tối đa 2 MB, kết quả cận lâm sàng tối đa 20 MB)");
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestPartException.class, MethodArgumentNotValidException.class,
            MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<Map<String, String>> duLieuSai(Exception e) {
        return tra(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, String>> khac(Exception e) {
        log.error("Lỗi không xử lý được", e);
        return tra(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống, vui lòng thử lại");
    }
}
