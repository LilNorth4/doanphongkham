package vn.vietbac.phongkham.thucthe;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Thẻ bảo hiểm y tế; cổng giám định được mô phỏng bằng bảng này (BR08). */
@Entity
@Table(name = "TheBHYT")
@Getter
@Setter
public class TheBhyt {
    @Id
    @Column(name = "MaThe")
    private String maThe;

    @Column(name = "MaSoBHXH")
    private String maSoBHXH;

    @Column(name = "MaBN")
    private Integer maBN;

    @Column(name = "HoTenTrenThe")
    private String hoTenTrenThe;

    @Column(name = "NgaySinhTrenThe")
    private LocalDate ngaySinhTrenThe;

    @Column(name = "NoiDKKCB")
    private String noiDKKCB;

    @Column(name = "NgayBatDau")
    private LocalDate ngayBatDau;

    @Column(name = "NgayHetHan")
    private LocalDate ngayHetHan;

    @Column(name = "MucHuong")
    private Integer mucHuong;
}
