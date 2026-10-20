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

/** Đăng ký danh sách chờ (UC6.8-6.10, UC13.9, BR21): khung giờ trống được giữ 15 phút cho người đầu hàng. */
@Entity
@Table(name = "DangKyCho")
@DynamicInsert
@DynamicUpdate
@Getter
@Setter
public class DangKyCho {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaDKC")
    private Integer maDKC;

    @Column(name = "MaBN")
    private Integer maBN;

    @Column(name = "MaCK")
    private Integer maCK;

    /** null = bác sĩ bất kỳ trong chuyên khoa */
    @Column(name = "MaBS")
    private Integer maBS;

    @Column(name = "NgayMongMuon")
    private LocalDate ngayMongMuon;

    /** SANG, CHIEU, CA_NGAY */
    @Column(name = "Buoi")
    private String buoi;

    @Column(name = "LyDoKham")
    private String lyDoKham;

    @Column(name = "ThoiDiemDangKy")
    private LocalDateTime thoiDiemDangKy;

    @Column(name = "ThoiDiemXepHang")
    private LocalDateTime thoiDiemXepHang;

    /** DANG_CHO, DANG_DUOC_MOI, DA_NHAN_CHO, HET_HAN, DA_HUY */
    @Column(name = "TrangThai")
    private String trangThai;

    @Column(name = "MaKGDuocMoi")
    private Integer maKGDuocMoi;

    @Column(name = "HanGiuCho")
    private LocalDateTime hanGiuCho;

    @Column(name = "MaLK")
    private Integer maLK;
}
