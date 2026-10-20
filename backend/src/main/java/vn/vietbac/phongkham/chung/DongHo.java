package vn.vietbac.phongkham.chung;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Component;

/** Mọi mốc thời gian nghiệp vụ lấy từ đây (làm tròn tới giây như cột DATETIME). */
@Component
public class DongHo {
    public LocalDateTime bayGio() {
        return LocalDateTime.now().withNano(0);
    }

    public LocalDate homNay() {
        return LocalDate.now();
    }
}
