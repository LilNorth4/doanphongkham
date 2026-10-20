package vn.vietbac.phongkham.thucthe;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Nhật ký thao tác quản trị: tạo/khóa tài khoản, gán vai trò, phân quyền... (UC2.6, UC2.8). */
@Entity
@Table(name = "NhatKyThaoTac")
@Getter
@Setter
@NoArgsConstructor
public class NhatKyThaoTac {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaNK")
    private Long maNK;

    /** Người thực hiện; null = hệ thống tự động. */
    @Column(name = "MaTK")
    private Integer maTK;

    @Column(name = "HanhDong")
    private String hanhDong;

    @Column(name = "DoiTuong")
    private String doiTuong;

    @Column(name = "MaDoiTuong")
    private String maDoiTuong;

    @Column(name = "ChiTiet")
    private String chiTiet;

    @Column(name = "ThoiGian")
    private LocalDateTime thoiGian;

    public NhatKyThaoTac(Integer maTK, String hanhDong, String doiTuong, String maDoiTuong, String chiTiet,
                         LocalDateTime thoiGian) {
        this.maTK = maTK;
        this.hanhDong = hanhDong;
        this.doiTuong = doiTuong;
        this.maDoiTuong = maDoiTuong;
        this.chiTiet = chiTiet;
        this.thoiGian = thoiGian;
    }
}
