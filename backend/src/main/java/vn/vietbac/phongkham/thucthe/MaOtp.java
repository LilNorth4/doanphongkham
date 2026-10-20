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

/** Mã OTP xác thực email (UC1.2) / khôi phục mật khẩu (UC1.4), hạn 5 phút, sai 5 lần thì vô hiệu. */
@Entity
@Table(name = "MaOTP")
@DynamicInsert
@DynamicUpdate
@Getter
@Setter
public class MaOtp {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaOTP")
    private Integer maOtp;

    @Column(name = "MaTK")
    private Integer maTK;

    @Column(name = "MaSo")
    private String maSo;

    /** XAC_THUC_EMAIL, KHOI_PHUC_MAT_KHAU */
    @Column(name = "MucDich")
    private String mucDich;

    @Column(name = "HetHan")
    private LocalDateTime hetHan;

    @Column(name = "SoLanSai")
    private Integer soLanSai;

    @Column(name = "DaDung")
    private Boolean daDung;

    @Column(name = "NgayTao")
    private LocalDateTime ngayTao;
}
