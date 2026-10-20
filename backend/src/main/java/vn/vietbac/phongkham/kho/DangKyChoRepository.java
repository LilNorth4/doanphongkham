package vn.vietbac.phongkham.kho;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import vn.vietbac.phongkham.thucthe.DangKyCho;

public interface DangKyChoRepository extends JpaRepository<DangKyCho, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from DangKyCho d where d.maDKC = :ma")
    Optional<DangKyCho> khoa(@Param("ma") Integer ma);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from DangKyCho d where d.trangThai = 'DANG_DUOC_MOI' and d.hanGiuCho < :bayGio")
    List<DangKyCho> khoaGiuChoHetHan(@Param("bayGio") LocalDateTime bayGio);

    @Query("select count(d) from DangKyCho d where d.maBN = :bn and d.trangThai in ('DANG_CHO','DANG_DUOC_MOI')")
    long demConHieuLuc(@Param("bn") Integer maBN);
}
