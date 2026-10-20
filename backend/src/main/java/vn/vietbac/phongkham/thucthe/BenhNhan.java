package vn.vietbac.phongkham.thucthe;

import java.time.LocalDate;
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

/** Hồ sơ bệnh nhân; MaTK null khi lễ tân tạo hồ sơ theo SĐT (BR23). */
@Entity
@Table(name = "BenhNhan")
@DynamicInsert
@DynamicUpdate
@Getter
@Setter
public class BenhNhan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaBN")
    private Integer maBN;

    @Column(name = "MaTK")
    private Integer maTK;

    @Column(name = "HoTen")
    private String hoTen;

    @Column(name = "NgaySinh")
    private LocalDate ngaySinh;

    @Column(name = "GioiTinh")
    private String gioiTinh;

    @Column(name = "SDT")
    private String sdt;

    @Column(name = "CCCD")
    private String cccd;

    @Column(name = "Email")
    private String email;

    @Column(name = "DiaChi")
    private String diaChi;

    @Column(name = "AnhDaiDien")
    private String anhDaiDien;

    @Column(name = "NguoiLienHe")
    private String nguoiLienHe;

    @Column(name = "SDTNguoiLienHe")
    private String sdtNguoiLienHe;

    @Column(name = "DiUng")
    private String diUng;

    @Column(name = "NgayTao")
    private LocalDateTime ngayTao;
}
