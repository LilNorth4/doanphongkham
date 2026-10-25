package vn.vietbac.phongkham.dichvu;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.chung.MoMo;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Gói 10 – hóa đơn cuối lượt khám (UC10.1-10.3, BR09, BR26): lập khi bác sĩ hoàn tất khám gồm phí khám, cận lâm sàng,
 * thuốc; trừ phần BHYT chi trả và tiền CLS đã tạm thu. Thu tại quầy (tiền mặt, chuyển khoản) hoặc qua ví MoMo
 * (thu ngân đưa mã QR, hoặc bệnh nhân tự thanh toán trên điện thoại). Hóa đơn đã thanh toán không sửa được (trigger).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HoaDonService {

    private static final List<String> HINH_THUC_QUAY = List.of("TIEN_MAT", "CHUYEN_KHOAN");
    private static final long MOMO_TOI_THIEU = 1000;

    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final MoMo moMo;
    private final HoanTienService hoanTien;
    private final TruyVan tv;
    private final DongHo dongHo;

    @Value("${phongkham.dia-chi-web}")
    private String diaChiWeb;

    // ================= Lập hóa đơn =================

    /**
     * Lập hóa đơn cho lượt khám đã hoàn tất (gọi khi bác sĩ hoàn tất; lượt cũ chưa có thì lập khi mở danh sách).
     * Giá và phần BHYT chốt theo giá lúc chỉ định / kê đơn; mỗi lượt chỉ một hóa đơn còn hiệu lực.
     */
    @Transactional
    public Integer lapHoaDon(Integer maLK) {
        return lap(maLK, null);
    }

    /** maHDGoc khác null: hóa đơn thay thế cho hóa đơn vừa hủy (UC10.5), không báo bệnh nhân như hóa đơn mới. */
    private Integer lap(Integer maLK, Integer maHDGoc) {
        Integer co = tv.giaTri("SELECT MaHD FROM HoaDon WHERE MaLK = ? AND TrangThai <> 'DA_HUY'", maLK);
        if (co != null) {
            return co;
        }
        Map<String, Object> lk = tv.mot("""
                SELECT lk.MaLK, lk.MaLichHen, lk.MaBN, lk.TrangThai, lk.TrangThaiBHYT, lk.MucHuong, bs.MaCK
                FROM LuotKham lk JOIN NhanVien bs ON bs.MaNV = lk.MaBS WHERE lk.MaLK = ? FOR UPDATE""", maLK);
        if (lk == null || !"HOAN_THANH".equals(lk.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ lập hóa đơn cho lượt khám đã hoàn tất");
        }
        int muc = "HOP_LE".equals(lk.get("TrangThaiBHYT")) && lk.get("MucHuong") instanceof Number n ? n.intValue() : 0;
        List<Object[]> dong = new ArrayList<>();      // LoaiMuc, NoiDung, SoLuong, Gia, GiaBHYT, BHYT trả, Đã tạm thu, MaPCD, MaThuoc

        Map<String, Object> kham = tv.mot("""
                SELECT TenDV, GiaDichVu, GiaBHYT FROM DichVu WHERE LoaiDV = 'KHAM' AND MaCK = ?
                ORDER BY TrangThai = 'HOAT_DONG' DESC, MaDV LIMIT 1""", lk.get("MaCK"));
        if (kham == null) {
            kham = tv.mot("SELECT CONCAT('Khám ', TenCK) AS TenDV, PhiKhamCoBan AS GiaDichVu, NULL AS GiaBHYT "
                    + "FROM ChuyenKhoa WHERE MaCK = ?", lk.get("MaCK"));
        }
        BigDecimal giaKham = (BigDecimal) kham.get("GiaDichVu");
        dong.add(new Object[] {"KHAM", kham.get("TenDV"), 1, giaKham, kham.get("GiaBHYT"),
                bhyt((BigDecimal) kham.get("GiaBHYT"), 1, muc, giaKham), false, null, null});

        for (Map<String, Object> p : tv.ds("""
                SELECT p.MaPCD, dv.TenDV, p.GiaDichVu, p.GiaBHYT, p.BHYTChiTra, p.MaBL FROM PhieuChiDinh p
                JOIN DichVu dv ON dv.MaDV = p.MaDV WHERE p.MaLK = ? AND p.TrangThai = 'CO_KET_QUA'
                ORDER BY p.MaPCD""", maLK)) {
            dong.add(new Object[] {"CLS", p.get("TenDV"), 1, p.get("GiaDichVu"), p.get("GiaBHYT"), p.get("BHYTChiTra"),
                    p.get("MaBL") != null, p.get("MaPCD"), null});
        }
        for (Map<String, Object> t : tv.ds("""
                SELECT ct.MaThuoc, CONCAT(t.TenThuoc, COALESCE(CONCAT(' ', t.HamLuong), '')) AS Ten, ct.SoLuong,
                       ct.DonGia, ct.GiaBHYT
                FROM HoSoBenhAn hs JOIN DonThuoc d ON d.MaHSBA = hs.MaHSBA
                JOIN ChiTietDonThuoc ct ON ct.MaDon = d.MaDon JOIN Thuoc t ON t.MaThuoc = ct.MaThuoc
                WHERE hs.MaLK = ? ORDER BY t.TenThuoc""", maLK)) {
            int sl = ((Number) t.get("SoLuong")).intValue();
            BigDecimal gia = (BigDecimal) t.get("DonGia");
            dong.add(new Object[] {"THUOC", t.get("Ten"), sl, gia, t.get("GiaBHYT"),
                    bhyt((BigDecimal) t.get("GiaBHYT"), sl, muc, gia.multiply(BigDecimal.valueOf(sl))), false, null,
                    t.get("MaThuoc")});
        }

        BigDecimal tong = BigDecimal.ZERO, bhytTra = BigDecimal.ZERO, daTamThu = BigDecimal.ZERO;
        for (Object[] d : dong) {
            BigDecimal thanhTien = ((BigDecimal) d[3]).multiply(BigDecimal.valueOf(((Number) d[2]).longValue()));
            tong = tong.add(thanhTien);
            bhytTra = bhytTra.add((BigDecimal) d[5]);
            if (Boolean.TRUE.equals(d[6])) {
                daTamThu = daTamThu.add(thanhTien.subtract((BigDecimal) d[5]));
            }
        }
        LocalDateTime bayGio = dongHo.bayGio();
        tv.capNhat("""
                INSERT INTO HoaDon (MaSoHoaDon, MaLK, NgayLap, TongTien, BHYTChiTra, DaTamThu, MaHDGoc)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                "T" + UUID.randomUUID().toString().replace("-", "").substring(0, 19), maLK, bayGio, tong, bhytTra, daTamThu,
                maHDGoc);
        Integer maHD = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        String maSo = "HD" + bayGio.format(DateTimeFormatter.ofPattern("yyMMdd")) + String.format("%04d", maHD % 10000);
        tv.capNhat("UPDATE HoaDon SET MaSoHoaDon = ? WHERE MaHD = ?", maSo, maHD);
        for (Object[] d : dong) {
            tv.capNhat("""
                    INSERT INTO ChiTietHoaDon (MaHD, LoaiMuc, NoiDung, SoLuong, GiaDichVu, GiaBHYT, BHYTChiTra, DaTamThu,
                           MaPCD, MaThuoc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    maHD, d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8]);
        }
        BigDecimal conPhaiThu = tong.subtract(bhytTra).subtract(daTamThu);
        if (maHDGoc != null) {
            return maHD;
        }
        thongBao.benhNhan((Integer) lk.get("MaBN"), "HOA_DON", "Hóa đơn lượt khám " + lk.get("MaLichHen"),
                conPhaiThu.signum() > 0
                        ? "Hóa đơn " + maSo + ": còn phải thanh toán " + tien(conPhaiThu)
                                + ". Thanh toán tại quầy thu ngân hoặc qua ví MoMo trong mục Hóa đơn."
                        : "Hóa đơn " + maSo + " không còn khoản phải thanh toán.",
                "HOA_DON", maHD, false);
        return maHD;
    }

    /** BHYT chi trả một dòng = giá BHYT x số lượng x mức hưởng, không vượt thành tiền (BR09). */
    private static BigDecimal bhyt(BigDecimal giaBhyt, int soLuong, int muc, BigDecimal thanhTien) {
        if (giaBhyt == null || muc <= 0) {
            return BigDecimal.ZERO;
        }
        return giaBhyt.multiply(BigDecimal.valueOf((long) soLuong * muc))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).min(thanhTien);
    }

    /** Lượt hoàn tất gần đây chưa có hóa đơn (VD hoàn tất trước khi có chức năng này) thì lập bù. */
    private void lapBu() {
        for (Map<String, Object> r : tv.ds("""
                SELECT lk.MaLK FROM LuotKham lk WHERE lk.TrangThai = 'HOAN_THANH' AND lk.NgayKham >= ?
                  AND NOT EXISTS (SELECT 1 FROM HoaDon h WHERE h.MaLK = lk.MaLK AND h.TrangThai <> 'DA_HUY')""",
                dongHo.homNay().minusDays(30))) {
            lapHoaDon((Integer) r.get("MaLK"));
        }
    }

    // ================= Xem hóa đơn =================

    /** Thu ngân: hóa đơn chờ thanh toán (mọi ngày) hoặc đã thanh toán trong một ngày. */
    @Transactional
    public List<Map<String, Object>> dsHoaDon(String trangThai, LocalDate ngay, String tuKhoa) {
        lapBu();
        String k = tuKhoa == null || tuKhoa.isBlank() ? null : "%" + tuKhoa.strip() + "%";
        List<Object> ts = new ArrayList<>();
        boolean daThanhToan = "DA_THANH_TOAN".equals(trangThai), daHuy = "DA_HUY".equals(trangThai);
        StringBuilder dk = new StringBuilder(daThanhToan ? "hd.TrangThai = 'DA_THANH_TOAN' AND hd.NgayThanhToan >= ? "
                + "AND hd.NgayThanhToan < ?" : daHuy ? "hd.TrangThai = 'DA_HUY' AND hd.NgayLap >= ? AND hd.NgayLap < ?"
                : "hd.TrangThai = 'CHUA_THANH_TOAN'");
        if (daThanhToan || daHuy) {
            LocalDate d = ngay == null ? dongHo.homNay() : ngay;
            ts.add(d.atStartOfDay());
            ts.add(d.plusDays(1).atStartOfDay());
        }
        if (k != null) {
            dk.append(" AND (bn.HoTen LIKE ? OR bn.SDT LIKE ? OR lk.MaLichHen LIKE ? OR hd.MaSoHoaDon LIKE ?)");
            ts.addAll(List.of(k, k, k, k));
        }
        return tv.ds("""
                SELECT hd.MaHD, hd.MaSoHoaDon, hd.MaLK, lk.MaLichHen, lk.NgayKham, bn.HoTen, bn.NgaySinh, bn.GioiTinh, bn.SDT,
                       bs.HoTen AS BacSi, ck.TenCK, hd.NgayLap, hd.TongTien, hd.BHYTChiTra, hd.DaTamThu, hd.ConPhaiThu,
                       hd.TrangThai, hd.HinhThuc, hd.NgayThanhToan, tn.HoTen AS ThuNgan, hd.LyDoHuy
                FROM HoaDon hd JOIN LuotKham lk ON lk.MaLK = hd.MaLK JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                JOIN NhanVien bs ON bs.MaNV = lk.MaBS LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                LEFT JOIN NhanVien tn ON tn.MaNV = hd.MaThuNgan
                WHERE\s""" + dk + " ORDER BY " + (daThanhToan ? "hd.NgayThanhToan DESC" : daHuy ? "hd.NgayLap DESC" : "hd.NgayLap"),
                ts.toArray());
    }

    @Transactional(readOnly = true)
    public long soChoThanhToan() {
        return tv.dem("SELECT COUNT(*) FROM HoaDon WHERE TrangThai = 'CHUA_THANH_TOAN'");
    }

    /** Chi tiết hóa đơn: các dòng, giao dịch MoMo, thông tin phòng khám để in. maBN khác null thì phải là của bệnh nhân đó. */
    @Transactional(readOnly = true)
    public Map<String, Object> chiTiet(Integer maHD, Integer maBN) {
        Map<String, Object> hd = tv.mot("""
                SELECT hd.MaHD, hd.MaSoHoaDon, hd.MaLK, lk.MaLichHen, lk.NgayKham, lk.MaBN, lk.TrangThaiBHYT, lk.MucHuong,
                       bn.HoTen, bn.NgaySinh, bn.GioiTinh, bn.SDT, bs.HoTen AS BacSi, ck.TenCK, hd.NgayLap, hd.TongTien,
                       hd.BHYTChiTra, hd.DaTamThu, hd.ConPhaiThu, hd.TrangThai, hd.HinhThuc, hd.TienKhachDua,
                       hd.NgayThanhToan, tn.HoTen AS ThuNgan, hd.LyDoHuy, nh.HoTen AS NguoiHuy, goc.MaSoHoaDon AS MaSoHoaDonGoc,
                       (SELECT t.MaSoHoaDon FROM HoaDon t WHERE t.MaHDGoc = hd.MaHD ORDER BY t.MaHD DESC LIMIT 1) AS HoaDonThayThe
                FROM HoaDon hd JOIN LuotKham lk ON lk.MaLK = hd.MaLK JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                JOIN NhanVien bs ON bs.MaNV = lk.MaBS LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                LEFT JOIN NhanVien tn ON tn.MaNV = hd.MaThuNgan LEFT JOIN NhanVien nh ON nh.MaNV = hd.MaNguoiHuy
                LEFT JOIN HoaDon goc ON goc.MaHD = hd.MaHDGoc WHERE hd.MaHD = ?""", maHD);
        if (hd == null || (maBN != null && !maBN.equals(hd.get("MaBN")))) {
            throw new KhongTimThay("Không tìm thấy hóa đơn");
        }
        hd.put("ChiTiet", tv.ds("""
                SELECT MaCTHD, LoaiMuc, NoiDung, SoLuong, GiaDichVu, GiaBHYT, ThanhTien, BHYTChiTra, BenhNhanTra, DaTamThu
                FROM ChiTietHoaDon WHERE MaHD = ? ORDER BY FIELD(LoaiMuc, 'KHAM', 'CLS', 'THUOC'), MaCTHD""", maHD));
        hd.put("GiaoDichMoMo", tv.ds("""
                SELECT MaDonMoMo, SoTien, TrangThai, MaGiaoDichMoMo, ThongDiep, ThoiDiemTao, ThoiDiemCapNhat
                FROM GiaoDichMoMo WHERE MaHD = ? ORDER BY MaGD DESC""", maHD));
        hd.put("PhongKham", tv.mot("SELECT TenPhongKham, DiaChi, Hotline FROM ThongTinPhongKham WHERE Id = 1"));
        hd.put("MoMoThu", moMo.laMoiTruongThu());
        // Phiếu hoàn tiền liên quan: của hóa đơn này và của các biên lai tạm thu cùng lượt khám
        hd.put("PhieuHoanTien", tv.ds("""
                SELECT p.MaPHT, p.MaSoPhieu, p.LyDo, p.SoTien, p.TrangThai, p.ThoiDiemLap, p.ThoiDiemHoan,
                       COALESCE(bl.MaSoBienLai, h.MaSoHoaDon) AS MaChungTu
                FROM PhieuHoanTien p LEFT JOIN BienLaiTamThu bl ON bl.MaBL = p.MaBL LEFT JOIN HoaDon h ON h.MaHD = p.MaHD
                WHERE COALESCE(bl.MaLK, h.MaLK) = ? ORDER BY p.ThoiDiemLap DESC""", hd.get("MaLK")));
        return hd;
    }

    /** Hóa đơn của bệnh nhân (mới nhất trước). */
    @Transactional
    public List<Map<String, Object>> cuaBenhNhan(Integer maBN) {
        if (maBN == null) {
            throw new KhongTimThay("Tài khoản chưa có hồ sơ");
        }
        lapBu();
        return tv.ds("""
                SELECT hd.MaHD, hd.MaSoHoaDon, hd.MaLK, lk.MaLichHen, lk.NgayKham, bs.HoTen AS BacSi, ck.TenCK, hd.NgayLap,
                       hd.TongTien, hd.BHYTChiTra, hd.DaTamThu, hd.ConPhaiThu, hd.TrangThai, hd.HinhThuc, hd.NgayThanhToan
                FROM HoaDon hd JOIN LuotKham lk ON lk.MaLK = hd.MaLK JOIN NhanVien bs ON bs.MaNV = lk.MaBS
                LEFT JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                WHERE lk.MaBN = ? AND hd.TrangThai <> 'DA_HUY'
                ORDER BY hd.TrangThai = 'CHUA_THANH_TOAN' DESC, hd.NgayLap DESC""", maBN);
    }

    // ================= Hủy hóa đơn (UC10.5, BR26) =================

    /**
     * Quản trị viên hủy hóa đơn (kèm lý do), hệ thống lập hóa đơn thay thế từ dữ liệu lượt khám; hóa đơn hủy giữ lại
     * để đối soát. Hóa đơn đã thanh toán: thay thế được ghi đã thanh toán bằng chính khoản đã thu, phần thu thừa
     * thành đề nghị hoàn tiền (BR31); nếu thay thế lớn hơn số đã thu thì không cho hủy.
     */
    @Transactional
    public Map<String, Object> huyHoaDon(Integer maHD, String lyDo, Integer maNV, Integer maTK) {
        String ly = lyDo == null || lyDo.isBlank() ? null : lyDo.strip();
        if (ly == null) {
            throw new LoiNghiepVu("Vui lòng nhập lý do hủy hóa đơn");
        }
        if (ly.length() > 255) {
            throw new LoiNghiepVu("Lý do hủy tối đa 255 ký tự");
        }
        Map<String, Object> hd = tv.mot("""
                SELECT MaHD, MaSoHoaDon, MaLK, TrangThai, ConPhaiThu, HinhThuc, MaThuNgan, TienKhachDua FROM HoaDon
                WHERE MaHD = ? FOR UPDATE""", maHD);
        if (hd == null) {
            throw new KhongTimThay("Không tìm thấy hóa đơn");
        }
        if ("DA_HUY".equals(hd.get("TrangThai"))) {
            throw new LoiNghiepVu("Hóa đơn đã bị hủy trước đó");
        }
        boolean daThu = "DA_THANH_TOAN".equals(hd.get("TrangThai"));
        tv.capNhat("UPDATE HoaDon SET TrangThai = 'DA_HUY', LyDoHuy = ?, MaNguoiHuy = ? WHERE MaHD = ?", ly, maNV, maHD);
        Integer maMoi = lap((Integer) hd.get("MaLK"), maHD);
        Map<String, Object> moi = tv.mot("SELECT MaSoHoaDon, ConPhaiThu FROM HoaDon WHERE MaHD = ?", maMoi);
        String ghi = hd.get("MaSoHoaDon") + " → " + moi.get("MaSoHoaDon") + ": " + ly;
        if (daThu) {
            BigDecimal daThuCu = ((BigDecimal) hd.get("ConPhaiThu")).max(BigDecimal.ZERO);
            BigDecimal phaiThuMoi = ((BigDecimal) moi.get("ConPhaiThu")).max(BigDecimal.ZERO);
            if (phaiThuMoi.compareTo(daThuCu) > 0) {
                throw new LoiNghiepVu("Hóa đơn thay thế (" + tien(phaiThuMoi) + ") lớn hơn số đã thu (" + tien(daThuCu)
                        + "), không hủy được");
            }
            tv.capNhat("""
                    UPDATE HoaDon SET TrangThai = 'DA_THANH_TOAN', HinhThuc = ?, MaThuNgan = ?, TienKhachDua = ?, NgayThanhToan = ?
                    WHERE MaHD = ?""", hd.get("HinhThuc"), hd.get("MaThuNgan") != null ? hd.get("MaThuNgan") : maNV,
                    "TIEN_MAT".equals(hd.get("HinhThuc")) ? phaiThuMoi : null, dongHo.bayGio(), maMoi);
            BigDecimal thua = daThuCu.subtract(phaiThuMoi);
            if (thua.signum() > 0) {
                hoanTien.taoDeNghi(null, maHD, null, "HOA_DON_THAY_THE", "Hóa đơn thay thế " + moi.get("MaSoHoaDon"), thua, maTK);
                ghi += "; hoàn " + tien(thua);
            }
        }
        nhatKy.ghi(maTK, "HUY_HOA_DON", "HoaDon", maHD, ghi);
        return chiTiet(maMoi, null);
    }

    // ================= Thu tại quầy =================

    /** UC10.1: thu ngân thu tiền mặt / chuyển khoản phần còn phải thu (sau BHYT và tạm thu). */
    @Transactional
    public Map<String, Object> thuTaiQuay(Integer maHD, String hinhThuc, BigDecimal tienKhachDua, Integer maNV, Integer maTK) {
        if (!HINH_THUC_QUAY.contains(hinhThuc)) {
            throw new LoiNghiepVu("Hình thức thanh toán không hợp lệ");
        }
        Map<String, Object> hd = khoaHoaDonChuaThu(maHD);
        BigDecimal phaiThu = ((BigDecimal) hd.get("ConPhaiThu")).max(BigDecimal.ZERO);
        boolean tienMat = "TIEN_MAT".equals(hinhThuc);
        if (tienMat && phaiThu.signum() > 0 && (tienKhachDua == null || tienKhachDua.compareTo(phaiThu) < 0)) {
            throw new LoiNghiepVu("Tiền khách đưa chưa đủ " + tien(phaiThu));
        }
        tv.capNhat("""
                UPDATE HoaDon SET TrangThai = 'DA_THANH_TOAN', MaThuNgan = ?, HinhThuc = ?, TienKhachDua = ?, NgayThanhToan = ?
                WHERE MaHD = ?""", maNV, hinhThuc, tienMat ? (tienKhachDua == null ? phaiThu : tienKhachDua) : null,
                dongHo.bayGio(), maHD);
        nhatKy.ghi(maTK, "THANH_TOAN_HOA_DON", "HoaDon", maHD, hd.get("MaSoHoaDon") + ": " + tien(phaiThu) + ", "
                + ("TIEN_MAT".equals(hinhThuc) ? "tiền mặt" : "chuyển khoản"));
        baoDaThanhToan(hd, phaiThu, "tại quầy");
        return chiTiet(maHD, null);
    }

    // ================= Thanh toán MoMo =================

    /**
     * UC10.2: tạo lệnh thanh toán MoMo cho phần còn phải thu, trả về đường dẫn trang thanh toán của MoMo.
     * maBN khác null: bệnh nhân tự thanh toán hóa đơn của mình. Lệnh đang chờ cùng số tiền trong 10 phút thì dùng lại.
     */
    @Transactional
    public Map<String, Object> taoThanhToanMoMo(Integer maHD, Integer maBN, Integer maTK) {
        Map<String, Object> hd = khoaHoaDonChuaThu(maHD);
        if (maBN != null && !maBN.equals(hd.get("MaBN"))) {
            throw new LoiQuyen("Không phải hóa đơn của bạn");
        }
        BigDecimal phaiThu = (BigDecimal) hd.get("ConPhaiThu");
        if (phaiThu.signum() <= 0) {
            throw new LoiNghiepVu("Hóa đơn không còn khoản phải thanh toán, vui lòng xác nhận tại quầy");
        }
        if (phaiThu.longValue() < MOMO_TOI_THIEU) {
            throw new LoiNghiepVu("MoMo chỉ nhận thanh toán từ " + tien(BigDecimal.valueOf(MOMO_TOI_THIEU)));
        }
        Map<String, Object> cu = tv.mot("""
                SELECT MaDonMoMo, DuongDanThanhToan FROM GiaoDichMoMo
                WHERE MaHD = ? AND TrangThai = 'CHO_THANH_TOAN' AND SoTien = ? AND ThoiDiemTao > ?
                ORDER BY MaGD DESC LIMIT 1""", maHD, phaiThu, dongHo.bayGio().minusMinutes(10));
        if (cu != null && cu.get("DuongDanThanhToan") != null) {
            return Map.of("ma_don", cu.get("MaDonMoMo"), "pay_url", cu.get("DuongDanThanhToan"), "so_tien", phaiThu);
        }
        String maDon = "PKVB" + maHD + "-" + System.currentTimeMillis();
        Map<String, Object> kq = moMo.taoThanhToan(maDon, phaiThu.longValue(), "Thanh toán hóa đơn " + hd.get("MaSoHoaDon"),
                diaChiWeb + "/thanh-toan/momo", diaChiWeb + "/api/thanh-toan/momo/ipn");
        if (!"0".equals(String.valueOf(kq.get("resultCode"))) || kq.get("payUrl") == null) {
            log.warn("MoMo từ chối tạo lệnh {}: {}", maDon, kq);
            throw new LoiNghiepVu("MoMo từ chối tạo lệnh thanh toán: " + kq.get("message"));
        }
        tv.capNhat("""
                INSERT INTO GiaoDichMoMo (MaDonMoMo, MaHD, SoTien, DuongDanThanhToan, MaNguoiTao, ThoiDiemTao)
                VALUES (?, ?, ?, ?, ?, ?)""", maDon, maHD, phaiThu, kq.get("payUrl"), maTK, dongHo.bayGio());
        nhatKy.ghi(maTK, "TAO_THANH_TOAN_MOMO", "HoaDon", maHD, hd.get("MaSoHoaDon") + ": " + maDon + ", " + tien(phaiThu));
        return Map.of("ma_don", maDon, "pay_url", kq.get("payUrl"), "so_tien", phaiThu);
    }

    /**
     * Cập nhật trạng thái một giao dịch: hỏi thẳng MoMo (không tin kết quả từ trình duyệt), thành công thì
     * hóa đơn chuyển Đã thanh toán. maBN khác null thì giao dịch phải thuộc hóa đơn của bệnh nhân đó.
     */
    @Transactional
    public Map<String, Object> capNhatMoMo(String maDon, Integer maBN) {
        Map<String, Object> gd = tv.mot("""
                SELECT gd.MaGD, gd.MaDonMoMo, gd.MaHD, gd.SoTien, gd.TrangThai, lk.MaBN FROM GiaoDichMoMo gd
                JOIN HoaDon hd ON hd.MaHD = gd.MaHD JOIN LuotKham lk ON lk.MaLK = hd.MaLK
                WHERE gd.MaDonMoMo = ? FOR UPDATE""", maDon);
        if (gd == null || (maBN != null && !maBN.equals(gd.get("MaBN")))) {
            throw new KhongTimThay("Không tìm thấy giao dịch MoMo");
        }
        if ("CHO_THANH_TOAN".equals(gd.get("TrangThai"))) {
            Map<String, Object> kq = moMo.traCuu(maDon);
            int ma = Integer.parseInt(String.valueOf(kq.getOrDefault("resultCode", "-1")));
            String thongDiep = String.valueOf(kq.getOrDefault("message", ""));
            if (ma == 0) {
                long soTien = Long.parseLong(String.valueOf(kq.get("amount")));
                if (soTien != ((BigDecimal) gd.get("SoTien")).longValue()) {
                    throw new LoiNghiepVu("Số tiền MoMo xác nhận không khớp giao dịch, vui lòng liên hệ quầy thu ngân");
                }
                thanhCong(gd, kq.get("transId"), thongDiep);
            } else if (!List.of(1000, 7000, 7002, 9000).contains(ma)) {     // các mã còn đang xử lý
                tv.capNhat("""
                        UPDATE GiaoDichMoMo SET TrangThai = 'THAT_BAI', MaKetQua = ?, ThongDiep = ?, ThoiDiemCapNhat = ?
                        WHERE MaGD = ?""", ma, thongDiep, dongHo.bayGio(), gd.get("MaGD"));
            }
        }
        Map<String, Object> kq = tv.mot("""
                SELECT gd.MaDonMoMo, gd.MaHD, gd.SoTien, gd.TrangThai, gd.MaGiaoDichMoMo, gd.ThongDiep, hd.MaSoHoaDon,
                       hd.TrangThai AS TrangThaiHoaDon
                FROM GiaoDichMoMo gd JOIN HoaDon hd ON hd.MaHD = gd.MaHD WHERE gd.MaDonMoMo = ?""", maDon);
        return kq;
    }

    /**
     * Kết quả MoMo gửi về (trình duyệt quay lại trang phòng khám, hoặc IPN server-server): kiểm tra chữ ký rồi
     * tra cứu lại MoMo để chốt. Chữ ký sai thì bỏ qua.
     */
    @Transactional
    public Map<String, Object> xuLyKetQuaMoMo(Map<String, String> thamSo, Integer maBN) {
        if (!moMo.dungChuKy(thamSo)) {
            throw new LoiNghiepVu("Kết quả thanh toán không hợp lệ (sai chữ ký MoMo)");
        }
        return capNhatMoMo(thamSo.get("orderId"), maBN);
    }

    private void thanhCong(Map<String, Object> gd, Object transId, String thongDiep) {
        LocalDateTime bayGio = dongHo.bayGio();
        tv.capNhat("""
                UPDATE GiaoDichMoMo SET TrangThai = 'THANH_CONG', MaGiaoDichMoMo = ?, MaKetQua = 0, ThongDiep = ?,
                       ThoiDiemCapNhat = ? WHERE MaGD = ?""",
                transId == null ? null : Long.parseLong(String.valueOf(transId)), thongDiep, bayGio, gd.get("MaGD"));
        Map<String, Object> hd = tv.mot("""
                SELECT hd.MaHD, hd.MaSoHoaDon, hd.TrangThai, hd.ConPhaiThu, lk.MaBN, lk.MaLichHen FROM HoaDon hd
                JOIN LuotKham lk ON lk.MaLK = hd.MaLK WHERE hd.MaHD = ? FOR UPDATE""", gd.get("MaHD"));
        if (!"CHUA_THANH_TOAN".equals(hd.get("TrangThai"))) {
            // Đã thu bằng cách khác trong lúc chờ MoMo: ghi lại để hoàn tiền
            tv.capNhat("UPDATE GiaoDichMoMo SET ThongDiep = ? WHERE MaGD = ?",
                    "Hóa đơn đã thanh toán trước đó, cần hoàn tiền MoMo", gd.get("MaGD"));
            nhatKy.ghi(null, "MOMO_CAN_HOAN_TIEN", "HoaDon", hd.get("MaHD"), hd.get("MaSoHoaDon") + ": " + gd.get("MaDonMoMo"));
            return;
        }
        tv.capNhat("""
                UPDATE HoaDon SET TrangThai = 'DA_THANH_TOAN', HinhThuc = 'MOMO', NgayThanhToan = ?, MaThuNgan = NULL,
                       TienKhachDua = NULL WHERE MaHD = ?""", bayGio, hd.get("MaHD"));
        nhatKy.ghi(null, "THANH_TOAN_MOMO", "HoaDon", hd.get("MaHD"), hd.get("MaSoHoaDon") + ": " + gd.get("MaDonMoMo")
                + ", mã MoMo " + transId + ", " + tien((BigDecimal) gd.get("SoTien")));
        baoDaThanhToan(hd, (BigDecimal) gd.get("SoTien"), "qua MoMo");
    }

    private Map<String, Object> khoaHoaDonChuaThu(Integer maHD) {
        Map<String, Object> hd = tv.mot("""
                SELECT hd.MaHD, hd.MaSoHoaDon, hd.TrangThai, hd.ConPhaiThu, lk.MaBN, lk.MaLichHen FROM HoaDon hd
                JOIN LuotKham lk ON lk.MaLK = hd.MaLK WHERE hd.MaHD = ? FOR UPDATE""", maHD);
        if (hd == null) {
            throw new KhongTimThay("Không tìm thấy hóa đơn");
        }
        if (!"CHUA_THANH_TOAN".equals(hd.get("TrangThai"))) {
            throw new LoiNghiepVu("Hóa đơn đã thanh toán hoặc đã hủy");
        }
        return hd;
    }

    private void baoDaThanhToan(Map<String, Object> hd, BigDecimal soTien, String cach) {
        thongBao.benhNhan((Integer) hd.get("MaBN"), "HOA_DON", "Đã thanh toán hóa đơn " + hd.get("MaSoHoaDon"),
                "Phòng khám đã nhận " + tien(soTien) + " " + cach + " cho lượt khám " + hd.get("MaLichHen")
                        + ". Cảm ơn bạn!", "HOA_DON", (Integer) hd.get("MaHD"), false);
    }

    private static String tien(BigDecimal so) {
        return String.format("%,d", so.longValue()).replace(',', '.') + " đ";
    }
}
