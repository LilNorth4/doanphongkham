package vn.vietbac.phongkham.thucthe;

import java.math.BigDecimal;
import java.time.LocalDate;

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

/** Hồ sơ nhân viên: lễ tân, bác sĩ lâm sàng (có chuyên khoa), bác sĩ CLS (có phòng phụ trách), quản trị. */
@Entity
@Table(name = "NhanVien")
@DynamicInsert
@DynamicUpdate
@Getter
@Setter
public class NhanVien {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaNV")
    private Integer maNV;

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

    @Column(name = "Email")
    private String email;

    @Column(name = "DiaChi")
    private String diaChi;

    @Column(name = "AnhDaiDien")
    private String anhDaiDien;

    /** LE_TAN, BAC_SI, BS_XET_NGHIEM, BS_CDHA, BS_NOI_SOI, QUAN_TRI (trùng mã vai trò) */
    @Column(name = "LoaiNhanVien")
    private String loaiNhanVien;

    @Column(name = "MaCK")
    private Integer maCK;

    @Column(name = "HocHamHocVi")
    private String hocHamHocVi;

    @Column(name = "SoNamKinhNghiem")
    private Integer soNamKinhNghiem;

    @Column(name = "GioiThieu")
    private String gioiThieu;

    @Column(name = "DiemDanhGiaTB")
    private BigDecimal diemDanhGiaTB;

    @Column(name = "SoLuotDanhGia")
    private Integer soLuotDanhGia;

    @Column(name = "MaPhongPhuTrach")
    private Integer maPhongPhuTrach;

    /** HOAT_DONG, NGUNG_HOAT_DONG */
    @Column(name = "TrangThai")
    private String trangThai;
}
