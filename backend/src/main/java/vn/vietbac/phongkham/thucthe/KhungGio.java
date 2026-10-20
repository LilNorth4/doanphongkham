package vn.vietbac.phongkham.thucthe;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

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

/** Khung giờ khám sinh từ ca làm việc (UC4.3). */
@Entity
@Table(name = "KhungGio")
@DynamicInsert
@DynamicUpdate
@Getter
@Setter
public class KhungGio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaKG")
    private Integer maKG;

    @Column(name = "MaCa")
    private Integer maCa;

    @Column(name = "NgayKham")
    private LocalDate ngayKham;

    @Column(name = "GioBatDau")
    private LocalTime gioBatDau;

    @Column(name = "GioKetThuc")
    private LocalTime gioKetThuc;

    /** TRONG, DA_DAT, DANG_GIU_CHO, DA_KHOA */
    @Column(name = "TrangThai")
    private String trangThai;

    @Column(name = "LyDoKhoa")
    private String lyDoKhoa;

    @Column(name = "MaNguoiKhoa")
    private Integer maNguoiKhoa;

    public LocalDateTime batDau() {
        return LocalDateTime.of(ngayKham, gioBatDau);
    }

    public LocalDateTime ketThuc() {
        return LocalDateTime.of(ngayKham, gioKetThuc);
    }
}
