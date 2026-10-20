package vn.vietbac.phongkham.kho;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.vietbac.phongkham.thucthe.Quyen;

public interface QuyenRepository extends JpaRepository<Quyen, Integer> {
    List<Quyen> findByMaCodeIn(Collection<String> maCode);

    List<Quyen> findAllByOrderByMaQuyen();
}
