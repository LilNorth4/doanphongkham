package vn.vietbac.phongkham.thucthe;

import java.time.LocalDateTime;

import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Phiên đăng nhập: chỉ lưu SHA-256 của token để thu hồi khi đổi mật khẩu / khóa tài khoản. */
@Entity
@Table(name = "PhienDangNhap")
@DynamicInsert
@DynamicUpdate
@Getter
@Setter
public class PhienDangNhap {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaPhien")
    private Long maPhien;

    @Column(name = "MaTK")
    private Integer maTK;

    @Column(name = "RefreshTokenHash")
    private String tokenHash;

    @Column(name = "ThietBi")
    private String thietBi;

    @Column(name = "NgayTao")
    private LocalDateTime ngayTao;

    @Column(name = "HetHan")
    private LocalDateTime hetHan;

    @Column(name = "DaThuHoi")
    private Boolean daThuHoi;
}
