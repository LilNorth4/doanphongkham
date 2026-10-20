package vn.vietbac.phongkham.chung;

/** Vi phạm quy tắc nghiệp vụ (BRxx), thông báo hiển thị được cho người dùng -> HTTP 400. */
public class LoiNghiepVu extends RuntimeException {
    public LoiNghiepVu(String thongBao) {
        super(thongBao);
    }
}
