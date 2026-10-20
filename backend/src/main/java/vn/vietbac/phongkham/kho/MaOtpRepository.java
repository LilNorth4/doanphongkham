package vn.vietbac.phongkham.kho;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import vn.vietbac.phongkham.thucthe.MaOtp;

public interface MaOtpRepository extends JpaRepository<MaOtp, Integer> {

    @Query("select max(o.ngayTao) from MaOtp o where o.maTK = :tk and o.mucDich = :md")
    LocalDateTime lanGuiGanNhat(@Param("tk") Integer maTK, @Param("md") String mucDich);

    @Modifying
    @Query("update MaOtp o set o.daDung = true where o.maTK = :tk and o.mucDich = :md and o.daDung = false")
    int huyMaCu(@Param("tk") Integer maTK, @Param("md") String mucDich);

    /** Mã còn hiệu lực mới nhất, khóa dòng để đếm số lần nhập sai chính xác. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<MaOtp> findFirstByMaTKAndMucDichAndDaDungFalseAndHetHanGreaterThanEqualOrderByMaOtpDesc(
            Integer maTK, String mucDich, LocalDateTime bayGio);
}
