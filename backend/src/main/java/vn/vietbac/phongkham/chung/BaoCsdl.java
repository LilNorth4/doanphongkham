package vn.vietbac.phongkham.chung;

import java.sql.Connection;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * In ra CSDL backend đang ghi khi khởi động xong. Biến môi trường DB_NAME / DATABASE_URL của hệ điều hành
 * hoặc của cửa sổ lệnh được ưu tiên hơn file .env, nên dễ chạy nhầm sang CSDL khác mà không biết.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BaoCsdl {

    private final DataSource dataSource;

    @EventListener(ApplicationReadyEvent.class)
    public void baoCsdl() {
        try (Connection c = dataSource.getConnection()) {
            String url = c.getMetaData().getURL();
            int hoi = url.indexOf('?');
            log.info("Dữ liệu được lưu vào CSDL '{}' ({})", c.getCatalog(), hoi < 0 ? url : url.substring(0, hoi));
        } catch (SQLException e) {
            log.warn("Không đọc được tên CSDL đang dùng: {}", e.getMessage());
        }
    }
}
