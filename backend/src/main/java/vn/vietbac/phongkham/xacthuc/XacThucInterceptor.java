package vn.vietbac.phongkham.xacthuc;

import java.util.Arrays;

import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.dichvu.XacThucService;

/**
 * Kiểm tra token "Authorization: Bearer ..." cho endpoint có tham số NguoiDung hoặc gắn @CanQuyen.
 * Phiên không hợp lệ -> 401; thiếu quyền hoặc còn mật khẩu tạm -> 403.
 */
@Component
public class XacThucInterceptor implements HandlerInterceptor {

    static final String THUOC_TINH = "phongkham.nguoiDung";

    private final XacThucService xacThuc;

    public XacThucInterceptor(XacThucService xacThuc) {
        this.xacThuc = xacThuc;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        if (!(handler instanceof HandlerMethod hm)) {
            return true;
        }
        CanQuyen can = hm.getMethodAnnotation(CanQuyen.class);
        boolean canDangNhap = can != null || Arrays.stream(hm.getMethodParameters())
                .anyMatch(p -> p.getParameterType() == NguoiDung.class);
        if (!canDangNhap) {
            return true;
        }
        String header = req.getHeader("Authorization");
        String token = header == null ? "" : header.replaceFirst("^Bearer ", "").strip();
        NguoiDung nd = xacThuc.xacThucPhien(token).voiToken(token);
        if (can != null) {
            if (nd.phaiDoiMatKhau()) {
                throw new LoiQuyen("Vui lòng đổi mật khẩu tạm thời trước khi sử dụng hệ thống");
            }
            if (Arrays.stream(can.value()).noneMatch(nd::co)) {
                throw new LoiQuyen("Bạn không có quyền thực hiện chức năng này");
            }
        }
        req.setAttribute(THUOC_TINH, nd);
        return true;
    }
}
