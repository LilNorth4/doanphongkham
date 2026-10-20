package vn.vietbac.phongkham.kho;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;
import vn.vietbac.phongkham.thucthe.BenhNhan;

public interface BenhNhanRepository extends JpaRepository<BenhNhan, Integer> {
    Optional<BenhNhan> findByMaTK(Integer maTK);

    boolean existsByCccd(String cccd);

    List<BenhNhan> findByCccd(String cccd);

    List<BenhNhan> findBySdtOrderByMaBN(String sdt);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<BenhNhan> findFirstByCccd(String cccd);

    /** Hồ sơ lễ tân tạo sẵn chưa có tài khoản và chưa có CCCD (để gắn khi bệnh nhân tự đăng ký, BR23). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<BenhNhan> findBySdtAndNgaySinhAndMaTKIsNullAndCccdIsNullOrderByMaBN(String sdt, LocalDate ngaySinh);
}
