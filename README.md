# Hệ thống quản lý phòng khám

Đồ án tốt nghiệp. Hệ thống quản lý đặt lịch và khám bệnh cho phòng khám đa khoa.

| Phần | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 4, Spring Data JPA |
| Giao diện | React 19, TypeScript, Vite, Ant Design |
| Cơ sở dữ liệu | MySQL 8 |
| Đóng gói | Docker, Docker Compose, Nginx |

## Cấu trúc thư mục

```
phongkham/
├── backend/                     # API Spring Boot
│   ├── src/main/java/vn/vietbac/phongkham/
│   │   └── (api, dichvu, kho, thucthe, xacthuc, chung)
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/
│   │       ├── migration/       # Flyway: V1 tạo bảng, view, danh mục; V3 trigger
│   │       └── demo/            # Flyway: V2 dữ liệu thử (chỉ nạp khi DU_LIEU_THU=1)
│   ├── Dockerfile
│   └── pom.xml
├── web/                         # Giao diện React + Vite
│   ├── src/
│   │   ├── App.tsx              # Định tuyến, mỗi trang tải riêng (lazy)
│   │   ├── lib/                 # api.ts (gọi backend), auth.tsx (phiên đăng nhập), hangSo.ts
│   │   ├── hooks/               # useManHinhNho, useDemNguoc
│   │   ├── layouts/             # AppLayout (thanh bên), AuthLayout (đăng nhập), Logo
│   │   ├── components/          # Thành phần dùng chung: bảng, chọn khung giờ, thông báo, OTP
│   │   ├── pages/
│   │   │   ├── xac-thuc/        # Đăng nhập, đăng ký, OTP, quên / đổi mật khẩu
│   │   │   ├── benh-nhan/       # Đặt lịch, lịch hẹn của tôi
│   │   │   ├── le-tan/          # Quản lý lịch hẹn, đặt lịch hộ
│   │   │   ├── bac-si/          # Lịch khám
│   │   │   ├── lich-lam-viec/   # Lịch làm việc, đăng ký ca, duyệt ca
│   │   │   └── quan-tri/        # Tài khoản, phân quyền, nhật ký
│   │   └── styles/              # theme.ts (màu antd), index.css
│   ├── xem-thu.html             # Xem cùng lúc bản máy tính và điện thoại khi phát triển
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docs/                        # Sơ đồ use case, ERD, báo cáo
├── .env.example
├── docker-compose.yml
└── README.md
```

## Cấu hình

Sao chép `.env.example` thành `.env` rồi điền mật khẩu MySQL:

```bash
cp .env.example .env
```

| Biến | Ý nghĩa |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Kết nối MySQL |
| `DATABASE_URL` | Tùy chọn, thay cho 5 biến trên: `mysql://USER:PASSWORD@HOST:PORT/DATABASE_NAME` |
| `DU_LIEU_THU` | `1`: Flyway nạp thêm dữ liệu thử khi tạo CSDL lần đầu |
| `CHE_DO_THU` | `1`: xem mã OTP, mật khẩu tạm trong hộp thư giả lập. Không bật khi triển khai thật |
| `WEB_PORT` | Cổng mở giao diện khi chạy bằng Docker (mặc định 80) |

Backend đọc file `.env` ở thư mục gốc (khai báo `spring.config.import` trong `application.properties`). Biến môi trường của hệ điều hành hoặc cửa sổ lệnh (VD `DB_NAME=phongkham_kiemthu` khi chạy thử) được ưu tiên hơn `.env`, nên dữ liệu có thể bị ghi sang CSDL khác: xem dòng `Dữ liệu được lưu vào CSDL '...'` khi backend khởi động, hoặc nhãn `CSDL: ...` trên đầu trang khi bật `CHE_DO_THU=1`. Docker Compose cũng đọc file này. Giao diện web không cần biến môi trường vì mọi lời gọi đều đi qua đường dẫn `/api`.

## Cách 1: chạy bằng Docker (khuyên dùng)

Yêu cầu: Docker Desktop.

```bash
docker compose up -d --build
```

Mở http://localhost. Backend khởi động sẽ để Flyway tự tạo bảng, trigger (và dữ liệu thử nếu `DU_LIEU_THU=1`).

Xóa sạch dữ liệu để tạo lại từ đầu:

```bash
docker compose down -v
```

## Cách 2: tự chạy trên máy Windows, một cổng http://localhost:8080

Yêu cầu: JDK 21, Node.js 22, MySQL 8 (dịch vụ Windows, tự khởi động).

Chạy `cai_dat_tu_chay.bat` một lần. Script build giao diện (`web/dist`), đóng gói backend thành jar, đăng ký tác vụ
`PhongKhamVietBac` trong Task Scheduler rồi khởi động. Backend phục vụ luôn giao diện nên chỉ có một cổng 8080;
mỗi lần đăng nhập Windows máy chủ tự chạy ngầm (không có cửa sổ), cứ mở http://localhost:8080 là dùng.

- Sửa code xong: chạy lại `cai_dat_tu_chay.bat` để build và thay bản đang chạy.
- Máy chủ bị lỗi hoặc thoát (VD MySQL khởi động chậm hơn) thì tự chạy lại sau 10–60 giây; lịch sử ở `khoi-dong-lai.log`.
- Đã tắt hẳn (`/dung`) hoặc lỡ tắt tác vụ: `chay_phongkham.bat` khởi động lại và mở trình duyệt.
- Log: `C:\Users\Public\PhongKhamVietBac\backend.log`. Jar và `application.yml` (đường dẫn tới `.env`, `web/dist`,
  `backend/du-lieu-tai-len`) cũng nằm ở thư mục này vì Task Scheduler không chạy được trong thư mục có dấu.
- Tắt hẳn (không tự bật lại tới lần đăng nhập sau): `cai_dat_tu_chay.bat /dung`. Gỡ: `cai_dat_tu_chay.bat /gobo`.

## Cách 3: chạy khi phát triển (sửa giao diện thấy ngay)

Tắt bản tự chạy trước để giải phóng cổng 8080: `cai_dat_tu_chay.bat /dung`.

```bash
# Backend: http://localhost:8080
cd backend
./mvnw compile exec:java      # Windows: mvnw.cmd compile exec:java
# Không dùng spring-boot:run khi thư mục có dấu tiếng Việt: JVM con không đọc được classpath (ClassNotFoundException)
# Gặp lỗi ClassFormatError "Invalid method Code length 0": chạy ./mvnw clean compile exec:java

# Giao diện: http://localhost:5173 (Vite chuyển /api sang cổng 8080)
cd web
npm install
npm run dev
```

Không cần nạp CSDL bằng tay: chỉ cần MySQL đang chạy, backend tự tạo CSDL `phongkham` và chạy Flyway.

## Cơ sở dữ liệu

CSDL do Flyway quản lý, chạy tự động mỗi lần backend khởi động. Backend (Hibernate) không tự tạo hay sửa bảng.

| File | Nội dung |
|---|---|
| `db/migration/V1__tao_bang.sql` | Bảng, view, chú thích, dữ liệu danh mục |
| `db/demo/V2__du_lieu_thu.sql` | Dữ liệu thử theo luồng nghiệp vụ, chỉ nạp khi `DU_LIEU_THU=1` |
| `db/migration/V3__trigger.sql` | Trigger ràng buộc nghiệp vụ |

Lưu ý:

- Flyway ghi lại các file đã chạy trong bảng `flyway_schema_history`. **Không sửa file đã chạy**; muốn đổi cấu trúc thì thêm file mới `V4__mo_ta.sql`, `V5__...` vào `db/migration`.
- Dữ liệu thử nạp trước trigger vì dữ liệu ở trạng thái cuối (ví dụ đơn thuốc của hồ sơ đã hoàn tất), trigger sẽ chặn nếu nạp sau. Vì vậy phải chọn `DU_LIEU_THU` từ lần chạy đầu trên CSDL trống.
- Mật khẩu mọi tài khoản thử: `Phongkham123`.
- Tạo lại CSDL từ đầu: xóa CSDL (`DROP DATABASE phongkham;`, hoặc `docker compose down -v` khi chạy Docker) rồi khởi động lại backend.
