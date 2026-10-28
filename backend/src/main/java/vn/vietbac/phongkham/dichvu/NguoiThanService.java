package vn.vietbac.phongkham.dichvu;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.vietbac.phongkham.chung.ChuanHoa;
import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.chung.MatKhau;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/**
 * UC1.7, BR34: hồ sơ người thân do tài khoản bệnh nhân quản lý (tối đa 5) để đặt lịch, theo dõi lượt khám,
 * xem hồ sơ sức khỏe và hóa đơn thay người thân. Hồ sơ đã có tại phòng khám (trùng SĐT hoặc CCCD và trùng ngày sinh)
 * chỉ liên kết khi nhập đúng OTP gửi tới SĐT của hồ sơ, hoặc lễ tân xác nhận khi hồ sơ không có SĐT.
 */
@Service
public class NguoiThanService {

    public static final int TOI_DA = 5;
    private static final Duration HAN_OTP = Duration.ofMinutes(5);
    private static final int SO_LAN_SAI_TOI_DA = 5;

    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final TruyVan tv;
    private final DongHo dongHo;
    private final boolean cheDoThu;

    public NguoiThanService(ThongBaoService thongBao, NhatKyService nhatKy, TruyVan tv, DongHo dongHo,
                            @Value("${phongkham.che-do-thu}") String cheDoThu) {
        this.thongBao = thongBao;
        this.nhatKy = nhatKy;
        this.tv = tv;
        this.dongHo = dongHo;
        this.cheDoThu = "1".equals(cheDoThu) || "true".equalsIgnoreCase(cheDoThu);
    }

    public record NguoiThanMoi(String hoTen, LocalDate ngaySinh, String gioiTinh, String quanHe, String sdt, String cccd,
                               String diaChi) {
    }

    // ================= Quyền xem / thao tác thay người thân =================

    /** Hồ sơ tài khoản được thao tác: bản thân trước, sau đó người thân đã liên kết. */
    @Transactional(readOnly = true)
    public List<Integer> quanLy(NguoiDung nd) {
        if (nd.maBN() == null) {
            throw new LoiQuyen("Tài khoản chưa gắn hồ sơ bệnh nhân");
        }
        List<Integer> ds = new ArrayList<>(List.of(nd.maBN()));
        for (Map<String, Object> r : tv.ds(
                "SELECT MaBN FROM NguoiThan WHERE MaTK = ? AND TrangThai = 'DA_LIEN_KET' ORDER BY NgayLienKet", nd.maTK())) {
            ds.add((Integer) r.get("MaBN"));
        }
        return ds;
    }

    /** Người khám được chọn: null = bản thân; hồ sơ không thuộc tài khoản thì coi như không tồn tại. */
    @Transactional(readOnly = true)
    public Integer chon(NguoiDung nd, Integer maBN) {
        List<Integer> ds = quanLy(nd);
        if (maBN == null) {
            return ds.get(0);
        }
        if (!ds.contains(maBN)) {
            throw new KhongTimThay("Không tìm thấy hồ sơ người khám");
        }
        return maBN;
    }

    /** Kiểm tra hồ sơ maBN (VD chủ của một lượt khám, hóa đơn) thuộc tài khoản. */
    public void kiemTra(NguoiDung nd, Integer maBN, String thongBaoLoi) {
        if (maBN == null || !quanLy(nd).contains(maBN)) {
            throw new KhongTimThay(thongBaoLoi);
        }
    }

    // ================= UC1.7 =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> ds(Integer maTK) {
        return tv.ds("""
                SELECT nt.MaBN, nt.QuanHe, nt.TrangThai, nt.NgayLienKet, nt.NgayTao, bn.HoTen, bn.NgaySinh, bn.GioiTinh,
                       bn.SDT, bn.CCCD, bn.DiaChi, bn.MaTK IS NOT NULL AS CoTaiKhoanRieng,
                       (SELECT COUNT(*) FROM LuotKham lk WHERE lk.MaBN = nt.MaBN AND lk.TrangThai = 'HOAN_THANH') AS SoLanKham
                FROM NguoiThan nt JOIN BenhNhan bn ON bn.MaBN = nt.MaBN
                WHERE nt.MaTK = ? ORDER BY nt.NgayTao""", maTK);
    }

    /**
     * Thêm người thân. Kết quả TrangThai: DA_LIEN_KET (tạo hồ sơ mới), CHO_OTP (hồ sơ đã có, đã gửi OTP tới SĐT của hồ sơ),
     * CHO_LE_TAN (hồ sơ đã có nhưng không có SĐT nhận OTP).
     */
    @Transactional
    public Map<String, Object> them(NguoiDung nd, NguoiThanMoi b) {
        String hoTen = ChuanHoa.hoTen(b.hoTen());
        if (hoTen.isEmpty() || hoTen.length() > 100) {
            throw new LoiNghiepVu("Nhập họ tên người thân (tối đa 100 ký tự)");
        }
        if (b.ngaySinh() == null || b.ngaySinh().isAfter(dongHo.homNay()) || b.ngaySinh().getYear() < 1900) {
            throw new LoiNghiepVu("Ngày sinh không hợp lệ");
        }
        String quanHe = rong(b.quanHe());
        if (quanHe == null || quanHe.length() > 30) {
            throw new LoiNghiepVu("Chọn mối quan hệ với người thân");
        }
        String sdt = rong(b.sdt()) == null ? null : ChuanHoa.sdt(b.sdt());
        String cccd = rong(b.cccd());
        if (cccd != null) {
            ChuanHoa.cccd(cccd);
        }
        if (tv.dem("SELECT COUNT(*) FROM NguoiThan WHERE MaTK = ?", nd.maTK()) >= TOI_DA) {
            throw new LoiNghiepVu("Mỗi tài khoản quản lý tối đa " + TOI_DA + " hồ sơ người thân (BR34)");
        }
        // Bước 5: hồ sơ đã có tại phòng khám trùng SĐT hoặc CCCD và trùng ngày sinh
        Map<String, Object> trung = null;
        if (cccd != null) {
            trung = tv.mot("SELECT MaBN, MaTK, HoTen, SDT FROM BenhNhan WHERE NgaySinh = ? AND CCCD = ?", b.ngaySinh(), cccd);
        }
        if (trung == null && sdt != null) {
            trung = tv.mot("SELECT MaBN, MaTK, HoTen, SDT FROM BenhNhan WHERE NgaySinh = ? AND SDT = ? ORDER BY MaBN",
                    b.ngaySinh(), sdt);
        }
        LocalDateTime bayGio = dongHo.bayGio();
        Map<String, Object> kq = new LinkedHashMap<>();
        if (trung == null) {
            String tenTK = tv.giaTri("SELECT HoTen FROM BenhNhan WHERE MaBN = ?", nd.maBN());
            String sdtTK = tv.giaTri("SELECT SDT FROM TaiKhoan WHERE MaTK = ?", nd.maTK());
            // Trẻ em không có SĐT riêng: ghi người quản lý làm người liên hệ
            tv.capNhat("""
                    INSERT INTO BenhNhan (HoTen, NgaySinh, GioiTinh, SDT, CCCD, DiaChi, NguoiLienHe, SDTNguoiLienHe, NgayTao)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    hoTen, b.ngaySinh(), rong(b.gioiTinh()), sdt, cccd, rong(b.diaChi()), tenTK, sdtTK, bayGio);
            Integer maBN = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
            tv.capNhat("""
                    INSERT INTO NguoiThan (MaTK, MaBN, QuanHe, TrangThai, NgayTao, NgayLienKet)
                    VALUES (?, ?, ?, 'DA_LIEN_KET', ?, ?)""", nd.maTK(), maBN, quanHe, bayGio, bayGio);
            nhatKy.ghi(nd.maTK(), "THEM_NGUOI_THAN", "BenhNhan", maBN, hoTen + " (" + quanHe + "), tạo hồ sơ mới");
            kq.put("ma_bn", maBN);
            kq.put("trang_thai", "DA_LIEN_KET");
            return kq;
        }
        Integer maBN = (Integer) trung.get("MaBN");
        if (maBN.equals(nd.maBN())) {
            throw new LoiNghiepVu("Đây là hồ sơ của chính bạn");
        }
        if (trung.get("MaTK") != null) {
            throw new LoiNghiepVu("Người này đã có tài khoản riêng tại phòng khám, không liên kết làm người thân được (BR34)");
        }
        if (tv.dem("SELECT COUNT(*) FROM NguoiThan WHERE MaTK = ? AND MaBN = ?", nd.maTK(), maBN) > 0) {
            throw new LoiNghiepVu("Hồ sơ " + trung.get("HoTen") + " đã có trong danh sách người thân");
        }
        String sdtHoSo = (String) trung.get("SDT");
        kq.put("ma_bn", maBN);
        kq.put("ho_ten", trung.get("HoTen"));
        if (sdtHoSo == null) {
            tv.capNhat("INSERT INTO NguoiThan (MaTK, MaBN, QuanHe, TrangThai, NgayTao) VALUES (?, ?, ?, 'CHO_LE_TAN', ?)",
                    nd.maTK(), maBN, quanHe, bayGio);
            nhatKy.ghi(nd.maTK(), "THEM_NGUOI_THAN", "BenhNhan", maBN, trung.get("HoTen") + " (" + quanHe + "), chờ lễ tân xác nhận");
            kq.put("trang_thai", "CHO_LE_TAN");
            return kq;
        }
        String otp = MatKhau.otp();
        tv.capNhat("""
                INSERT INTO NguoiThan (MaTK, MaBN, QuanHe, TrangThai, MaOTP, HetHanOTP, NgayTao)
                VALUES (?, ?, ?, 'CHO_OTP', ?, ?, ?)""", nd.maTK(), maBN, quanHe, otp, bayGio.plus(HAN_OTP), bayGio);
        guiOtp(maBN, otp);
        kq.put("trang_thai", "CHO_OTP");
        kq.put("sdt_an", anSdt(sdtHoSo));
        if (cheDoThu) {
            kq.put("otp_thu", otp);   // Chế độ thử: không có cổng SMS thật, trả mã để kiểm thử
        }
        return kq;
    }

    /** Gửi lại OTP cho liên kết đang chờ (mã cũ hết hiệu lực). */
    @Transactional
    public Map<String, Object> guiLaiOtp(NguoiDung nd, Integer maBN) {
        Map<String, Object> nt = lienKet(nd.maTK(), maBN);
        if (!"CHO_OTP".equals(nt.get("TrangThai"))) {
            throw new LoiNghiepVu("Liên kết này không chờ mã OTP");
        }
        String otp = MatKhau.otp();
        tv.capNhat("UPDATE NguoiThan SET MaOTP = ?, HetHanOTP = ?, SoLanSai = 0 WHERE MaTK = ? AND MaBN = ?",
                otp, dongHo.bayGio().plus(HAN_OTP), nd.maTK(), maBN);
        guiOtp(maBN, otp);
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("sdt_an", anSdt(tv.giaTri("SELECT SDT FROM BenhNhan WHERE MaBN = ?", maBN)));
        if (cheDoThu) {
            kq.put("otp_thu", otp);
        }
        return kq;
    }

    /** 5a: nhập đúng OTP thì liên kết hồ sơ cùng lịch sử khám vào tài khoản; sai 5 lần thì phải gửi lại mã. */
    @Transactional(noRollbackFor = LoiNghiepVu.class)
    public void xacNhanOtp(NguoiDung nd, Integer maBN, String maSo) {
        Map<String, Object> nt = lienKet(nd.maTK(), maBN);
        if (!"CHO_OTP".equals(nt.get("TrangThai"))) {
            throw new LoiNghiepVu("Liên kết này không chờ mã OTP");
        }
        int sai = ((Number) nt.get("SoLanSai")).intValue();
        if (sai >= SO_LAN_SAI_TOI_DA || dongHo.bayGio().isAfter((LocalDateTime) nt.get("HetHanOTP"))) {
            throw new LoiNghiepVu("Mã OTP đã hết hạn hoặc bị vô hiệu, vui lòng gửi lại mã");
        }
        if (!nt.get("MaOTP").equals(maSo == null ? "" : maSo.strip())) {
            tv.capNhat("UPDATE NguoiThan SET SoLanSai = SoLanSai + 1 WHERE MaTK = ? AND MaBN = ?", nd.maTK(), maBN);
            int con = SO_LAN_SAI_TOI_DA - sai - 1;
            throw new LoiNghiepVu(con > 0 ? "Mã OTP không đúng, còn " + con + " lần thử" : "Nhập sai quá 5 lần, vui lòng gửi lại mã");
        }
        tv.capNhat("""
                UPDATE NguoiThan SET TrangThai = 'DA_LIEN_KET', NgayLienKet = ?, MaOTP = NULL, HetHanOTP = NULL
                WHERE MaTK = ? AND MaBN = ?""", dongHo.bayGio(), nd.maTK(), maBN);
        nhatKy.ghi(nd.maTK(), "LIEN_KET_NGUOI_THAN", "BenhNhan", maBN, "Xác thực OTP, liên kết " + nt.get("HoTen"));
    }

    /** 3a: bệnh nhân chỉ sửa quan hệ và thông tin liên hệ; ngày sinh, họ tên do lễ tân sửa. */
    @Transactional
    public void sua(NguoiDung nd, Integer maBN, String quanHe, String sdt, String diaChi) {
        Map<String, Object> nt = lienKet(nd.maTK(), maBN);
        String qh = rong(quanHe);
        if (qh == null || qh.length() > 30) {
            throw new LoiNghiepVu("Chọn mối quan hệ với người thân");
        }
        tv.capNhat("UPDATE NguoiThan SET QuanHe = ? WHERE MaTK = ? AND MaBN = ?", qh, nd.maTK(), maBN);
        if ("DA_LIEN_KET".equals(nt.get("TrangThai"))) {
            tv.capNhat("UPDATE BenhNhan SET SDT = ?, DiaChi = ? WHERE MaBN = ?",
                    rong(sdt) == null ? null : ChuanHoa.sdt(sdt), rong(diaChi), maBN);
        }
        nhatKy.ghi(nd.maTK(), "SUA_NGUOI_THAN", "BenhNhan", maBN, nt.get("HoTen") + " (" + qh + ")");
    }

    /** 3b, 3c: hủy liên kết; hồ sơ và lịch sử khám giữ nguyên. Còn lịch hẹn chưa diễn ra thì phải hủy lịch trước. */
    @Transactional
    public void huy(NguoiDung nd, Integer maBN) {
        Map<String, Object> nt = lienKet(nd.maTK(), maBN);
        long conLich = tv.dem("""
                SELECT COUNT(*) FROM LuotKham WHERE MaBN = ? AND NgayKham >= ?
                AND TrangThai IN ('CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DA_CHECK_IN', 'DANG_KHAM', 'CHO_CLS', 'DA_CO_KET_QUA')""",
                maBN, dongHo.homNay());
        if ("DA_LIEN_KET".equals(nt.get("TrangThai")) && conLich > 0) {
            throw new LoiNghiepVu(nt.get("HoTen") + " còn " + conLich + " lịch hẹn chưa diễn ra, hãy hủy các lịch đó trước");
        }
        tv.capNhat("DELETE FROM NguoiThan WHERE MaTK = ? AND MaBN = ?", nd.maTK(), maBN);
        nhatKy.ghi(nd.maTK(), "HUY_NGUOI_THAN", "BenhNhan", maBN, "Hủy liên kết " + nt.get("HoTen"));
    }

    // ================= Lễ tân xác nhận (5b, UC7.4 3b) =================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> choLeTan(Integer maBN) {
        return tv.ds("""
                SELECT nt.MaTK, nt.MaBN, nt.QuanHe, nt.NgayTao, ql.HoTen AS NguoiQuanLy, tk.SDT, tk.Email
                FROM NguoiThan nt JOIN TaiKhoan tk ON tk.MaTK = nt.MaTK JOIN BenhNhan ql ON ql.MaTK = nt.MaTK
                WHERE nt.MaBN = ? AND nt.TrangThai = 'CHO_LE_TAN' ORDER BY nt.NgayTao""", maBN);
    }

    @Transactional
    public void leTanXacNhan(Integer maTKQuanLy, Integer maBN, Integer maTKLeTan) {
        Map<String, Object> nt = lienKet(maTKQuanLy, maBN);
        if (!"CHO_LE_TAN".equals(nt.get("TrangThai"))) {
            throw new LoiNghiepVu("Liên kết không ở trạng thái chờ lễ tân xác nhận");
        }
        tv.capNhat("""
                UPDATE NguoiThan SET TrangThai = 'DA_LIEN_KET', NgayLienKet = ?, MaTKXacNhan = ? WHERE MaTK = ? AND MaBN = ?""",
                dongHo.bayGio(), maTKLeTan, maTKQuanLy, maBN);
        nhatKy.ghi(maTKLeTan, "LIEN_KET_NGUOI_THAN", "BenhNhan", maBN, "Lễ tân xác nhận liên kết " + nt.get("HoTen"));
        Integer maBNQuanLy = tv.giaTri("SELECT MaBN FROM BenhNhan WHERE MaTK = ?", maTKQuanLy);
        if (maBNQuanLy != null) {
            thongBao.benhNhan(maBNQuanLy, "TAI_KHOAN", "Đã liên kết hồ sơ người thân",
                    "Lễ tân đã xác nhận liên kết hồ sơ " + nt.get("HoTen") + " vào tài khoản của bạn.", null, null, false);
        }
    }

    // ================= Dùng chung =================

    private Map<String, Object> lienKet(Integer maTK, Integer maBN) {
        Map<String, Object> nt = tv.mot("""
                SELECT nt.*, bn.HoTen FROM NguoiThan nt JOIN BenhNhan bn ON bn.MaBN = nt.MaBN
                WHERE nt.MaTK = ? AND nt.MaBN = ?""", maTK, maBN);
        if (nt == null) {
            throw new KhongTimThay("Không tìm thấy hồ sơ người thân");
        }
        return nt;
    }

    /** OTP qua tin nhắn tới SĐT của hồ sơ (bệnh nhân chưa có tài khoản chỉ nhận qua tin nhắn). */
    private void guiOtp(Integer maBN, String otp) {
        thongBao.benhNhan(maBN, "TAI_KHOAN", "Mã xác nhận liên kết hồ sơ",
                "Mã " + otp + " để đồng ý cho tài khoản khác quản lý hồ sơ khám của bạn tại Phòng khám Việt Bắc, hiệu lực 5 phút.",
                null, null, true);
    }

    private static String anSdt(String sdt) {
        return sdt == null || sdt.length() < 4 ? sdt : "*".repeat(sdt.length() - 3) + sdt.substring(sdt.length() - 3);
    }

    private static String rong(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
