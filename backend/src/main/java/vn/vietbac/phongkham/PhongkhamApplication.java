package vn.vietbac.phongkham;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Hệ thống quản lý phòng khám: API cho giao diện web (thư mục web/). */
@SpringBootApplication
@EnableScheduling
public class PhongkhamApplication {

	public static void main(String[] args) {
		SpringApplication.run(PhongkhamApplication.class, args);
	}

}
