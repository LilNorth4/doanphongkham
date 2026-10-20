package vn.vietbac.phongkham.kho;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import vn.vietbac.phongkham.thucthe.PhienDangNhap;

public interface PhienDangNhapRepository extends JpaRepository<PhienDangNhap, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PhienDangNhap> findByTokenHash(String tokenHash);

    /** Thu hồi mọi phiên còn hiệu lực của tài khoản, trừ phiên có hash giữ lại (nếu có). */
    @Modifying
    @Query("update PhienDangNhap p set p.daThuHoi = true where p.maTK = :tk and p.daThuHoi = false and p.tokenHash <> :giu")
    int thuHoi(@Param("tk") Integer maTK, @Param("giu") String hashGiuLai);

    @Modifying
    @Query("update PhienDangNhap p set p.daThuHoi = true where p.tokenHash = :hash")
    int thuHoiMot(@Param("hash") String tokenHash);
}
