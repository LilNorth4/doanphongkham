package vn.vietbac.phongkham.chung;

/** Phiên đăng nhập không hợp lệ hoặc đã hết hạn -> HTTP 401. */
public class LoiXacThuc extends RuntimeException {
    public LoiXacThuc(String thongBao) {
        super(thongBao);
    }
}
