package vn.vietbac.phongkham.chung;

/** Đã đăng nhập nhưng không có quyền, hoặc còn dùng mật khẩu tạm -> HTTP 403. */
public class LoiQuyen extends RuntimeException {
    public LoiQuyen(String thongBao) {
        super(thongBao);
    }
}
