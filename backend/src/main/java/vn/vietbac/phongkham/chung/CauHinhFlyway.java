package vn.vietbac.phongkham.chung;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.flyway.autoconfigure.FlywayConfigurationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Bật dữ liệu thử thì Flyway nạp thêm db/demo (V2__du_lieu_thu.sql), xen giữa V1 tạo bảng và V3 trigger.
 * Phải chọn từ lần chạy đầu trên CSDL trống: bật sau khi V3 đã chạy thì Flyway báo lỗi lệch thứ tự.
 */
@Configuration
public class CauHinhFlyway {

    @Bean
    FlywayConfigurationCustomizer napDuLieuThu(@Value("${phongkham.du-lieu-thu}") boolean duLieuThu) {
        return cauHinh -> {
            if (duLieuThu) {
                cauHinh.locations("classpath:db/migration", "classpath:db/demo");
            }
        };
    }
}
