package vn.vietbac.phongkham.dichvu;

import org.springframework.stereotype.Service;

import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.kho.NhatKyThaoTacRepository;
import vn.vietbac.phongkham.thucthe.NhatKyThaoTac;

/** Ghi nhật ký thao tác (UC2.6, UC2.8). Gọi bên trong giao dịch của nghiệp vụ để cùng commit/rollback. */
@Service
public class NhatKyService {

    private final NhatKyThaoTacRepository repo;
    private final DongHo dongHo;

    public NhatKyService(NhatKyThaoTacRepository repo, DongHo dongHo) {
        this.repo = repo;
        this.dongHo = dongHo;
    }

    /** maTKThucHien null = hệ thống tự động (VD khóa tạm do sai mật khẩu). */
    public void ghi(Integer maTKThucHien, String hanhDong, String doiTuong, Object maDoiTuong, String chiTiet) {
        repo.save(new NhatKyThaoTac(maTKThucHien, hanhDong, doiTuong,
                maDoiTuong == null ? null : String.valueOf(maDoiTuong), chiTiet, dongHo.bayGio()));
    }

    /** Nhật ký có đối tượng là tài khoản. */
    public void taiKhoan(Integer maTKThucHien, String hanhDong, Integer maTK, String chiTiet) {
        ghi(maTKThucHien, hanhDong, "TaiKhoan", maTK, chiTiet);
    }
}
