package vn.vietbac.phongkham.thucthe;

import org.hibernate.annotations.DynamicInsert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Hàng đợi gửi thông báo qua PUSH / EMAIL / TIN_NHAN; worker bên ngoài gửi thật và thử lại tối đa 3 lần. */
@Entity
@Table(name = "GuiThongBao")
@DynamicInsert
@Getter
@Setter
@NoArgsConstructor
public class GuiThongBao {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaGui")
    private Long maGui;

    @Column(name = "MaTB")
    private Long maTB;

    @Column(name = "Kenh")
    private String kenh;

    public GuiThongBao(Long maTB, String kenh) {
        this.maTB = maTB;
        this.kenh = kenh;
    }
}
