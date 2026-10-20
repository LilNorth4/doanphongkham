package vn.vietbac.phongkham.kho;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import vn.vietbac.phongkham.thucthe.ThongBao;

public interface ThongBaoRepository extends JpaRepository<ThongBao, Long> {
    List<ThongBao> findByMaTKNhanOrderByMaTBDesc(Integer maTK, Pageable trang);

    long countByMaTKNhanAndDaDocFalse(Integer maTK);

    @Modifying
    @Query("update ThongBao t set t.daDoc = true where t.maTKNhan = :tk")
    int docHet(@Param("tk") Integer maTK);

    @Modifying
    @Query("update ThongBao t set t.daDoc = true where t.maTKNhan = :tk and t.maTB = :tb")
    int daDoc(@Param("tk") Integer maTK, @Param("tb") Long maTB);
}
