package vn.vietbac.phongkham.thucthe;

import java.time.LocalDateTime;

import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Tài khoản đăng nhập bằng email/SĐT; khóa 15 phút khi sai 5 lần (BR15). */
@Entity
@Table(name = "TaiKhoan")
@DynamicInsert
@DynamicUpdate
@Getter
@Setter
public class TaiKhoan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaTK")
    private Integer maTK;

    @Column(name = "Email")
    private String email;

    @Column(name = "SDT")
    private String sdt;

    @Column(name = "MatKhauHash")
    private String matKhauHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaVaiTro")
    private VaiTro vaiTro;

    /** CHUA_KICH_HOAT, HOAT_DONG, BI_KHOA */
    @Column(name = "TrangThai")
    private String trangThai;

    @Column(name = "LyDoKhoa")
    private String lyDoKhoa;

    @Column(name = "SoLanSai")
    private Integer soLanSai;

    @Column(name = "KhoaDen")
    private LocalDateTime khoaDen;

    @Column(name = "PhaiDoiMatKhau")
    private Boolean phaiDoiMatKhau;

    @Column(name = "LanDangNhapCuoi")
    private LocalDateTime lanDangNhapCuoi;

    @Column(name = "NgayTao")
    private LocalDateTime ngayTao;
}
