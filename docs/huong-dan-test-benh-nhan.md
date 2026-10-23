# Hướng dẫn kiểm thử chức năng bệnh nhân

Hệ thống quản lý phòng khám đa khoa Việt Bắc. Cập nhật ngày 23/10/2026.

Tài liệu này liệt kê 54 trường hợp kiểm thử (test case) cho tác nhân **Bệnh nhân**, chia theo 9 nhóm chức năng. Mỗi test case ghi thao tác cần làm và kết quả mong đợi. Cột **Đạt** để người test đánh dấu Đạt / Không đạt khi chạy.

## 1. Chuẩn bị

### Môi trường

- Chạy hệ thống bằng `chay_phongkham.bat` (web ở http://localhost:5174) hoặc Docker (http://localhost).
- Trong file `.env` cần có `DU_LIEU_THU=1` để có dữ liệu mẫu và `CHE_DO_THU=1` để bật **hộp thư giả lập**. Hệ thống chưa gửi email thật, nên mã OTP chỉ xem được trong hộp thư giả lập (nút hộp thư hiện trên các trang đăng ký, xác thực, quên mật khẩu).
- Mật khẩu chung của mọi tài khoản thử: `Phongkham123`.
- Nên mở thêm một cửa sổ ẩn danh đăng nhập tài khoản lễ tân `lan.nt@vietbac.vn` để duyệt lịch, hủy lịch khi cần cho test case.

### Tài khoản bệnh nhân dùng để test

| Tài khoản | Tình trạng | Dùng cho |
|---|---|---|
| `an.hv@gmail.com` / `0912345678` | Có lịch hẹn và hồ sơ khám đã hoàn tất (10/10/2026) | Đăng nhập, hồ sơ sức khỏe, thông báo |
| `uyen.pt@gmail.com` | Chưa có lịch hẹn nào | Đặt lịch, hủy, đổi lịch, danh sách chờ |
| `son.nv@gmail.com`, `tu.lh@gmail.com` | Bệnh nhân bình thường | Test hai người cùng đặt một khung giờ |
| `vinh.dv@gmail.com` | Bị quản trị viên khóa | Đăng nhập tài khoản bị khóa |
| `lananh.mt@gmail.com` | Đã đăng ký nhưng chưa xác thực email | Đăng nhập tài khoản chưa kích hoạt |
| Hồ sơ **Kiều Văn Yên**, SĐT `0912000021`, sinh 20/01/1955 | Lễ tân tạo qua điện thoại, chưa có tài khoản | Đăng ký gắn vào hồ sơ có sẵn (BR23) |

Khi test xong muốn làm lại từ đầu, tạo lại CSDL theo hướng dẫn trong `README.md` (xóa CSDL `phongkham` rồi khởi động lại backend).

## 2. Đăng ký và xác thực email

| Mã | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|
| TC01 | Trang Đăng nhập → **Đăng ký tài khoản bệnh nhân**. Nhập đủ thông tin hợp lệ với email và SĐT mới, tích đồng ý, bấm Đăng ký. | Chuyển sang trang nhập mã OTP 6 số. | |
| TC02 | Mở hộp thư giả lập, lấy mã OTP, nhập vào trang xác thực. | Tài khoản được kích hoạt, vào được trang chủ bệnh nhân. Chuông có thông báo kích hoạt tài khoản. | |
| TC03 | Đăng ký với SĐT 9 số, email thiếu `@`, CCCD 11 số. | Báo lỗi ngay dưới từng ô, không gửi được form. SĐT phải 10 số bắt đầu bằng 0, CCCD phải 12 số. | |
| TC04 | Mật khẩu `abcdefgh` (không có số), rồi thử `abc123` (dưới 8 ký tự). | Báo "Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số". | |
| TC05 | Ô Nhập lại mật khẩu khác ô Mật khẩu. | Báo mật khẩu nhập lại không khớp. | |
| TC06 | Không tích ô đồng ý điều khoản. | Báo "Bạn cần đồng ý để tiếp tục". | |
| TC07 | Đăng ký với email `an.hv@gmail.com` (đã có tài khoản). | Báo email đã được dùng cho tài khoản khác. | |
| TC08 | Ở trang OTP, nhập sai mã 1 lần, rồi sai tiếp tới lần thứ 5. | Lần đầu báo "Mã OTP không đúng, còn 4 lần thử". Sau 5 lần sai, mã bị vô hiệu, phải bấm gửi lại mã. | |
| TC09 | Bấm **Gửi lại mã** ngay sau khi vừa nhận mã. | Nút bị khóa và đếm ngược 60 giây. Hết 60 giây mới gửi lại được, mã cũ không dùng được nữa. | |
| TC10 | Đợi quá 5 phút rồi mới nhập mã OTP. | Báo "Mã OTP đã hết hạn hoặc không tồn tại, vui lòng yêu cầu mã mới". | |
| TC11 | Đăng ký với họ tên **Kiều Văn Yên**, SĐT `0912000021`, ngày sinh 20/01/1955, email mới. Xác thực OTP. | Tài khoản được gắn vào hồ sơ lễ tân đã tạo (BR23). Trang Hồ sơ cá nhân hiện sẵn người liên hệ "Kiều Thị Lan (con)". | |

## 3. Đăng nhập và đăng xuất

| Mã | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|
| TC12 | Đăng nhập bằng email `an.hv@gmail.com`. | Vào trang chủ bệnh nhân, thanh bên chỉ có Trang chủ, Đặt lịch khám, Lịch hẹn của tôi, Hồ sơ sức khỏe. | |
| TC13 | Đăng xuất, đăng nhập lại bằng SĐT `0912345678`. | Đăng nhập thành công như TC12. | |
| TC14 | Nhập đúng email, sai mật khẩu. | Báo "Email/số điện thoại hoặc mật khẩu không đúng". Không cho biết email có tồn tại hay không. | |
| TC15 | Dùng `uyen.pt@gmail.com`, nhập sai mật khẩu 5 lần liên tiếp. | Lần thứ 5 tài khoản bị tạm khóa 15 phút, báo "Tài khoản tạm khóa đến ...". Trong 15 phút nhập đúng mật khẩu cũng không vào được. | |
| TC16 | Đăng nhập `vinh.dv@gmail.com`. | Báo "Tài khoản đã bị khóa". | |
| TC17 | Đăng nhập `lananh.mt@gmail.com` (chưa xác thực email). | Được chuyển sang bước nhập OTP để xác thực email. | |
| TC18 | Đang đăng nhập bệnh nhân, gõ thẳng địa chỉ `/le-tan/lich-hen` hoặc `/quan-ly/tai-khoan`. | Không vào được trang của nhân viên. | |
| TC19 | Bấm vào tên ở góc dưới thanh bên → Đăng xuất. Bấm nút Back của trình duyệt. | Về trang đăng nhập. Back không mở lại được trang bên trong. | |

## 4. Quên mật khẩu và đổi mật khẩu

| Mã | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|
| TC20 | Trang Đăng nhập → **Quên mật khẩu**, nhập email `uyen.pt@gmail.com`, lấy OTP trong hộp thư giả lập, đặt mật khẩu mới. | Đặt lại thành công. Đăng nhập được bằng mật khẩu mới, mật khẩu cũ không còn dùng được. Nếu tài khoản đang bị tạm khóa ở TC15 thì được gỡ khóa. | |
| TC21 | Quên mật khẩu với một email không tồn tại. | Vẫn hiện thông báo chung "Nếu tài khoản tồn tại, mã OTP đã được gửi tới email", không tiết lộ email có tồn tại hay không. | |
| TC22 | Đang đăng nhập → Đổi mật khẩu, nhập sai mật khẩu hiện tại. | Báo "Mật khẩu hiện tại không đúng". | |
| TC23 | Đổi mật khẩu với mật khẩu mới giống mật khẩu hiện tại. | Báo "Mật khẩu mới phải khác mật khẩu hiện tại". | |
| TC24 | Đổi mật khẩu hợp lệ. | Đổi thành công, chuông có thông báo "Mật khẩu đã thay đổi". | |

## 5. Hồ sơ cá nhân

| Mã | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|
| TC25 | Bấm tên ở góc dưới → Hồ sơ cá nhân. Sửa họ tên, địa chỉ, người liên hệ, SĐT người liên hệ. Lưu, rồi tải lại trang (F5). | Lưu thành công, sau khi tải lại vẫn giữ thông tin mới. Email và SĐT đăng nhập không sửa được. | |
| TC26 | Nhập CCCD `048088015678` (đã thuộc bệnh nhân Nguyễn Văn Sơn). | Báo "Số CCCD đã thuộc hồ sơ khác, vui lòng liên hệ lễ tân". | |
| TC27 | Đổi ảnh đại diện bằng ảnh JPG hoặc PNG dưới 2 MB. | Ảnh mới hiện ở trang hồ sơ và ở góc thanh bên. | |
| TC28 | Tải lên ảnh trên 2 MB, rồi thử một file PDF đổi đuôi thành `.jpg`. | Lần lượt báo "Ảnh tối đa 2 MB" và "Chỉ nhận ảnh JPG, PNG hoặc WEBP". | |

## 6. Đặt lịch khám

Dùng tài khoản `uyen.pt@gmail.com`.

| Mã | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|
| TC29 | Đặt lịch khám → chọn chuyên khoa → chọn bác sĩ → chọn ngày và khung giờ → nhập lý do khám → Xác nhận. | Báo "Đặt lịch thành công". Lịch ở trạng thái **Chờ xác nhận** trong Lịch hẹn của tôi. Chuông có thông báo đặt lịch. Lễ tân thấy lịch trong mục Chờ xác nhận. | |
| TC30 | Ở bước 2 chọn **Bác sĩ bất kỳ**. | Bước 3 hiện khung giờ của tất cả bác sĩ trong chuyên khoa, mỗi khung ghi tên bác sĩ. | |
| TC31 | Ở bước 3 chọn ngày hôm nay. | Chỉ hiện các khung giờ **chưa bắt đầu**. Ví dụ lúc 14:57 vẫn đặt được khung 15:00, còn khung 14:45 không hiện. | |
| TC32 | Xem lịch chọn ngày. | Ngày đã qua và ngày quá 30 ngày tới bị mờ, không chọn được. Số nhỏ dưới mỗi ngày là số khung còn trống. | |
| TC33 | Chọn một ngày đã kín lịch. Để tạo ngày kín: lễ tân đặt hộ hết các khung của một bác sĩ trong một ngày, rồi bệnh nhân chọn đúng bác sĩ đó. | Ô ngày hiện chữ **Kín** màu đỏ. Bên phải báo "Ngày này đã kín lịch" kèm nút **Đăng ký danh sách chờ**. | |
| TC34 | Đặt liên tiếp đủ 3 lịch (khác ngày hoặc khác bác sĩ), rồi đặt lịch thứ 4. | Lịch thứ 4 bị chặn: "Mỗi bệnh nhân có tối đa 3 lịch hẹn chưa hoàn thành" (BR03). | |
| TC35 | Đặt hai lịch cùng giờ, cùng ngày với hai bác sĩ khác nhau. | Lịch thứ hai bị chặn: "Bệnh nhân đã có lịch hẹn khác trùng thời điểm". | |
| TC36 | Đặt hai lịch với cùng một bác sĩ trong cùng một ngày, khác giờ. | Lịch thứ hai bị chặn: "Bệnh nhân đã có lịch hẹn với bác sĩ này trong ngày". | |
| TC37 | Mở hai trình duyệt, đăng nhập `son.nv` và `tu.lh`. Cả hai chọn cùng một khung giờ của cùng bác sĩ, rồi lần lượt bấm Xác nhận. | Người bấm trước đặt được. Người bấm sau nhận báo khung giờ không còn trống và được đưa về bước chọn giờ (BR01). | |

## 7. Lịch hẹn của tôi: hủy và đổi lịch

| Mã | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|
| TC38 | Mở Lịch hẹn của tôi, xem 3 tab Sắp tới, Danh sách chờ, Lịch sử. | Lịch vừa đặt nằm ở Sắp tới, có giờ, bác sĩ, phòng, mã lịch hẹn, trạng thái. Lịch đã khám hoặc đã hủy nằm ở Lịch sử. | |
| TC39 | Hủy một lịch còn cách giờ khám hơn 4 giờ. Thử bấm hủy mà bỏ trống lý do, sau đó nhập lý do và hủy. | Bỏ trống lý do thì bị yêu cầu nhập. Có lý do thì lịch chuyển sang **Đã hủy**, khung giờ được trả lại để người khác đặt. | |
| TC40 | Đổi một lịch sang khung giờ khác, làm 2 lần, rồi đổi lần thứ 3. | Hai lần đầu đổi được, lịch quay về Chờ xác nhận. Lần thứ 3 bị chặn: "Mỗi lịch hẹn chỉ được đổi tối đa 2 lần" (BR04). | |
| TC41 | Đặt một khung giờ còn chưa tới 4 giờ là đến giờ khám (ví dụ hôm nay, khung gần nhất). Ngay sau khi đặt, vào Lịch hẹn của tôi. | Nút **Hủy lịch** bấm được, di chuột vào hiện "Lịch vừa đặt: được hủy đến HH:mm". Nút **Đổi lịch** bị khóa. Hủy thành công. | |
| TC41b | Lặp lại TC41 nhưng đợi quá 15 phút sau khi đặt (khung giờ vẫn chưa bắt đầu) rồi thử hủy hoặc đổi. | Cả hai nút bị khóa, ghi "Chỉ được hủy/đổi trước giờ khám ít nhất 4 giờ" (BR04). | |

## 8. Danh sách chờ

Cần một ngày đã kín lịch như ở TC33.

| Mã | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|
| TC42 | Ở ngày kín, bấm **Đăng ký danh sách chờ**, chọn buổi, nhập lý do. | Đăng ký thành công, hiện trong tab Danh sách chờ với vị trí trong hàng. | |
| TC43 | Dùng một tài khoản chưa đăng ký chờ. Mở sẵn nút Đăng ký danh sách chờ của ngày kín. Trong lúc đó lễ tân hủy một lịch của ngày này. Quay lại bấm đăng ký chờ. | Báo "Ngày này vẫn còn khung giờ trống, vui lòng đặt lịch trực tiếp". Trường hợp này chỉ xảy ra khi chưa ai đứng trong danh sách chờ, vì nếu có thì khung vừa trống sẽ được giữ cho người đó. | |
| TC44 | Đăng ký chờ lần thứ 3 khi đang có 2 đăng ký còn hiệu lực. | Báo "Mỗi bệnh nhân có tối đa 2 đăng ký chờ còn hiệu lực" (BR21). | |
| TC45 | Người đang có lịch trong ngày kín hủy lịch đó (hoặc lễ tân hủy thay). | Người đứng đầu danh sách chờ nhận thông báo "Có khung giờ trống cho bạn", khung giờ được giữ 15 phút. Tab Danh sách chờ hiện thông báo khung đang được giữ. | |
| TC46 | Trong 15 phút, bấm **Nhận** khung giờ được giữ. | Tạo lịch hẹn Chờ xác nhận, đăng ký chờ chuyển sang đã nhận. | |
| TC47 | Lặp lại TC45 nhưng để quá 15 phút không nhận. | Hết hạn giữ chỗ, khung giờ được chuyển cho người kế tiếp trong hàng (hoặc trả về trống nếu không còn ai). | |
| TC48 | Hủy một đăng ký chờ đang chờ. | Đăng ký biến khỏi danh sách đang chờ. | |

## 9. Hồ sơ sức khỏe và thông báo

| Mã | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|
| TC49 | Đăng nhập `an.hv@gmail.com` → Hồ sơ sức khỏe. | Hiện lần khám 10/10/2026: chẩn đoán Viêm phế quản cấp (J20.9), bác sĩ Trần Văn Minh, có đơn thuốc, 2 kết quả cận lâm sàng, hẹn tái khám 17/10/2026. | |
| TC50 | Bấm **Xem chi tiết** lần khám đó. | Hiện sinh hiệu, triệu chứng, chẩn đoán, lời dặn, đơn thuốc (tên thuốc, số lượng, cách dùng), kết quả xét nghiệm có đánh dấu chỉ số cao hoặc thấp. | |
| TC51 | Đăng nhập `uyen.pt@gmail.com` → Hồ sơ sức khỏe. | Danh sách trống vì chưa có lần khám hoàn tất. Không thấy hồ sơ của bệnh nhân khác. | |
| TC52 | Sau TC29, dùng tài khoản lễ tân duyệt lịch vừa đặt. Quay lại tài khoản bệnh nhân, chờ tối đa 30 giây. | Chuông tăng số, có thông báo "Lịch hẹn đã được xác nhận". Bấm vào thông báo mở đúng lịch hẹn. Trạng thái lịch chuyển sang Đã xác nhận. | |
| TC53 | Bấm **Đánh dấu đã đọc hết** trong chuông. | Số trên chuông về 0. | |

## 10. Giao diện điện thoại

| Mã | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|
| TC54 | Mở web trên điện thoại, hoặc bấm F12 → biểu tượng điện thoại để thu nhỏ màn hình. Đi lại các trang đăng nhập, đặt lịch, lịch hẹn, hồ sơ sức khỏe. | Thanh bên thu thành nút menu. Bảng đổi thành dạng thẻ. Không có thanh cuộn ngang. Ô nhập OTP bật bàn phím số. | |

## 11. Ghi nhận lỗi

Khi một test case không đạt, ghi lại các thông tin sau để dễ tìm lỗi:

- Mã test case và tài khoản đang dùng.
- Các bước đã làm và thời điểm làm (vì nhiều quy tắc phụ thuộc giờ hiện tại).
- Kết quả thực tế: chụp màn hình thông báo lỗi.
- Nếu có: bấm F12 → tab Console và tab Network, chụp lỗi màu đỏ.
