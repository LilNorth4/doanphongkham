package vn.vietbac.phongkham.thucthe;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Vai trò người dùng (UC2.6) và các quyền được gán (UC2.7, bảng VaiTroQuyen). */
@Entity
@Table(name = "VaiTro")
@Getter
@Setter
public class VaiTro {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaVaiTro")
    private Integer maVaiTro;

    @Column(name = "MaCode")
    private String maCode;

    @Column(name = "TenVaiTro")
    private String tenVaiTro;

    @Column(name = "MoTa")
    private String moTa;

    @ManyToMany
    @JoinTable(name = "VaiTroQuyen", joinColumns = @JoinColumn(name = "MaVaiTro"),
            inverseJoinColumns = @JoinColumn(name = "MaQuyen"))
    private Set<Quyen> quyen = new HashSet<>();
}
