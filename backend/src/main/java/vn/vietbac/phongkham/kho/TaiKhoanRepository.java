package vn.vietbac.phongkham.kho;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import vn.vietbac.phongkham.thucthe.TaiKhoan;

public interface TaiKhoanRepository extends JpaRepository<TaiKhoan, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TaiKhoan t join fetch t.vaiTro where t.email = :email")
    Optional<TaiKhoan> khoaTheoEmail(@Param("email") String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TaiKhoan t join fetch t.vaiTro where t.sdt = :sdt")
    Optional<TaiKhoan> khoaTheoSdt(@Param("sdt") String sdt);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TaiKhoan t join fetch t.vaiTro where t.maTK = :ma")
    Optional<TaiKhoan> khoa(@Param("ma") Integer ma);

    Optional<TaiKhoan> findByEmailAndMaTKNot(String email, Integer maTK);

    Optional<TaiKhoan> findBySdtAndMaTKNot(String sdt, Integer maTK);

    @Query("select count(t) from TaiKhoan t where t.vaiTro.maCode = 'QUAN_TRI' and t.trangThai = 'HOAT_DONG' and t.maTK <> :tru")
    long demQuanTriKhac(@Param("tru") Integer tru);
}
