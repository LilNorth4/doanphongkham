package vn.vietbac.phongkham.chung;

/** Đối tượng không tồn tại hoặc không thuộc về người gọi -> HTTP 404. */
public class KhongTimThay extends RuntimeException {
    public KhongTimThay(String thongBao) {
        super(thongBao);
    }
}
