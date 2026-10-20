package vn.vietbac.phongkham.kho;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import vn.vietbac.phongkham.thucthe.KhungGio;

public interface KhungGioRepository extends JpaRepository<KhungGio, Integer> {

    /** Khóa khung giờ trong giao dịch đặt lịch để hai người không đặt trùng (BR01). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select k from KhungGio k where k.maKG = :ma")
    Optional<KhungGio> khoa(@Param("ma") Integer ma);
}
