package vn.vietbac.phongkham.kho;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.vietbac.phongkham.thucthe.TheBhyt;

public interface TheBhytRepository extends JpaRepository<TheBhyt, String> {
    List<TheBhyt> findByMaBNOrderByNgayHetHanDesc(Integer maBN);

    /** Tìm theo mã thẻ 15 ký tự hoặc mã số BHXH 10 số. */
    Optional<TheBhyt> findFirstByMaTheOrMaSoBHXH(String maThe, String maSoBHXH);
}
