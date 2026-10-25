# Kiểm thử tổng hợp hệ thống

Phòng khám Đa khoa Việt Bắc. Chạy ngày 24/10/2026.

Tài liệu gồm ba phần:
- **Kiểm thử chức năng:** 81 trường hợp chạy tự động qua API, phủ cả 7 vai trò.
- **Kiểm thử trải nghiệm người dùng:** đi qua giao diện như người dùng thật, trên máy tính và điện thoại.
- **Kiểm thử bổ sung:** quy tắc theo thời gian thật (OTP, khóa tài khoản), in biên lai, tự chạy máy chủ.

Cuối tài liệu là danh sách lỗi đã sửa và các điểm đề xuất điều chỉnh.

## Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| Kiểm thử chức năng (API) | **81/81 đạt** trên CSDL tạm; chạy lại trên `phongkham` 24/10: **82/82 đạt** |
| Luồng đầu-cuối: đặt lịch → duyệt → check-in → khám → chỉ định CLS → tạm thu → làm CLS → trả kết quả → hoàn tất → bệnh nhân xem hồ sơ | Đạt |
| Giao diện trên điện thoại (375 px): 25 trang của 5 vai trò (bệnh nhân, lễ tân, bác sĩ, bác sĩ xét nghiệm, quản trị) | Không trang nào tràn ngang. Sơ đồ mặt bằng cuộn ngang trong khung, chấp nhận được |
| OTP, khóa tài khoản theo thời gian thật (mục 5.1) | **9/9 đạt** |
| In biên lai, tự chạy máy chủ (mục 5.2, 5.3) | Đạt sau khi sửa 3 lỗi |
| Docker | Chưa chạy được (máy không cài Docker), đã rà cấu hình |
| Lỗi tìm được | 8, **đã sửa cả 8** (mục 6.1) |
| Đề xuất điều chỉnh thêm | 9 (mục 6.2), đã làm hoặc đính chính 4 |
| Hoàn tiền, hủy hóa đơn, thống kê (mục 7) | Đạt; hồi quy 82/82 |
| Đánh giá sau khám, góp ý – khiếu nại, báo cáo đánh giá (mục 8) | **20/20 đạt** (nhóm 11 của kịch bản, 25/10) |

## 1. Môi trường kiểm thử

Kiểm thử chạy thẳng trên máy chủ **http://localhost:8080**, dữ liệu test **lưu vào CSDL chính `phongkham`**. Mở MySQL Workbench / SQLTools là thấy ngay các dòng test trong bảng. Các mục 3, 4, 5 bên dưới chạy lần đầu trên CSDL tạm `phongkham_test_tam` (đã xóa). Từ ngày 24/10, kịch bản đã chạy lại trên `phongkham`: **82/82 đạt**.

Cách chạy lại:

1. Máy chủ ở cổng 8080 đang chạy (tự chạy khi đăng nhập Windows) và `.env` có `CHE_DO_THU=1` để kịch bản đọc được OTP trong hộp thư giả lập.
2. Chạy trong **giờ làm việc**: kịch bản xếp một bệnh nhân vãng lai vào khung giờ còn trống của hôm nay để khám, thu tiền, làm CLS.
3. `python scripts/kiem_thu_api.py` (mặc định http://127.0.0.1:8080). Kết quả in ra màn hình và ghi vào `ket_qua.json`.
4. Chạy lại bao nhiêu lần cũng được. Mỗi lần tạo một bệnh nhân mới tên **"Nguyễn Kiểm Thử"** (email `kiemthu.<SĐT>@gmail.com`, mật khẩu cuối `MatKhau456`) cùng lượt khám, phiếu CLS, biên lai, kết quả của bệnh nhân đó.
5. Kịch bản cũng thêm vào danh mục: một chuyên khoa "Mắt …" (đã ngừng), một thuốc "Panadol …", một mã ICD `Zxx.x`. Ca làm việc và tài khoản nhân viên test được tạo rồi hủy/xóa trong lúc chạy.
6. Một lần chạy ngày 24/10 lúc 08:35 đã ghi vào `phongkham`:
   - 1 tài khoản, 5 lượt khám (lượt **LH2610240069** đã hoàn thành), 1 hồ sơ bệnh án.
   - 4 phiếu chỉ định, 1 biên lai **BL2610240010**, 4 kết quả CLS, 1 ảnh.
   - 43 thông báo, 31 dòng nhật ký thao tác.

Mật khẩu mọi tài khoản mẫu: `Phongkham123`.

| Vai trò | Tài khoản |
|---|---|
| Quản trị viên | `admin@vietbac.vn` |
| Lễ tân | `lan.nt@vietbac.vn` (`hoa.pt@vietbac.vn`: lễ tân mới, còn mật khẩu tạm) |
| Bác sĩ | `minh.tv@vietbac.vn` (Nội, P101), `mai.nt@vietbac.vn` (Nhi) |
| Bác sĩ xét nghiệm | `ha.lt@vietbac.vn` (P103) |
| Bác sĩ chẩn đoán hình ảnh | `huy.pq@vietbac.vn` (X-quang P104) |
| Bác sĩ nội soi | `tuan.dm@vietbac.vn` (P204) |
| Bệnh nhân | `an.hv@gmail.com`, `uyen.pt@gmail.com`, `son.nv@gmail.com`, `phuong.vt@gmail.com` (`vinh.dv@gmail.com` bị khóa, `lananh.mt@gmail.com` chưa xác thực email) |

## 2. Luồng nghiệp vụ đầu-cuối

Đây là kịch bản chính, nên làm tay một lần trên giao diện trước khi bảo vệ. Các test case KB, TT, CLS ở mục 3 tự động hóa đúng luồng này.

| Bước | Người làm | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| 1 | Bệnh nhân | Đặt lịch khám → chọn chuyên khoa → bác sĩ → ngày giờ → xác nhận | Lịch ở trạng thái **Chờ xác nhận**, lễ tân thấy số chờ duyệt trên menu |
| 2 | Lễ tân | Quản lý lịch hẹn → Duyệt | Lịch **Đã xác nhận**, bệnh nhân nhận thông báo |
| 3 | Lễ tân | Vào ngày khám → Check-in, chọn thẻ BHYT nếu có | Cấp **số thứ tự**, xác định mức hưởng BHYT, bệnh nhân vào hàng chờ bác sĩ |
| 4 | Bác sĩ | Lịch khám → Gọi khám | Mở trang khám, có tóm tắt tiền sử, cảnh báo dị ứng |
| 5 | Bác sĩ | Ghi sinh hiệu, chẩn đoán ICD-10, kê đơn → Lưu tạm | Lưu được; sai định dạng (VD huyết áp `120-80`) bị báo lỗi |
| 6 | Bác sĩ | Chỉ định CLS: đường huyết, công thức máu, X-quang ngực, nội soi dạ dày | Lượt chuyển **Chờ cận lâm sàng**; phiếu có BHYT trả toàn bộ vào thẳng hàng chờ, còn lại chờ thu tiền |
| 7 | Lễ tân | Thu tạm thu CLS → Thu tiền (tiền mặt hoặc chuyển khoản) | Lập **biên lai BLyyMMdd####**, in được; phiếu vào hàng chờ phòng thực hiện |
| 8 | BS xét nghiệm | Hàng chờ CLS → Gọi vào → nhập chỉ số → Trả kết quả | Chỉ số ngoài khoảng tham chiếu được đánh dấu **↑ Cao / ↓ Thấp** |
| 9 | BS nội soi | Gọi phiếu nội soi khi chưa xong đường huyết | Bị chặn: "Cần thực hiện Đường huyết lúc đói trước" (BR18) |
| 10 | BS CĐHA, BS nội soi | Trả kết quả, đính kèm ảnh phim; nội soi bắt buộc tích cam kết đồng ý | Có đủ kết quả: lượt khám **Đã có kết quả**, bệnh nhân lên **đầu hàng chờ** bác sĩ |
| 11 | BS xét nghiệm | Mục Đã trả hôm nay → điều chỉnh một kết quả, ghi lý do | Lên bản 2, giữ bản cũ; bác sĩ điều trị nhận thông báo |
| 12 | Bác sĩ | Gọi đọc kết quả → Hoàn tất khám | Hồ sơ khóa sửa (BR06), chỉ được bổ sung ghi chú; kết quả CLS cũng khóa |
| 13 | Bệnh nhân | Hồ sơ sức khỏe → Xem chi tiết | Thấy chẩn đoán, đơn thuốc, kết quả CLS kèm ảnh |

## 3. Kiểm thử chức năng (tự động, 81 trường hợp)

Mỗi dòng: kịch bản, kết quả thực tế lúc chạy (mã HTTP và thông báo của hệ thống), đạt hay không. Các trường hợp "bị chặn" là kiểm tra quy tắc nghiệp vụ: đạt nghĩa là hệ thống từ chối đúng và báo lý do dễ hiểu.

### 3.1 Xác thực và phân quyền

| Mã | Kịch bản | Kết quả khi chạy | Đạt |
|---|---|---|---|
| XT01 | Đăng nhập email các vai trò | đăng nhập đủ 9 tài khoản mẫu | ✅ |
| XT02 | Đăng nhập bằng số điện thoại | an.hv qua SĐT | ✅ |
| XT03 | Sai mật khẩu báo lỗi chung | 400 Email/số điện thoại hoặc mật khẩu không đúng | ✅ |
| XT04 | Tài khoản bị khóa không đăng nhập được | 400 Tài khoản đã bị khóa: Nhiều lần đặt lịch rồi không đến khám. Vui lòng liên hệ quản trị viên | ✅ |
| XT05 | Tài khoản chưa xác thực email bị yêu cầu OTP | 400 {"detail": "Tài khoản chưa xác thực email. Vui lòng nhập mã OTP đã gửi tới email"} | ✅ |
| XT06 | Không có token gọi API cần đăng nhập → 401 | 401 Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại | ✅ |
| XT07 | Bệnh nhân gọi API lễ tân → 403 | 403 Bạn không có quyền thực hiện chức năng này | ✅ |
| XT08 | Bác sĩ gọi API quản trị tài khoản → 403 | 403 Bạn không có quyền thực hiện chức năng này | ✅ |
| XT09 | Đăng ký bệnh nhân mới + xác thực OTP | xác thực 200, đăng nhập được | ✅ |
| XT10 | Đăng ký trùng email bị chặn | 400 Email đã được dùng cho tài khoản khác | ✅ |
| XT11 | Mật khẩu yếu bị chặn (BR15) | 400 Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số | ✅ |
| XT12 | Quên mật khẩu → OTP → đặt lại → đăng nhập mật khẩu mới | đặt lại 200 {'ok': True} | ✅ |
| XT13 | Đổi mật khẩu, đăng xuất làm token hết hiệu lực | đổi 200, đăng xuất 200, token cũ 401 | ✅ |
| XT14 | Nhân viên mới phải đổi mật khẩu tạm trước khi dùng chức năng | 403 Vui lòng đổi mật khẩu tạm thời trước khi sử dụng hệ thống | ✅ |

### 3.2 Đặt lịch khám (bệnh nhân)

| Mã | Kịch bản | Kết quả khi chạy | Đạt |
|---|---|---|---|
| DL01 | Xem bác sĩ, ngày còn trống, khung giờ theo chuyên khoa | 25 ngày trống; lấy 8 khung ở 8 ngày khác nhau | ✅ |
| DL02 | Đặt lịch → trạng thái Chờ xác nhận, hiện trong Lịch hẹn của tôi | 200 → CHO_XAC_NHAN | ✅ |
| DL03 | Người khác đặt trùng khung giờ bị chặn | 400 Khung giờ không còn trống | ✅ |
| DL04 | Tối đa 3 lịch chưa hoàn thành (BR03) | 2 lịch thêm [200, 200]; lịch thứ 4: 400 Mỗi bệnh nhân có tối đa 3 lịch hẹn chưa hoàn thành | ✅ |
| DL05 | Đổi lịch sang khung giờ khác | 200 {'ok': True} | ✅ |
| DL06 | Hủy lịch (khi chưa duyệt / trong 15 phút) | 200 {'ok': True} | ✅ |
| DL07 | Không cho vào danh sách chờ khi ngày còn khung trống (UC6.8) | 400 Ngày này vẫn còn khung giờ trống, vui lòng đặt lịch trực tiếp | ✅ |

### 3.3 Lễ tân: lịch hẹn, tiếp đón

| Mã | Kịch bản | Kết quả khi chạy | Đạt |
|---|---|---|---|
| LT01 | Danh sách chờ duyệt và đếm trên menu | 10 lịch chờ, menu {'so_luong': 10} | ✅ |
| LT02 | Duyệt lịch hẹn | 200 {'ok': True} | ✅ |
| LT03 | Từ chối lịch phải có lý do | 400 Vui lòng nhập lý do | ✅ |
| LT04 | Tạo hồ sơ bệnh nhân chưa có tài khoản, tìm theo SĐT | 200 {'ma_bn': 23}; tìm thấy 1 | ✅ |
| LT05 | Đặt lịch hộ qua điện thoại → xác nhận ngay (BR23) | 200 → DA_XAC_NHAN | ✅ |
| LT06 | Check-in lịch hôm nay, kiểm tra BHYT, cấp số thứ tự | Võ Thị Phương → STT 2, BHYT KHONG_CO None | ✅ |
| LT07 | Check-in lại lần hai bị chặn | 400 Lịch hẹn chưa được xác nhận hoặc đã chuyển trạng thái | ✅ |
| LT08 | Check-in lịch ngày khác bị chặn | 400 Lịch hẹn vào ngày 02/11/2026, không thể check-in hôm nay | ✅ |

### 3.4 Bác sĩ khám bệnh

| Mã | Kịch bản | Kết quả khi chạy | Đạt |
|---|---|---|---|
| KB01 | Hàng chờ hôm nay có bệnh nhân vừa check-in | 2 người trong hàng chờ | ✅ |
| KB02 | Bác sĩ khác không mở được lượt khám | 403 Bạn không phải bác sĩ điều trị của lượt khám này | ✅ |
| KB03 | Gọi bệnh nhân vào khám | 200 {'ok': True} | ✅ |
| KB04 | Huyết áp sai định dạng bị chặn | 400 Huyết áp ghi dạng tâm thu/tâm trương, VD 120/80 | ✅ |
| KB05 | Lưu tạm hồ sơ, chẩn đoán ICD, kê đơn | 200 {'ok': True} | ✅ |
| KB06 | Chỉ định 4 dịch vụ CLS (XN, X-quang, nội soi) | 200 {'ma_pcd': [17, 18, 19, 20]} | ✅ |
| KB07 | Hoàn tất bị chặn khi còn phiếu CLS chưa có kết quả | 400 Chỉ hoàn tất khi bệnh nhân đang được khám | ✅ |
| KB08 | Gọi lại đọc kết quả rồi hoàn tất khám | gọi lại 200, hoàn tất 200 {'ok': True} | ✅ |
| KB09 | Sửa hồ sơ sau khi hoàn tất bị chặn (BR06) | 400 Chỉ ghi hồ sơ khi bệnh nhân đang được khám | ✅ |
| KB10 | Bổ sung ghi chú sau hoàn tất | 200 | ✅ |
| KB11 | Kết quả CLS không sửa được sau khi hoàn tất | 400 Lượt khám đã hoàn tất, không được điều chỉnh kết quả | ✅ |
| KB12 | Bệnh nhân xem hồ sơ sức khỏe có kết quả CLS và ảnh | 2 lần khám; chi tiết có ảnh: True | ✅ |

### 3.5 Thu tạm thu CLS

| Mã | Kịch bản | Kết quả khi chạy | Đạt |
|---|---|---|---|
| TT01 | Lượt khám xuất hiện trong danh sách chờ thu | 4 phiếu, phải thu 1060000 | ✅ |
| TT02 | Tiền khách đưa thiếu bị chặn | 400 Tiền khách đưa chưa đủ 1.060.000 đ | ✅ |
| TT03 | Thu chuyển khoản → lập biên lai | 200 biên lai BL2610240009 1060000 | ✅ |
| TT04 | Thu lại phiếu đã thu bị chặn | 400 Có phiếu đã được thu, đã hủy hoặc không thuộc lượt khám này, vui lòng tải lại | ✅ |
| TT05 | Biên lai trong ngày và chi tiết để in | 9 biên lai; chi tiết 4 phiếu | ✅ |

### 3.6 Cận lâm sàng

| Mã | Kịch bản | Kết quả khi chạy | Đạt |
|---|---|---|---|
| CLS01 | Hàng chờ phòng xét nghiệm có 2 phiếu vừa thu | phòng P103: 2 phiếu | ✅ |
| CLS02 | Nội soi bị chặn khi chưa làm đường huyết (BR18) | 400 Cần thực hiện Đường huyết lúc đói trước Nội soi dạ dày tá tràng | ✅ |
| CLS03 | Phòng khác không mở được phiếu (BR11) | 403 Phiếu thuộc phòng P104, không phải phòng bạn phụ trách | ✅ |
| CLS04 | Xét nghiệm: bắt đầu và trả kết quả chỉ số | [200, 200, 200, 200] | ✅ |
| CLS05 | Thiếu kết luận CĐHA bị chặn | 400 Vui lòng nhập kết luận | ✅ |
| CLS06 | X-quang: trả kết quả, đính kèm ảnh, chặn tệp giả | kết quả 200, ảnh 200, tệp giả 400 | ✅ |
| CLS07 | Nội soi: bắt buộc cam kết, ghi sinh thiết | bắt đầu 200; thiếu cam kết: 400 Bệnh nhân phải ký cam kết đồng ý trước khi nội soi; trả 200 | ✅ |
| CLS08 | Đủ kết quả → lượt khám về hàng chờ bác sĩ (Đã có kết quả) | DA_CO_KET_QUA | ✅ |
| CLS09 | Điều chỉnh kết quả lưu bản cũ (UC14.7) | 200, bản 2 | ✅ |

### 3.7 Lịch làm việc

| Mã | Kịch bản | Kết quả khi chạy | Đạt |
|---|---|---|---|
| LV01 | Bác sĩ đăng ký ca, quản trị thấy chờ duyệt | 200 {'ma_dk': 9}; quản trị thấy trong danh sách chờ duyệt: True | ✅ |
| LV02 | Duyệt đăng ký → tạo ca và khung giờ | 200 {'ma_ca': 467}; ca 467 | ✅ |
| LV03 | Bác sĩ khóa / mở khung giờ của mình | khóa 200, mở 200 | ✅ |
| LV04 | Hủy ca (bác sĩ nghỉ) | 200 {'so_lich_huy': 0, 'da_xoa': True} | ✅ |

### 3.8 Quản trị tài khoản, phân quyền, nhật ký

| Mã | Kịch bản | Kết quả khi chạy | Đạt |
|---|---|---|---|
| QT01 | Tạo tài khoản nhân viên, cấp mật khẩu tạm | 200, có mật khẩu tạm: True | ✅ |
| QT02 | Khóa / mở khóa tài khoản | khóa 200, mở 200 | ✅ |
| QT03 | Cấp lại mật khẩu | 200 | ✅ |
| QT04 | Xóa tài khoản chưa phát sinh dữ liệu | 200 {'ok': True} | ✅ |
| QT05 | Không xóa được tài khoản đã có dữ liệu nghiệp vụ | 400 Tài khoản đã phát sinh dữ liệu (lịch hẹn, hồ sơ, ca làm việc...) nên không thể xóa. Hãy khóa tài khoản để giữ lịch sử | ✅ |
| QT06 | Bảng phân quyền | 200 | ✅ |
| QT07 | Nhật ký thao tác ghi các thao tác vừa test | 38 dòng | ✅ |
| QT08 | Nhật ký truy cập hồ sơ bệnh án | 34 dòng | ✅ |
| QT09 | Quản trị xem lịch hẹn / lịch khám ở chế độ giám sát | 10 lịch hẹn, 5 lịch khám | ✅ |
| QT10 | Quản trị không thao tác thay lễ tân (duyệt lịch) | 403 Bạn không có quyền thực hiện chức năng này | ✅ |

### 3.9 Danh mục và sơ đồ mặt bằng

| Mã | Kịch bản | Kết quả khi chạy | Đạt |
|---|---|---|---|
| DM01 | Thêm / ngừng chuyên khoa | thêm 200, ngừng 200 | ✅ |
| DM02 | Phí khám âm bị chặn | 400 Phí khám phải là số không âm | ✅ |
| DM03 | Thêm thuốc | 200 {'ma_thuoc': 13} | ✅ |
| DM04 | Giá BHYT lớn hơn giá thuốc bị chặn | 400 Giá BHYT từ 0 đến đơn giá (để trống nếu thuốc ngoài danh mục BHYT) | ✅ |
| DM05 | Thêm mã ICD | 200 {'ok': True} | ✅ |
| DM06 | Xem dịch vụ, mẫu chỉ số | 13 dịch vụ, CBC 5 chỉ số | ✅ |
| DM07 | Chỉ đường từ sảnh tới phòng nội soi (tầng 2) | {"TongGiay": 92, "Diem": [1, 2, 4, 5, 6, 13, 15, 16, 20], "Doan": [1, 3, 7, 11, 13, 16, 19 | ✅ |
| DM08 | Thông tin phòng khám | Phòng khám Đa khoa Việt Bắc | ✅ |

### 3.10 Hồ sơ cá nhân, thông báo

| Mã | Kịch bản | Kết quả khi chạy | Đạt |
|---|---|---|---|
| HS01 | Xem và cập nhật hồ sơ cá nhân | 200 | ✅ |
| HS02 | Đổi ảnh đại diện | 200 | ✅ |
| HS03 | Thông báo của bệnh nhân sau khi lịch được duyệt | 7 thông báo, 7 chưa đọc | ✅ |
| HS04 | Đánh dấu đọc hết | còn 0 | ✅ |

## 4. Kiểm thử trải nghiệm người dùng

Cách làm: đăng nhập từng vai trò trên trình duyệt, làm các việc chính như người dùng thật. Kiểm tra trên **máy tính** và **điện thoại** (375 × 812). Với mỗi trang, đánh giá:
- Nội dung có tràn ngang màn hình không.
- Thông báo lỗi có dễ hiểu không.
- Số thao tác có hợp lý không.
- Người dùng có biết bước tiếp theo không.

### 4.1 Bệnh nhân (điện thoại)

| Mã | Thao tác | Quan sát | Đánh giá |
|---|---|---|---|
| UX01 | Mở trang đăng nhập | Gọn, nút lớn dễ bấm, có ghi chú khóa 15 phút khi sai 5 lần | Tốt |
| UX02 | Đăng nhập, xem trang chủ | Lời chào theo buổi, nút "Đặt lịch ngay" nổi bật | Tốt |
| UX03 | Thanh đầu trang | Nhãn tên CSDL (chế độ thử) chiếm chỗ, logo bị cắt còn "P…" | **Lỗi, đã sửa** (6.1 số 3) |
| UX04 | Đặt lịch bước 1–2 | 4 bước rõ ràng, thanh Quay lại/Tiếp tục dính đáy màn hình, có lựa chọn "Bác sĩ bất kỳ", điểm đánh giá, số năm kinh nghiệm | Tốt |
| UX05 | Đặt lịch bước 3 (lịch) | Mặc định chọn ngày gần nhất còn chỗ, mỗi ngày ghi số khung trống | Tốt |
| UX06 | Bấm nhầm vào Chủ nhật hoặc ngày không có ca | Vẫn chọn được, hiện "Ngày này không có lịch khám" và nút **Đăng ký danh sách chờ** cho ngày không ai làm | **Lỗi, đã sửa** (6.1 số 1) |
| UX07 | Chọn chuyên khoa, bác sĩ, khung giờ | Cả ba đều tự sang bước sau (kiểm tra lại mã `DatLich.tsx`). Lần test đầu ghi nhầm là chưa nhất quán: nút Tiếp tục bấm thêm không có tác dụng vì đã sang bước | Tốt (đã đính chính) |
| UX08 | Bước xác nhận | Tóm tắt đủ bác sĩ, giờ, phòng, phí; có hộp Lưu ý quy định hủy/đổi | Tốt |
| UX09 | Hộp "Lưu ý" và các hộp thông tin/thành công khác | Nền xám đục, trông như ô bị vô hiệu | **Lỗi, đã sửa** (6.1 số 2) |
| UX10 | Hồ sơ sức khỏe → Xem chi tiết lần khám | Mở toàn màn hình. Sinh hiệu, chẩn đoán rõ; chỉ số bất thường tô đỏ "↑ Cao"; ảnh X-quang bấm phóng to được | Tốt |
| UX11 | Bảng đơn thuốc trên điện thoại | Bảng rộng hơn màn hình, phải vuốt ngang để xem cột Cách dùng | Chấp nhận được, đề xuất (6.2 số 8) |
| UX12 | Lịch hẹn của tôi, Hồ sơ cá nhân | Không tràn, trạng thái có màu | Tốt |

### 4.2 Lễ tân (máy tính và điện thoại)

| Mã | Thao tác | Quan sát | Đánh giá |
|---|---|---|---|
| UX13 | Quản lý lịch hẹn → Lịch theo ngày | Lọc theo nhóm (Chờ xác nhận, Chờ đến, Đã đến…), có số đếm; hiện STT, BHYT | Tốt |
| UX14 | Ô chọn ngày | Ghi "thứ bảy, 24/10/2026" (chữ thường), đầu trang ghi "Thứ 7, 24/10/2026" | **Không đồng nhất, đã sửa** (6.1 số 5) |
| UX15 | Bệnh nhân ở trạng thái "Chờ cận lâm sàng" | Phải chuyển sang menu Thu tạm thu CLS mới thu được tiền | Đề xuất (6.2 số 1) |
| UX16 | Thu tạm thu | Tách giá / BHYT / bệnh nhân trả từng phiếu; nhắc nhịn ăn; nút gợi ý mệnh giá; tự tính tiền thừa; ra biên lai và in được | Tốt |
| UX17 | Các trang lễ tân trên điện thoại | Bảng chuyển thành thẻ, không tràn | Tốt |

### 4.3 Bác sĩ, bác sĩ cận lâm sàng

| Mã | Thao tác | Quan sát | Đánh giá |
|---|---|---|---|
| UX18 | Trang khám | Cảnh báo dị ứng đỏ ngay đầu, tóm tắt tiền sử, kết quả CLS hiện ngay trên trang khám, trang tự tải lại khi bệnh nhân đi làm CLS | Tốt |
| UX19 | Mở lượt khám của bác sĩ khác | Báo rõ "Bạn không phải bác sĩ điều trị của lượt khám này" | Tốt |
| UX20 | Bấm thông báo "Bệnh nhân đã có đủ kết quả" | Chỉ mở danh sách lịch khám, phải tự tìm lại bệnh nhân | **Lỗi, đã sửa** (6.1 số 4) |
| UX21 | Hàng chờ CLS | Người đang làm ở đầu, phiếu phải chờ dịch vụ khác có nhãn đỏ và nút Gọi bị khóa, có nút "Gọi người tiếp theo" | Tốt |
| UX22 | Ngăn nhập kết quả | Chỉ số đánh giá Cao/Thấp ngay khi gõ, mẫu mô tả điền sẵn, nội soi có ô cam kết và sinh thiết, xem được các bản cũ | Tốt |

### 4.4 Quản trị viên

| Mã | Thao tác | Quan sát | Đánh giá |
|---|---|---|---|
| UX23 | 8 trang quản trị và giám sát trên điện thoại | Không tràn ngang; sơ đồ mặt bằng (600 px) cuộn ngang trong khung riêng | Chấp nhận được |
| UX24 | Giám sát lịch hẹn | Có nhãn "Chỉ xem", không có nút thao tác thay lễ tân | Tốt |

## 5. Kiểm thử bổ sung: thời gian thật, in, tự chạy

Chạy sáng 24/10/2026 (08:06–08:30). Các quy tắc theo thời gian được **chờ thời gian thật**, không chỉnh giờ trong CSDL.

### 5.1 OTP và khóa tài khoản (BR15)

| Mã | Thao tác | Kết quả khi chạy | Đạt |
|---|---|---|---|
| TG01 | Đăng ký, nhập sai OTP 1 lần | "Mã OTP không đúng, còn 4 lần thử" | ✅ |
| TG02 | Nhập sai OTP đủ 5 lần, sau đó nhập mã đúng | Lần 5: "Nhập sai mã OTP quá 5 lần, vui lòng yêu cầu mã mới"; mã đúng cũng không dùng được nữa | ✅ |
| TG03 | Bấm Gửi lại mã ngay sau khi đăng ký | "Vui lòng chờ 60 giây trước khi yêu cầu mã mới" | ✅ |
| TG04 | Chờ 62 giây rồi gửi lại, nhập mã cũ | Gửi được mã mới; mã cũ bị từ chối | ✅ |
| TG05 | Nhập mã mới | Xác thực thành công | ✅ |
| TG06 | Sai mật khẩu 5 lần, rồi nhập đúng | Lần 5 vẫn báo chung "mật khẩu không đúng"; nhập đúng: "Tài khoản tạm khóa đến 08:24 … do nhập sai mật khẩu 5 lần" | ✅ |
| TG07 | Chờ 5 phút 10 giây rồi mới nhập OTP | "Mã OTP đã hết hạn hoặc không tồn tại" | ✅ |
| TG08 | Sau 5 phút (chưa đủ 15) đăng nhập đúng mật khẩu | Vẫn bị khóa | ✅ |
| TG09 | Sau 15 phút 10 giây đăng nhập đúng mật khẩu | Đăng nhập được | ✅ |

Ghi chú TG06: lần sai thứ 5 không báo ngay là đã khóa. Đây là chủ ý trong `XacThucService` để người đoán mật khẩu không dò được tài khoản nào tồn tại; người nhập đúng mật khẩu mới thấy thông báo khóa.

### 5.2 In biên lai

| Mã | Thao tác | Kết quả | Đạt |
|---|---|---|---|
| IN01 | Lễ tân thu tiền → bấm In biên lai (bản cũ mở cửa sổ mới) | Trình duyệt chặn cửa sổ bật lên, app báo "Trình duyệt chặn cửa sổ in" và không in được | ❌ → **đã sửa** (6.1 số 6) |
| IN02 | Bấm In biên lai sau khi sửa | Không mở cửa sổ mới; gọi lệnh in của trình duyệt với khung ẩn chứa biên lai đúng: tên phòng khám, số BL2610240009, từng dịch vụ (giá / BHYT / bệnh nhân trả), tổng 174.000 đ, khách đưa 500.000 đ, tiền thừa 326.000 đ, thu ngân | ✅ |

Chưa thử in ra **máy in thật**: hộp thoại in của trình duyệt cần người bấm.

### 5.3 Tự chạy máy chủ (cổng 8080)

| Mã | Thao tác | Kết quả | Đạt |
|---|---|---|---|
| TC01 | Đăng nhập Windows sáng 24/10 | Tác vụ `PhongKhamVietBac` tự chạy lúc 07:14, mở http://localhost:8080 là dùng được | ✅ |
| TC02 | Tắt cưỡng bức tiến trình Java (giả lập máy chủ chết / MySQL chưa sẵn sàng) | Bản cũ dựa vào "Restart on failure" của Task Scheduler: **không tự chạy lại** sau 150 giây | ❌ → **đã sửa** (6.1 số 7) |
| TC03 | Làm lại TC02 sau khi sửa | Tự chạy lại sau 45 giây (chờ 20 giây + khởi động), ghi vào `khoi-dong-lai.log` | ✅ |
| TC04 | `cai_dat_tu_chay.bat /dung` | Tắt hẳn, sau 30 giây không tự bật lại, không còn tiến trình nào | ✅ |
| TC05 | `chay_phongkham.bat` khi máy chủ đang tắt | Khởi động lại, chờ tới khi mở cổng (24 giây), báo "Backend đang lưu vào CSDL phongkham", mở trình duyệt | ✅ |
| TC06 | `chay_phongkham.bat` chạy từ script khác (đầu vào bị chuyển hướng) | Lệnh `timeout` không chờ nên vòng chờ kết thúc ngay, báo nhầm "Máy chủ chưa lên" | ❌ → **đã sửa** (6.1 số 8) |

### 5.4 Docker

Máy này **không cài Docker** nên không chạy được `docker compose`. Đã đọc lại cấu hình:
- `backend/Dockerfile`, `web/Dockerfile`, `nginx.conf` vẫn khớp với các thay đổi gần đây: Nginx phục vụ giao diện, cho tải tệp tới 11 MB.
- Phần backend tự phục vụ giao diện chỉ dùng khi chạy trên máy, trong Docker không ảnh hưởng.
- Rủi ro: xem đề xuất 6.2 số 9.

## 6. Tổng hợp lỗi và điều chỉnh

### 6.1 Đã sửa trong đợt này

| # | Vấn đề | Sửa | File |
|---|---|---|---|
| 1 | Lịch đặt khám cho chọn mọi ngày (cả Chủ nhật, ngày không có ca) và mời đăng ký danh sách chờ cho ngày đó | Chỉ chọn được ngày còn chỗ; ngày **có ca nhưng đã kín** mới cho đăng ký chờ | `web/src/components/ChonKhungGio.tsx` |
| 2 | Hộp thông báo loại thông tin / thành công nền xám đục | Đặt nền xanh nhạt theo màu chủ đạo, viền rõ | `web/src/styles/theme.ts` |
| 3 | Nhãn CSDL trên đầu trang làm logo bị cắt trên điện thoại | Điện thoại chỉ hiện nhãn khi đang dùng CSDL khác `phongkham`, rút gọn chữ | `web/src/layouts/AppLayout.tsx` |
| 4 | Bác sĩ bấm thông báo về một lượt khám chỉ về danh sách chung | Mở thẳng trang khám của lượt đó | `web/src/components/ChuongThongBao.tsx` |
| 5 | Ô chọn ngày ghi "thứ bảy" khác kiểu "Thứ 7" của cả hệ thống | Dùng chung cách ghi `thuNgay` | `QuanLyLichHen.tsx`, `LichKham.tsx`, `DangKyCa.tsx` |
| 6 | In biên lai mở cửa sổ mới, bị trình duyệt chặn cửa sổ bật lên | In qua khung ẩn ngay trong trang, không cần cửa sổ mới | `web/src/pages/le-tan/ThuTamThu.tsx` |
| 7 | Máy chủ chết hoặc thoát (MySQL chưa sẵn sàng khi bật máy) thì không tự chạy lại | Tác vụ chạy vòng lặp `giu_may_chu.ps1`: Java thoát thì chạy lại sau 10–60 giây; thêm lệnh `cai_dat_tu_chay.bat /dung` để tắt hẳn | `scripts/giu_may_chu.ps1`, `scripts/tu_chay.ps1`, `cai_dat_tu_chay.bat` |
| 8 | `chay_phongkham.bat` không chờ máy chủ khi chạy từ script khác | Dùng `ping` để chờ thay cho `timeout` | `chay_phongkham.bat` |

### 6.2 Đề xuất điều chỉnh tiếp

Xếp theo mức ưu tiên (cao → thấp).

| # | Đề xuất | Lý do | Mức |
|---|---|---|---|
| 1 | ~~Nút **Thu tiền** ngay trên dòng lịch hẹn~~ | **Đã làm** (mục 7): nút "Thu tạm thu CLS" / "Thanh toán" mở thẳng hộp thu của lượt đó | — |
| 2 | ~~Thống nhất bước đặt lịch~~ | **Không cần**: đã tự sang bước ở cả ba bước (đính chính UX07) | — |
| 3 | ~~Hoàn tiền khi bác sĩ hủy phiếu CLS đã tạm thu~~ | **Đã làm** (mục 7): phiếu hoàn tiền tự sinh, lễ tân chi, quản trị duyệt phiếu trên 1 triệu | — |
| 4 | Kiểm tra quyền khi xem ảnh/PDF kết quả CLS | Tệp phục vụ công khai qua đường dẫn ngẫu nhiên; dữ liệu y tế nên yêu cầu đăng nhập | Trung bình |
| 5 | API đăng nhập thất bại trả mã 400 cho mọi trường hợp | Nên tách 401 (sai mật khẩu) / 403 (bị khóa, chưa xác thực) để ứng dụng di động xử lý; giao diện web hiện vẫn báo đúng | Thấp |
| 6 | API cập nhật hồ sơ (`PUT /api/ho-so`) bắt buộc gửi đủ ngày sinh, giới tính | Giao diện gửi đủ nên không lỗi; nếu có app khác nên cho cập nhật từng phần | Thấp |
| 7 | Bệnh nhân tích nhiều thông báo (tài khoản mẫu có 21 chưa đọc) | Cân nhắc gom nhóm theo lượt khám hoặc tự đánh dấu đã đọc khi mở trang liên quan | Thấp |
| 8 | ~~Bảng đơn thuốc trên điện thoại chuyển sang dạng thẻ~~ | **Đã làm** (mục 7) | — |
| 9 | Script tạo CSDL (`backend/src/main/resources/db/`, file `.sql`) bị `.gitignore` loại khỏi repo GitHub | Ai clone repo (người chấm, máy khác, Docker từ repo) sẽ có CSDL trống, hệ thống không chạy. Nếu cần nộp mã nguồn chạy được, nên đưa ít nhất `db/migration` lên repo | Cao (khi nộp bài) |

## 7. Đợt bổ sung 24/10/2026: hoàn tiền, hủy hóa đơn, thống kê, tối ưu giao diện

Chạy trên CSDL `phongkham` (máy chủ http://localhost:8080). Sau khi thêm chức năng, chạy lại `scripts/kiem_thu_api.py`: **82/82 đạt**.

### 7.1 Hoàn tiền (UC10.4, BR31) và hủy hóa đơn (UC10.5)

| Mã | Thao tác | Kết quả khi chạy | Đạt |
|---|---|---|---|
| HT01 | Bác sĩ hủy phiếu CLS đã tạm thu (CBC 120.000 đ) | Tự sinh phiếu HT2610240003 "Hủy phiếu CLS đã thu", Chờ hoàn, ghi "Hệ thống tự tạo"; menu lễ tân hiện số 1 | ✅ |
| HT02 | Lễ tân mở phiếu, chi tiền mặt | Hiện chứng từ gốc BL2610240011, đã thu, đã hoàn, còn hoàn được; chuyển Đã hoàn, có nút in phiếu | ✅ |
| HT03 | Lập tay 50.000 đ từ biên lai (chuyển khoản thừa), chi tiền mặt | Chờ hoàn → Đã hoàn | ✅ |
| HT04 | Lập tay 1.005.000 đ | Chờ duyệt; lễ tân chi bị chặn "cần quản trị viên duyệt"; lễ tân bấm duyệt bị 403 | ✅ |
| HT05 | Quản trị duyệt, lễ tân chi chuyển khoản không nhập số tài khoản | Duyệt thành Chờ hoàn; chuyển khoản thiếu số tài khoản bị chặn; nhập đủ thì Đã hoàn | ✅ |
| HT06 | Lập thêm 10.000 đ khi chứng từ chỉ còn 5.000 đ | Bị chặn "vượt phần còn hoàn được (5.000 đ)" | ✅ |
| HD01 | Lễ tân hủy hóa đơn | 403, chỉ quản trị viên được hủy | ✅ |
| HD02 | Quản trị hủy hóa đơn đã thanh toán HD2610120016, không lý do / có lý do | Không lý do bị chặn; có lý do: hóa đơn cũ Đã hủy (giữ lý do), lập HD2610240019 Đã thanh toán thay thế; hủy lại bị chặn | ✅ |
| HD03 | Quản trị mở hóa đơn | Chỉ có Hủy hóa đơn / In / Đóng, không có nút thu tiền; có tab Đã hủy | ✅ |

### 7.2 Thống kê báo cáo (UC13.1, UC13.2)

| Mã | Thao tác | Kết quả khi chạy | Đạt |
|---|---|---|---|
| TK01 | Mở Thống kê (quản trị) | Lượt khám hôm nay, doanh thu thuần hôm nay / tháng, tỉ lệ hủy / vắng tháng, biểu đồ 7 ngày, việc cần xử lý, lịch mới theo kênh | ✅ |
| TK02 | Đối chiếu doanh thu thuần hôm nay | 1.060.000 + 235.000 + 120.000 thu − 1.055.000 hoàn = 360.000 đ, khớp | ✅ |
| TK03 | 5 loại thống kê trong tháng | Mỗi loại có số tổng, biểu đồ cột theo ngày (hiệu suất: theo bác sĩ), bảng chi tiết, bảng theo nhóm; doanh thu: 2.889.500 + 3.438.200 − 1.055.000 = 5.272.700 đ | ✅ |
| TK04 | Ngày bắt đầu sau ngày kết thúc | "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc" | ✅ |
| TK05 | Lễ tân gọi API thống kê | 403 | ✅ |
| TK06 | Lọc hiệu suất theo bác sĩ | Chỉ còn bác sĩ đó | ✅ |

Màu cột biểu đồ `#0E9384` đã chạy bộ kiểm tra bảng màu của skill dataviz (chroma ≥ 0.1, tương phản ≥ 3:1). Màu chủ đạo `#0F6E64` không đạt chroma nên không dùng cho biểu đồ.

### 7.3 Tối ưu giao diện

| Mã | Thay đổi | Kiểm tra | Đạt |
|---|---|---|---|
| GD01 | Nút "Thu tạm thu CLS" / "Thanh toán" trên dòng lịch hẹn | Bấm "Thanh toán" ở lượt Nguyễn Kiểm Thử mở thẳng hóa đơn HD2610240018 | ✅ |
| GD02 | Đơn thuốc trên điện thoại hiện dạng thẻ | Thẻ "Amlor 5 5mg · Số lượng 10 Viên · Cách dùng…", không còn bảng vuốt ngang | ✅ |
| GD03 | Rút gọn nhãn menu bị cắt ("Hóa đơn", "Thống kê") | Hết bị cắt chữ trên thanh bên | ✅ |

## 8. Đợt bổ sung 25/10/2026: đánh giá sau khám, góp ý – khiếu nại, báo cáo đánh giá

Chạy trên CSDL `phongkham`. Kịch bản `scripts/kiem_thu_api.py` thêm nhóm 11 (20 trường hợp), **20/20 đạt**. Ngày 25/10 là Chủ nhật, không có ca làm việc nên các trường hợp cần khám lượt mới trong ngày (LT06 trở đi, 31 trường hợp) không chạy được; nhóm 11 khi đó tự dùng lượt khám đã hoàn tất, chưa thanh toán của bệnh nhân kiểm thử lần trước. Cần chạy lại toàn bộ kịch bản vào ngày làm việc để xác nhận 102/102.

### 8.1 Đánh giá sau khám (UC12.1, BR24) và phân tích (UC15.8)

| Mã | Thao tác | Kết quả khi chạy | Đạt |
|---|---|---|---|
| DG01 | Mở biểu mẫu lượt chưa thanh toán | "Chỉ đánh giá được lượt khám đã hoàn tất và thanh toán" | ✅ |
| DG02 | Lễ tân thu hóa đơn | Lượt vào danh sách chờ đánh giá của bệnh nhân | ✅ |
| DG03–05 | Thiếu điểm bác sĩ / không chấm tiêu chí nào / điểm 6 | Lần lượt bị chặn với thông báo tương ứng | ✅ |
| DG06 | Gửi 5★ bác sĩ, 3 tiêu chí, bỏ trống CLS, kèm ảnh PNG | Lưu MaDG 9, 1 ảnh, tiêu chí CLS để trống; điểm TB bác sĩ cập nhật | ✅ |
| DG07 | Gửi lần hai | "Lượt khám này đã được đánh giá" | ✅ |
| DG08 | Bệnh nhân khác mở lượt đó | 404 | ✅ |
| DG09 | Quản trị bấm Phân tích ngay | Gán cảm xúc, chủ đề, mức nghiêm trọng (8 đánh giá mẫu cũng được phân tích) | ✅ |
| DG10 | Báo cáo đánh giá | Điểm TB bác sĩ và 6 tiêu chí, tỉ lệ cảm xúc, chủ đề tích cực/tiêu cực, xu hướng tháng, theo bác sĩ, đoạn tổng hợp | ✅ |
| DG11 | Lễ tân gọi API báo cáo | 403 | ✅ |
| DG12 | Lời mời đánh giá tự động (mỗi 15 phút, sau 2 giờ kể từ thanh toán) | Lượt LH2610110017 (thanh toán 24/10) nhận thông báo "Mời đánh giá lượt khám", bấm mở thẳng biểu mẫu | ✅ |

Phân tích dùng luật từ khóa (bỏ dấu tiếng Việt) thay cho dịch vụ LLM chưa tích hợp: không có nhận xét thì gán theo số sao (UC15.8 2a); cảm xúc của từng chủ đề trên báo cáo lấy theo điểm tiêu chí tương ứng nếu có chấm. Đã sửa trong đợt: đánh giá khen bác sĩ nhưng chê chờ lâu từng bị tính là "khen thời gian chờ".

### 8.2 Góp ý – khiếu nại (UC12.2, UC12.3, BR25)

| Mã | Thao tác | Kết quả khi chạy | Đạt |
|---|---|---|---|
| GY01 | Gửi nội dung trống | "Vui lòng nhập nội dung" | ✅ |
| GY02 | Gửi khiếu nại kèm lượt khám và ảnh | Phiếu GY2610250004, hạn phản hồi sau đúng 48 giờ; quản trị viên nhận thông báo | ✅ |
| GY03 | Gắn lượt khám của người khác | Bị chặn | ✅ |
| GY04 | Quản trị mở danh sách cần xử lý | Thấy phiếu mới, số trên menu; 2 phiếu mẫu quá hạn tô đỏ, có cảnh báo "quá hạn 48 giờ" | ✅ |
| GY05 | Ghi chú nội bộ | Quản trị thấy, bệnh nhân không thấy | ✅ |
| GY06 | Phản hồi trống; tiếp nhận; phản hồi | Trống bị chặn; Mới → Đang xử lý → Đã phản hồi; bệnh nhân nhận thông báo | ✅ |
| GY07 | Bệnh nhân bổ sung, quản trị phản hồi lại, bệnh nhân xác nhận hài lòng | Đang xử lý (hạn 48 giờ mới) → Đã phản hồi → Đã đóng | ✅ |
| GY08 | Bổ sung vào phiếu đã đóng | "Phiếu đã đóng, vui lòng gửi phiếu mới" | ✅ |
| GY09 | Bệnh nhân gọi API xử lý góp ý | 403 | ✅ |

Phiếu đã phản hồi tự đóng sau 7 ngày nếu bệnh nhân không gửi thêm (tác vụ 15 phút); chưa kiểm thử theo thời gian thật.

### 8.3 Giao diện

| Mã | Kiểm tra | Đạt |
|---|---|---|
| GD04 | Bệnh nhân: menu "Đánh giá" có số lượt chờ; biểu mẫu sao bác sĩ, 6 tiêu chí (ghi chú "lượt này không làm CLS"), ảnh; bấm Gửi khi chưa chấm hiện "Vui lòng chấm điểm bác sĩ" | ✅ |
| GD05 | Bệnh nhân: "Góp ý – Khiếu nại" với biểu mẫu loại, chủ đề, lượt khám, tệp; xem trao đổi dạng hội thoại; nút "Hài lòng, đóng phiếu" | ✅ |
| GD06 | Quản trị: "Góp ý" lọc theo trạng thái, loại, chủ đề, mức nghiêm trọng, quá hạn; ngăn kéo xử lý với tiếp nhận, phản hồi, ghi chú nội bộ | ✅ |
| GD07 | Quản trị: "Báo cáo đánh giá" bấm chủ đề "Thời gian chờ" mở danh sách đánh giá liên quan (nút xuất CSV theo bác sĩ chưa bấm thử) | ✅ |
| GD08 | Sửa tên bác sĩ bị lặp học hàm ("ThS.BS BS. …") và nhãn menu bị cắt huy hiệu | ✅ |

## 9. Kiểm thử lại toàn hệ thống 25/10/2026 (Chủ nhật) và các vấn đề đang gặp

### 9.1 Kết quả

| Hạng mục | Kết quả |
|---|---|
| Kịch bản API `scripts/kiem_thu_api.py` | **71/102 đạt**. 31 trường hợp không chạy được vì Chủ nhật không có ca (LT06 không xếp được lượt khám hôm nay, kéo theo khám, tạm thu, CLS, hoàn tất, nhật ký QT07/QT08). Không có trường hợp nào lỗi do chức năng sai. Ngày 24/10 (thứ 7) nhánh này đạt 82/82 |
| Quét giao diện tự động: 37 trang của 5 vai trò, mỗi trang ở 1280 px và 375 px | **74/74 lượt tải sạch**: không lỗi JavaScript, không gọi API lỗi, không tràn ngang, không bị đẩy về trang khác. Chỉ có cảnh báo đúng thiết kế "2 phiếu quá hạn 48 giờ" ở trang Góp ý |
| Đặt lịch trên điện thoại (bệnh nhân kiểm thử) | Chọn chuyên khoa → bác sĩ → ngày giờ → xác nhận chạy đúng; bị chặn đúng khi trùng bác sĩ trong ngày |
| Nhật ký máy chủ | Không có lỗi mới. Chỉ còn cảnh báo khóa ngoại khi test QT05 thử xóa nhân viên đã có ca (đúng mong đợi) và cảnh báo "clock leap" khi máy ngủ |

### 9.2 Vấn đề đang gặp

| # | Vấn đề | Ảnh hưởng | Mức |
|---|---|---|---|
| 1 | **58 tệp chưa commit**: CLS, thu tạm thu, hóa đơn, MoMo, hoàn tiền, thống kê, đánh giá, góp ý, tự chạy, kịch bản test đều chỉ nằm trên máy. Commit gần nhất là `b2cd52d` | Hỏng ổ đĩa hoặc lỡ tay là mất nhiều ngày công; không có lịch sử để trình bày | **Cao** |
| 2 | Thư mục `backend/src/main/resources/db/` (Flyway V1–V7, dữ liệu mẫu) bị `.gitignore` loại khỏi repo (`.gitignore` dòng 20, 0 tệp được theo dõi) | Ai clone repo (người chấm, máy khác, Docker) sẽ không tạo được CSDL, hệ thống không chạy | **Cao** (khi nộp) |
| 3 | Kịch bản kiểm thử phụ thuộc ngày làm việc: Chủ nhật hoặc ngoài giờ thì 31/102 trường hợp không chạy | Không chứng minh được luồng khám đầy đủ vào lúc bất kỳ, ví dụ khi demo | Trung bình |
| 4 | Tệp tải lên (ảnh/PDF kết quả CLS, tệp đính kèm góp ý, ảnh đánh giá) mở được không cần đăng nhập: `GET /api/tep/gop-y/…png` trả 200 khi không có token | Dữ liệu y tế lộ nếu đường dẫn bị chia sẻ; chỉ được bảo vệ bằng tên ngẫu nhiên | Trung bình |
| 5 | Thanh toán MoMo thành công đầu-cuối chưa kiểm thử: thẻ ATM thử của sandbox bị từ chối, cần ứng dụng MoMo UAT | Chưa chắc luồng IPN và tự cập nhật hóa đơn chạy đúng với giao dịch thật | Trung bình |
| 6 | Ảnh chuyên khoa ở bước đặt lịch tải từ `images.unsplash.com` (ngoài mạng) | Demo không có Internet thì các thẻ chuyên khoa thành khung trắng cao 150 px | Trung bình (khi demo) |
| 7 | Trùng lịch cùng bác sĩ trong ngày chỉ báo ở bước cuối "Xác nhận đặt lịch" | Bệnh nhân chọn xong bác sĩ, ngày, giờ mới biết không đặt được | Thấp |
| 8 | Phân tích đánh giá, góp ý dùng luật từ khóa, chưa có LLM (UC13.3 bước 4, UC15.8) | Nhận xét phức tạp hoặc mỉa mai có thể bị gán sai cảm xúc | Thấp (đã ghi rõ trên giao diện) |
| 9 | Docker chưa chạy thử (máy không cài) | Cách triển khai bằng Docker trong README chưa được xác nhận | Thấp |
| 10 | Tự đóng phiếu góp ý sau 7 ngày và lời mời đánh giá với lượt quá hạn chưa kiểm thử theo thời gian thật | Logic đơn giản nhưng chưa có bằng chứng chạy | Thấp |
| 11 | Còn tồn từ mục 6.2: API đăng nhập thất bại luôn trả 400; `PUT /api/ho-so` bắt buộc đủ trường; bệnh nhân tích nhiều thông báo chưa đọc | Không ảnh hưởng giao diện web hiện tại | Thấp |
| 12 | Dữ liệu mẫu: phiếu góp ý GY2610090002 có hạn phản hồi (18/10) trước thời điểm gửi (19/10) | Hiện "quá hạn 6 ngày" sai lệch một ngày trên trang Góp ý | Thấp |

Chức năng trong đặc tả **chưa làm**: trợ lý AI/chatbot (gói 14), đặt lịch qua tin nhắn (`YeuCauDatLich`), hoàn tiền khi BHYT xác minh sau (BR27), biểu đồ chỉ số xét nghiệm của bệnh nhân (`v_ChiSoXetNghiem`), hiện lộ trình đến phòng CLS cho bệnh nhân.

