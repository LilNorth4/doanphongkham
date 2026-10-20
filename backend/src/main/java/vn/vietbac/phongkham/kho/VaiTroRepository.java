package vn.vietbac.phongkham.kho;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.vietbac.phongkham.thucthe.VaiTro;

public interface VaiTroRepository extends JpaRepository<VaiTro, Integer> {
    Optional<VaiTro> findByMaCode(String maCode);
}
