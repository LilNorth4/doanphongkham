package vn.vietbac.phongkham.thucthe;

import java.math.BigDecimal;
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

/**
 * Lượt khám = lịch hẹn (gói 6, 7, 8). Vòng đời: CHO_XAC_NHAN -> DA_XAC_NHAN -> DA_CHECK_IN -> DANG_KHAM
 * -> CHO_CLS -> DA_CO_KET_QUA -> HOAN_THANH; kết thúc khác: DA_HUY, VANG_MAT (trigger kiểm tra chuyển trạng thái).
 * Cột sinh KGHieuLuc (BR01) do MySQL tự tính nên không ánh xạ.
 */
@Entity
@Table(name = "LuotKham")
@DynamicInsert
@DynamicUpdate
@Getter
@Setter
public class LuotKham {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaLK")
    private Integer maLK;

    @Column(name = "MaLichHen")
    private String maLichHen;

    @Column(name = "MaBN")
    private Integer maBN;

    @Column(name = "MaBS")
    private Integer maBS;

    @Column(name = "MaKG")
    private Integer maKG;

    @Column(name = "NgayKham")
    private LocalDate ngayKham;

    /** UNG_DUNG, WEB, DIEN_THOAI, TIN_NHAN, TAI_QUAY */
    @Column(name = "KenhDat")
    private String kenhDat;

    @Column(name = "LyDoKham")
    private String lyDoKham;

    @Column(name = "TrieuChungSoBo")
    private String trieuChungSoBo;

    @Column(name = "TrangThai")
    private String trangThai;

    @Column(name = "SoLanDoi")
    private Integer soLanDoi;

    @Column(name = "MaNguoiTao")
    private Integer maNguoiTao;

    @Column(name = "MaNguoiDuyet")
    private Integer maNguoiDuyet;

    @Column(name = "ThoiDiemDuyet")
    private LocalDateTime thoiDiemDuyet;

    @Column(name = "LyDoHuy")
    private String lyDoHuy;

    @Column(name = "MaNguoiHuy")
    private Integer maNguoiHuy;

    @Column(name = "ThoiDiemHuy")
    private LocalDateTime thoiDiemHuy;

    @Column(name = "DaNhacLich")
    private Boolean daNhacLich;

    @Column(name = "ThoiDiemCheckIn")
    private LocalDateTime thoiDiemCheckIn;

    @Column(name = "MaLeTanCheckIn")
    private Integer maLeTanCheckIn;

    @Column(name = "SoThuTu")
    private Integer soThuTu;

    @Column(name = "ThuTuHangCho")
    private BigDecimal thuTuHangCho;

    @Column(name = "MaThe")
    private String maThe;

    /** KHONG_CO, HOP_LE, KHONG_HOP_LE, CHO_XAC_MINH */
    @Column(name = "TrangThaiBHYT")
    private String trangThaiBHYT;

    @Column(name = "MucHuong")
    private Integer mucHuong;

    @Column(name = "ThoiGianChoDuKien")
    private Integer thoiGianChoDuKien;

    @Column(name = "GioDuKienVaoKham")
    private LocalDateTime gioDuKienVaoKham;

    @Column(name = "DaThongBaoSapDenLuot")
    private Boolean daThongBaoSapDenLuot;

    @Column(name = "NgayTao")
    private LocalDateTime ngayTao;
}
