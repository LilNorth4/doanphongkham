package vn.vietbac.phongkham.kho;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import vn.vietbac.phongkham.thucthe.LuotKham;

public interface LuotKhamRepository extends JpaRepository<LuotKham, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from LuotKham l where l.maLK = :ma")
    Optional<LuotKham> khoa(@Param("ma") Integer ma);
}
