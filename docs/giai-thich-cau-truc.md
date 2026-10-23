# Giải thích cấu trúc mã nguồn

Hệ thống quản lý phòng khám đa khoa Việt Bắc. Cập nhật ngày 23/10/2026.

Hệ thống gồm 3 phần:

- **`backend/`**: API viết bằng Spring Boot, chạy ở cổng 8080.
- **`web/`**: giao diện React.
- **MySQL 8**: cơ sở dữ liệu, do Flyway tự tạo bảng khi backend khởi động.

## Mục lục

1. [Thư mục gốc](#1-thư-mục-gốc)
2. [backend/: API Spring Boot](#2-backend--api-spring-boot)
3. [web/: Giao diện React](#3-web--giao-diện-react)
4. [docs/](#4-docs)
5. [Ví dụ: một thao tác đi qua những file nào](#5-ví-dụ-một-thao-tác-đi-qua-những-file-nào)
6. [Lưu ý](#6-lưu-ý)

---

## 1. Thư mục gốc

### Mã nguồn

| Mục | Vai trò |
|---|---|
| `backend/` | API Spring Boot (Java 21), cổng 8080. |
| `web/` | Giao diện React + Vite + Ant Design. |
| `docs/` | Tài liệu đồ án: use case, ERD, báo cáo, ảnh giao diện. |

### Cấu hình chạy hệ thống

| File | Vai trò |
|---|---|
| `.env` | Cấu hình thật trên máy: kết nối MySQL (`DB_HOST`, `DB_USER`, `DB_PASSWORD`…), `DU_LIEU_THU` (nạp dữ liệu mẫu), `CHE_DO_THU` (xem OTP trong hộp thư giả lập). Backend và Docker đều đọc file này. Không đưa lên git vì chứa mật khẩu. |
| `.env.example` | Bản mẫu của `.env`, có đưa lên git. Người khác sao chép thành `.env` rồi điền mật khẩu của họ. |
| `docker-compose.yml` | Chạy cả hệ thống bằng `docker compose up -d --build`. Gồm 3 dịch vụ: `db` (MySQL 8.4), `backend`, `web` (Nginx, cổng 80). Dữ liệu giữ trong 2 volume: `db_data` cho CSDL, `tai_len` cho ảnh tải lên. |
| `chay_phongkham.bat` | Chạy nhanh trên Windows không cần Docker. Mở 2 cửa sổ: backend (cổng 8080) và web (cổng 5174). Server nào đang chạy thì bỏ qua. Đợi backend lên rồi tự mở trình duyệt. Cần MySQL đang chạy sẵn. |
| `README.md` | Hướng dẫn chung: công nghệ, cấu trúc, biến môi trường, 2 cách chạy, cách tạo lại CSDL. |
| `.gitignore` | Những thứ không đưa lên git: `.env`, `.mcp.json`, `node_modules`, `target`, `web/dist`, ảnh tải lên, `*.sql` và thư mục `db/`, `.claude/`. |

### Cấu hình công cụ (không ảnh hưởng tới cách web chạy)

| Mục | Vai trò |
|---|---|
| `.vscode/settings.json` | Cài đặt VS Code: kết nối SQLTools tới MySQL `phongkham` để xem CSDL ngay trong VS Code, và tắt chế độ Java tự biên dịch để không ghi đè class do Maven tạo. |
| `.claude/launch.json` | Cấu hình để Claude Code chạy dev server của web. Không đưa lên git. |
| `.mcp.json` / `.mcp.json.example` | Cấu hình MCP để Claude đọc trực tiếp CSDL MySQL. Quyền ghi, sửa, xóa đều đã tắt. `.mcp.json` là bản thật (không đưa lên git), `.example` là bản mẫu. |
| `.github/modernize/java-upgrade/` | Do tiện ích nâng cấp Java (GitHub Copilot App Modernization) trong VS Code tự tạo. Không liên quan tới đồ án và tự loại khỏi git. |

---

## 2. `backend/` – API Spring Boot

### File ở gốc `backend/`

| File | Vai trò |
|---|---|
| `pom.xml` | Khai báo dự án Maven: Java 21, Spring Boot 4.1, các thư viện (JPA, Validation, Web, Flyway, MySQL, Lombok) và plugin `exec` để chạy bằng `mvnw compile exec:java`. |
| `mvnw`, `mvnw.cmd`, `.mvn/wrapper/` | Maven Wrapper: chạy Maven mà không cần cài sẵn. `mvnw` dùng cho Linux/Mac, `mvnw.cmd` dùng cho Windows. |
| `Dockerfile` | Đóng gói qua 2 bước. Bước 1 dùng image Maven để build file `.jar`. Bước 2 chỉ giữ JRE và file jar cho image nhẹ, chạy ở cổng 8080. |
| `.dockerignore` | Những thứ không gửi vào Docker khi build (`target/`, `mvnw`…). |
| `.gitattributes` | Giữ đúng kiểu xuống dòng: `mvnw` dùng LF, `*.cmd` dùng CRLF. |
| `.gitignore` | Mẫu có sẵn của Spring: bỏ qua `target/` và file cấu hình của IDE. |
| `target/` | Thư mục Maven tự sinh khi biên dịch. Xóa đi không sao. |
| `du-lieu-tai-len/` | Ảnh đại diện người dùng tải lên khi chạy trên máy. |

### `src/main/resources/`

| File | Vai trò |
|---|---|
| `application.properties` | Cấu hình backend: cổng 8080, đọc `.env` ở thư mục gốc, kết nối MySQL (tự tạo CSDL nếu chưa có), bật strict mode của MySQL, tắt Hibernate tự sửa bảng, múi giờ Việt Nam, thư mục ảnh tải lên, giới hạn file 3MB. |
| `db/migration/V1__tao_bang.sql` | Tạo toàn bộ 51 bảng, 11 view thống kê, chú thích và dữ liệu danh mục ban đầu (vai trò, quyền…). |
| `db/demo/V2__du_lieu_thu.sql` | Dữ liệu mẫu: tài khoản, bệnh nhân, lịch hẹn, hồ sơ khám… Chỉ nạp khi `DU_LIEU_THU=1`. Mật khẩu mọi tài khoản thử: `Phongkham123`. |
| `db/migration/V3__trigger.sql` | 18 trigger chặn sai nghiệp vụ ngay trong CSDL, ví dụ không cho sửa hồ sơ đã hoàn tất, không cho chuyển trạng thái lượt khám sai thứ tự. |
| `db/migration/V4__quyen_giam_sat.sql` | Thêm 2 quyền giám sát chỉ xem cho quản trị viên: `LICH_HEN.XEM`, `KHAM.XEM`. |
| `db/migration/V5__quyen_hoan_tien.sql` | Thêm 2 quyền hoàn tiền cho phần thanh toán. Hai quyền này đã có nhưng chức năng chưa làm. |

Flyway tự chạy các file này theo thứ tự V1 → V5 mỗi khi backend khởi động. File nào đã chạy rồi thì không chạy lại. Muốn đổi cấu trúc CSDL thì thêm file mới (V6, V7…), không sửa file đã chạy.

### `src/main/java/vn/vietbac/phongkham/`

Mã Java chia thành 6 gói. `PhongkhamApplication.java` là điểm khởi động (hàm `main`) của toàn bộ backend.

#### `api/` – Controller: nhận yêu cầu HTTP từ web

Mỗi controller chỉ nhận dữ liệu, kiểm tra quyền bằng `@CanQuyen`, rồi gọi service tương ứng.

| File | Phụ trách |
|---|---|
| `XacThucController` | Đăng ký, xác thực email OTP, đăng nhập/đăng xuất, đổi/quên mật khẩu, hộp thư giả lập. |
| `HoSoController` | Hồ sơ cá nhân của người đang đăng nhập, đổi ảnh đại diện. |
| `DatLichController` | Tra lịch trống, bệnh nhân đặt/hủy/đổi lịch, danh sách chờ. |
| `LeTanController` | Lễ tân duyệt/từ chối/hủy lịch, đặt lịch hộ, tạo hồ sơ bệnh nhân, check-in, kiểm tra thẻ BHYT, đánh dấu vắng mặt. |
| `KhamBenhController` | Hàng chờ khám, hồ sơ bệnh án, chỉ định cận lâm sàng, kê đơn, hoàn tất, ghi chú; bệnh nhân xem hồ sơ sức khỏe. |
| `BacSiThongBaoController` | Lịch khám trong ngày của bác sĩ và chuông thông báo. |
| `LichLamViecController` | Ca làm việc, đăng ký ca/duyệt ca, khóa/mở khung giờ. |
| `DanhMucController` | 6 danh mục và sơ đồ mặt bằng (tầng, điểm, đoạn đường, chỉ đường). |
| `QuanLyTaiKhoanController` | Quản lý tài khoản, phân quyền, nhật ký. |

#### `dichvu/` – Service: nơi chứa luật nghiệp vụ

| File | Phụ trách |
|---|---|
| `XacThucService` | Đăng ký, OTP, đăng nhập, khóa 15 phút sau 5 lần sai (BR15), tạo/thu hồi phiên. |
| `HoSoService` | Xem và sửa hồ sơ cá nhân. Không cho sửa email/SĐT vì đó là tên đăng nhập. |
| `DatLichService` | Đặt/duyệt/hủy/đổi lịch, không cho đặt trùng giờ (BR01), đổi lịch tối đa 2 lần, danh sách chờ giữ chỗ 15 phút. |
| `TiepDonService` | Hồ sơ bệnh nhân tại quầy, thẻ BHYT (BR08), check-in, vắng mặt, tính thời gian chờ dự kiến. |
| `KhamBenhService` | Gọi khám, ghi hồ sơ, chỉ định CLS, kê đơn, hoàn tất (sau đó khóa sửa, BR06). Mỗi lần đọc/ghi hồ sơ đều được ghi nhật ký. |
| `LichLamViecService` | Tạo ca, sinh khung giờ khám, duyệt đăng ký ca, đổi phòng, hủy ca. |
| `DanhMucService` | Thêm/sửa/ngừng các danh mục. Mục đã dùng thì chỉ chuyển sang "ngừng", không xóa. |
| `MatBangService` | Sơ đồ tầng và chỉ đường bằng thuật toán Dijkstra: đi bộ 1 m/giây, cầu thang 30 giây/tầng, thang máy 60 giây (BR22). |
| `QuanLyTaiKhoanService` | Tạo tài khoản nhân viên, khóa/mở, cấp lại mật khẩu, đổi vai trò, phân quyền. |
| `ThongBaoService` | Tạo thông báo và xếp hàng chờ gửi. Hiện chưa gửi thật qua email/SMS. |
| `NhatKyService` | Ghi nhật ký thao tác trong cùng giao dịch với nghiệp vụ, nên nghiệp vụ lỗi thì nhật ký cũng không được ghi. |
| `TacVuDinhKy` | Việc tự chạy mỗi phút: hủy giữ chỗ đã hết hạn, tự đánh dấu vắng mặt nếu quá giờ, nhắc lịch, cập nhật giờ chờ. |

#### `kho/` – Repository: truy vấn CSDL

Có 14 file. Mỗi file ứng với một bảng, ví dụ `TaiKhoanRepository`, `LuotKhamRepository`, `KhungGioRepository`. Spring Data JPA tự sinh câu SQL từ tên hàm. Một số hàm có khóa dòng để tránh hai người đặt cùng một khung giờ.

#### `thucthe/` – Entity: mỗi class ứng với một bảng

| File | Bảng / ý nghĩa |
|---|---|
| `TaiKhoan`, `PhienDangNhap`, `MaOtp` | Tài khoản đăng nhập, phiên (chỉ lưu mã băm SHA-256 của token), mã OTP hạn 5 phút. |
| `VaiTro`, `Quyen` | 7 vai trò và các quyền dạng `NHOM.HANH_DONG`. |
| `NhanVien`, `BenhNhan`, `TheBhyt` | Hồ sơ nhân viên, bệnh nhân, thẻ bảo hiểm. |
| `KhungGio`, `LuotKham`, `DangKyCho` | Khung giờ khám, lượt khám, danh sách chờ. |
| `ThongBao`, `GuiThongBao`, `NhatKyThaoTac` | Thông báo, hàng đợi gửi, nhật ký. |

Lượt khám đi qua các trạng thái theo thứ tự: `CHO_XAC_NHAN` → `DA_XAC_NHAN` → `DA_CHECK_IN` → `DANG_KHAM` → `CHO_CLS` → `DA_CO_KET_QUA` → `HOAN_THANH`. Lượt khám cũng có thể kết thúc ở `DA_HUY` hoặc `VANG_MAT`.

Chỉ có 14 entity cho 51 bảng. Các bảng còn lại được đọc bằng SQL viết tay trong `chung/TruyVan.java`.

#### `xacthuc/` – Kiểm tra đăng nhập và quyền

| File | Vai trò |
|---|---|
| `CanQuyen` | Annotation đặt trên endpoint để khai báo quyền cần có, ví dụ `@CanQuyen("LICH_HEN.DUYET")`. |
| `XacThucInterceptor` | Chạy trước mọi yêu cầu: đọc token `Bearer`. Sai hoặc hết hạn → trả lỗi 401; thiếu quyền hoặc còn dùng mật khẩu tạm → trả lỗi 403. |
| `NguoiDung` | Thông tin người đang đăng nhập (vai trò, quyền), được truyền vào controller. |
| `CauHinhWeb` | Đăng ký interceptor và phục vụ ảnh tải lên tại `/api/tep/**`. |

#### `chung/` – Tiện ích dùng chung

| File | Vai trò |
|---|---|
| `MatKhau` | Băm mật khẩu bằng PBKDF2-SHA256. |
| `ChuanHoa` | Chuẩn hóa và kiểm tra email, SĐT, mật khẩu (ít nhất 8 ký tự, có cả chữ và số). |
| `TruyVan` | Chạy SQL viết tay cho các màn hình cần ghép nhiều bảng. |
| `LuuAnh` | Lưu ảnh tải lên. Kiểm tra đúng là ảnh JPEG/PNG/WEBP bằng nội dung file, không tin vào đuôi file. |
| `DongHo` | Một nguồn thời gian chung, làm tròn tới giây. |
| `CauHinhFlyway` | Chèn file dữ liệu thử V2 vào giữa V1 và V3 khi `DU_LIEU_THU=1`. |
| `XuLyLoi` | Đổi mọi lỗi thành JSON dạng `{"detail": "..."}` để web hiển thị. |
| `LoiNghiepVu` / `LoiXacThuc` / `LoiQuyen` / `KhongTimThay` | 4 loại lỗi, tương ứng mã HTTP 400 / 401 / 403 / 404. |

### `src/test/`

`PhongkhamApplicationTests.java` là bài test mặc định của Spring, chỉ kiểm tra ứng dụng khởi động được. Hiện chưa có test nghiệp vụ nào.

---

## 3. `web/` – Giao diện React

### File ở gốc `web/`

| File | Vai trò |
|---|---|
| `package.json` / `package-lock.json` | Danh sách thư viện (React 19, Ant Design 6, React Router 7, dayjs) và lệnh `dev`, `build`. File lock giữ đúng phiên bản đã cài. |
| `index.html` | Trang HTML gốc. React gắn toàn bộ giao diện vào đây. |
| `vite.config.ts` | Cấu hình Vite: khi phát triển, chuyển mọi lời gọi `/api` sang backend cổng 8080; dùng alias `@` thay cho `src/`. |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | Cấu hình TypeScript: `app` cho mã giao diện, `node` cho file cấu hình Vite. |
| `nginx.conf` | Dùng khi chạy Docker: Nginx phục vụ giao diện đã build, chuyển `/api` sang backend, mọi đường dẫn khác trả về `index.html` để React Router xử lý. |
| `Dockerfile`, `.dockerignore` | Build giao diện bằng Node, sau đó chép sang image Nginx. |
| `xem-thu.html` | Công cụ khi phát triển: xem cùng lúc bản máy tính và bản điện thoại cạnh nhau. |

### `src/`

| File | Vai trò |
|---|---|
| `main.tsx` | Điểm khởi động: gắn React, theme Ant Design, router, phiên đăng nhập. |
| `App.tsx` | Bảng định tuyến: đường dẫn nào mở trang nào, cần quyền gì. Mỗi trang chỉ tải khi được mở tới. |

#### `lib/` – Phần lõi

| File | Vai trò |
|---|---|
| `api.ts` | Mọi lời gọi tới backend nằm ở đây, kèm kiểu dữ liệu TypeScript. Token lưu trong localStorage và gửi qua header `Authorization`. |
| `auth.tsx` | Quản lý phiên đăng nhập. `CanDangNhap` chặn trang khi chưa đăng nhập hoặc thiếu quyền, đồng thời buộc đổi mật khẩu tạm; `ChiKhach` dành cho trang chỉ khách chưa đăng nhập được vào. |
| `hangSo.ts` | Hằng số và quy tắc kiểm tra trùng với backend, để báo lỗi sớm ngay trên form. |
| `anh.ts` | Đường dẫn ảnh minh họa. Hiện đang dùng tạm ảnh Unsplash nên cần mạng. |

#### `layouts/` – Khung trang

| File | Vai trò |
|---|---|
| `AppLayout.tsx` | Khung sau khi đăng nhập: thanh bên tối với menu theo quyền, số đếm việc chờ xử lý, chuông thông báo. Quyền được làm mới mỗi phút. |
| `AuthLayout.tsx` | Khung cho các trang đăng nhập/đăng ký: nửa trái là ảnh giới thiệu, nửa phải là form. |
| `Logo.tsx` | Logo phòng khám. |

#### `components/` – Thành phần dùng lại

| File | Vai trò |
|---|---|
| `BangThichUng.tsx` | Hiện dạng bảng trên máy tính, tự đổi thành danh sách thẻ trên điện thoại. |
| `ChonKhungGio.tsx` | Chọn ngày và khung giờ khám, dùng chung cho bệnh nhân và lễ tân. |
| `ChuongThongBao.tsx` | Chuông thông báo, tự cập nhật mỗi 30 giây. Bấm vào thông báo thì mở trang liên quan. |
| `XemLanKham.tsx` | Hiển thị một lần khám đã hoàn tất: sinh hiệu, chẩn đoán, đơn thuốc, kết quả CLS (đánh dấu chỉ số bất thường). |
| `HopThuThu.tsx` | Hộp thư giả lập để xem mã OTP khi `CHE_DO_THU=1`. |
| `OtpSo.tsx` | Ô nhập OTP chỉ nhận số. Điện thoại sẽ bật bàn phím số. |
| `AnhDaiDien.tsx` | Ảnh đại diện tròn. Chưa có ảnh thì hiện 2 chữ cái đầu của họ tên. |
| `BannerAnh.tsx` | Banner ảnh ở trang chủ, tự chuyển sau mỗi 5 giây. |

#### `hooks/`

| File | Vai trò |
|---|---|
| `manHinh.ts` | Nhận biết đang ở màn hình nhỏ (dưới 992px). |
| `useDemNguoc.ts` | Đếm ngược 60 giây cho nút "Gửi lại mã". |

#### `pages/` – Các trang, chia theo vai trò

| Thư mục | File | Vai trò |
|---|---|---|
| (gốc) | `TrangChu.tsx` | Trang chủ, nội dung theo vai trò. |
| (gốc) | `HoSo.tsx` | Hồ sơ cá nhân cho mọi vai trò. |
| `xac-thuc/` | `DangNhap.tsx` | Đăng nhập bằng email hoặc SĐT. |
| | `DangKy.tsx` | Bệnh nhân tự đăng ký tài khoản. |
| | `XacThucEmail.tsx` | Nhập mã OTP 6 số để kích hoạt tài khoản. |
| | `QuenMatKhau.tsx` | Khôi phục mật khẩu bằng OTP. |
| | `DoiMatKhau.tsx` | Đổi mật khẩu. Nhân viên dùng mật khẩu tạm bị buộc đổi ở đây. |
| `benh-nhan/` | `DatLich.tsx` | Đặt lịch 4 bước: chuyên khoa, bác sĩ, ngày giờ, xác nhận. |
| | `LichHenCuaToi.tsx` | Xem, hủy, đổi lịch; danh sách chờ. |
| | `HoSoSucKhoe.tsx` | Xem lại các lần khám đã hoàn tất. |
| `le-tan/` | `QuanLyLichHen.tsx` | Duyệt, từ chối, hủy, check-in, đánh dấu vắng mặt. Quản trị viên mở ở chế độ chỉ xem. |
| | `DatLichHo.tsx` | Đặt lịch hộ khách vãng lai, gọi điện hoặc nhắn tin; tìm hoặc tạo hồ sơ bệnh nhân. |
| `bac-si/` | `LichKham.tsx` | Lịch hẹn trong ngày của bác sĩ. |
| | `KhamBenh.tsx` | Màn hình khám chính: sinh hiệu, chẩn đoán ICD-10, kê đơn, chỉ định CLS, hoàn tất. |
| `lich-lam-viec/` | `LichLamViec.tsx` | Lịch làm việc theo tuần. |
| | `TaoCaLamViec.tsx` | Quản trị viên xếp ca theo khoảng ngày. |
| | `ChiTietCaLamViec.tsx` | Chi tiết một ca: khung giờ, khóa/mở, đổi phòng, hủy ca. |
| | `DangKyCa.tsx` | Bác sĩ đăng ký thêm ca. |
| | `DuyetDangKyCa.tsx` | Quản trị viên duyệt hoặc từ chối đăng ký ca. |
| `quan-tri/` | `QuanLyTaiKhoan.tsx` | Danh sách tài khoản, tạo nhân viên, khóa/mở, cấp lại mật khẩu, đổi vai trò. |
| | `ChiTietTaiKhoan.tsx` | Sửa hồ sơ nhân viên, thu hồi phiên, lịch sử thao tác. |
| | `PhanQuyen.tsx` | Bảng quyền theo vai trò và bớt quyền từng tài khoản. |
| | `NhatKy.tsx` | Nhật ký thao tác và nhật ký truy cập hồ sơ, xuất CSV. |
| | `MatBang.tsx` | Vẽ sơ đồ mặt bằng: kéo thả điểm, nối đường, thử chỉ đường. |
| | `DanhMuc.tsx` | Khung chứa 6 tab danh mục. |
| `quan-tri/danh-muc/` | `ChuyenKhoaTab.tsx` | Chuyên khoa. Thêm chuyên khoa thì tự tạo dịch vụ khám kèm giá. |
| | `PhongTab.tsx` | Phòng khám và phòng cận lâm sàng. |
| | `DichVuTab.tsx` | Dịch vụ, giá, giá BHYT, dịch vụ phải làm trước, mẫu chỉ số xét nghiệm. |
| | `ThuocTab.tsx` | Danh mục thuốc. |
| | `IcdTab.tsx` | Mã bệnh ICD-10. |
| | `ThongTinTab.tsx` | Thông tin phòng khám, tài khoản ngân hàng cho VietQR. |
| | `chung.tsx` | Thành phần dùng chung cho các tab: ô nhập tiền, công tắc ngừng/mở lại. |

#### `styles/`

| File | Vai trò |
|---|---|
| `theme.ts` | Bảng màu chung cho Ant Design. |
| `index.css` | CSS bổ sung, chủ yếu để giao diện co giãn theo màn hình điện thoại. |

---

## 4. `docs/`

| File | Vai trò |
|---|---|
| `README.md` | Ghi chú rằng thư mục này dành cho tài liệu đồ án: use case, ERD, sơ đồ tuần tự. |
| `giai-thich-cau-truc.md` | Tài liệu này. |
| `anh-giao-dien/` | 16 ảnh chụp màn hình các trang chính, dùng trong báo cáo tiến độ. |

---

## 5. Ví dụ: một thao tác đi qua những file nào

Lấy ví dụ lễ tân bấm **Duyệt** một lịch hẹn:

1. `web/src/pages/le-tan/QuanLyLichHen.tsx` gọi một hàm trong `web/src/lib/api.ts`. Hàm này gửi `POST /api/le-tan/lich-hen/{maLK}/duyet`.
2. Vite (khi phát triển) hoặc Nginx (khi chạy Docker) chuyển yêu cầu sang backend cổng 8080.
3. `xacthuc/XacThucInterceptor` kiểm tra token và quyền `LICH_HEN.DUYET`.
4. `api/LeTanController` nhận yêu cầu và gọi `dichvu/DatLichService`.
5. Service kiểm tra luật nghiệp vụ, đổi trạng thái lượt khám qua `kho/LuotKhamRepository`, rồi gọi `NhatKyService` ghi nhật ký và `ThongBaoService` tạo thông báo cho bệnh nhân.
6. MySQL lưu dữ liệu. Trigger trong `V3__trigger.sql` kiểm tra thêm một lần nữa rằng việc chuyển trạng thái là hợp lệ.

---

## 6. Lưu ý

- **Các file SQL tạo CSDL không có trong git.** `.gitignore` đang loại `backend/src/main/resources/db/` và `*.sql`. Ai clone repo về sẽ không chạy được backend, kể cả bằng Docker. Muốn nộp mã nguồn hoặc cho người khác chạy thì cần bỏ 2 dòng đó khỏi `.gitignore`.
- **Cổng web không thống nhất.** `chay_phongkham.bat` chạy web ở cổng 5174, còn README ghi 5173. Cách nào cũng chạy được, chỉ cần mở đúng cổng.
- **Chưa có test nghiệp vụ.** Chỉ có bài test kiểm tra ứng dụng khởi động được.
