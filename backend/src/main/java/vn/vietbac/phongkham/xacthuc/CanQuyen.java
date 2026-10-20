package vn.vietbac.phongkham.xacthuc;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Endpoint yêu cầu quyền (mã trong bảng Quyen, VD "LICH_HEN.DUYET"); khai báo nhiều mã thì có một trong số đó là đủ.
 * Người dùng còn dùng mật khẩu tạm
 * bị chặn cho tới khi đổi mật khẩu. Endpoint chỉ cần đăng nhập thì khai báo tham số kiểu NguoiDung.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface CanQuyen {
    String[] value();
}
