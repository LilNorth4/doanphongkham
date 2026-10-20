package vn.vietbac.phongkham.thucthe;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Quyền theo nhóm chức năng, VD: LICH_HEN.DUYET (UC2.7). */
@Entity
@Table(name = "Quyen")
@Getter
@Setter
public class Quyen {
    @Id
    @Column(name = "MaQuyen")
    private Integer maQuyen;

    @Column(name = "MaCode")
    private String maCode;

    @Column(name = "TenQuyen")
    private String tenQuyen;

    @Column(name = "NhomChucNang")
    private String nhomChucNang;
}
