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

/** Thông báo trong hệ thống (UC1.8, UC13.1); việc gửi qua kênh nằm ở GuiThongBao. */
@Entity
@Table(name = "ThongBao")
@DynamicInsert
@DynamicUpdate
@Getter
@Setter
public class ThongBao {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaTB")
    private Long maTB;

    @Column(name = "MaTKNhan")
    private Integer maTKNhan;

    /** Bệnh nhân chưa có tài khoản (BR23) */
    @Column(name = "MaBN")
    private Integer maBN;

    @Column(name = "LoaiSuKien")
    private String loaiSuKien;

    @Column(name = "TieuDe")
    private String tieuDe;

    @Column(name = "NoiDung")
    private String noiDung;

    /** Điều hướng khi bấm: LUOT_KHAM, DANG_KY_CHO... */
    @Column(name = "LoaiDoiTuong")
    private String loaiDoiTuong;

    @Column(name = "MaDoiTuong")
    private Integer maDoiTuong;

    @Column(name = "DaDoc")
    private Boolean daDoc;

    @Column(name = "ThoiGianTao")
    private LocalDateTime thoiGianTao;
}
