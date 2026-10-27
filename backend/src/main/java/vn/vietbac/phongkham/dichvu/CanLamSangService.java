package vn.vietbac.phongkham.dichvu;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import tools.jackson.databind.ObjectMapper;
import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LoiQuyen;
import vn.vietbac.phongkham.chung.LuuAnh;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Gói 14 – cận lâm sàng: hàng chờ của phòng (UC14.1, BR11), gọi và thực hiện, hoãn khi bệnh nhân chưa sẵn sàng,
 * trả kết quả xét nghiệm / chẩn đoán hình ảnh / nội soi (UC14.4, 14.5, 14.9), điều chỉnh kết quả giữ phiên bản cũ
 * (UC14.7). Lượt khám có đủ kết quả thì quay lại đầu hàng chờ của bác sĩ điều trị.
 */
@Service
public class CanLamSangService {

    public static final List<String> PHIEU_CHUA_XONG = List.of("CHO_THANH_TOAN", "CHO_THUC_HIEN", "DANG_THUC_HIEN");
    private static final long TEP_TOI_DA = 10L * 1024 * 1024;
    private static final int SO_TEP_TOI_DA = 10;

    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final TiepDonService tiepDon;
    private final LuuAnh luuAnh;
    private final TruyVan tv;
    private final DongHo dongHo;
    private final ObjectMapper json;

    public CanLamSangService(ThongBaoService thongBao, NhatKyService nhatKy, TiepDonService tiepDon, LuuAnh luuAnh, TruyVan tv, DongHo dongHo, ObjectMapper json) {
        this.thongBao = thongBao;
        this.nhatKy = nhatKy;
        this.tiepDon = tiepDon;
        this.luuAnh = luuAnh;
        this.tv = tv;
        this.dongHo = dongHo;
        this.json = json;
    }

    public record ChiSoNhap(Integer maChiSo, BigDecimal giaTri) {
    }

    public record KetQuaNhap(String moTa, String ketLuan, String nhanXet, List<ChiSoNhap> chiSo, Boolean daNhinAn,
                             Boolean daKyDongY, Boolean coSinhThiet, Integer soMauSinhThiet, String viTriSinhThiet) {
    }

    // ================= Hàng chờ =================

    /** BR11: bác sĩ cận lâm sàng chỉ làm việc với phòng được phân công. */
    @Transactional(readOnly = true)
    public Map<String, Object> phongPhuTrach(Integer maNV) {
        Map<String, Object> p = maNV == null ? null : tv.mot("""
                SELECT ph.MaPhong, ph.MaSoPhong, ph.TenPhong, ph.LoaiPhong FROM NhanVien nv
                JOIN Phong ph ON ph.MaPhong = nv.MaPhongPhuTrach WHERE nv.MaNV = ?""", maNV);
        if (p == null) {
            throw new LoiQuyen("Tài khoản chưa được phân công phòng cận lâm sàng");
        }
        return p;
    }

    /**
     * Hàng chờ hôm nay của phòng: người đang thực hiện đứng đầu, sau đó các phiếu vào hàng chờ trong ngày (sau tạm thu
     * hoặc sau khi hoãn) theo thời điểm vào hàng.
     * CanLamTruoc liệt kê dịch vụ cùng lượt phải xong trước (BR18), VD đường huyết trước nội soi.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> hangCho(Integer maNV) {
        Map<String, Object> phong = phongPhuTrach(maNV);
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("Phong", phong);
        kq.put("DangCho", tv.ds("""
                SELECT p.MaPCD, p.MaLK, p.TrangThai, p.ThoiDiemVaoHangCho, p.ThoiDiemBatDau, p.SoLanBoQua, p.GhiChu,
                       p.YeuCau, p.ChanDoanSoBo, dv.TenDV, dv.LoaiDV, dv.YeuCauNhinAn, dv.ThoiGianThucHien,
                       lk.MaLichHen, bn.HoTen, bn.NgaySinh, bn.GioiTinh, bs.HoTen AS BacSiChiDinh,
                       th.HoTen AS BacSiThucHien,
                       (SELECT GROUP_CONCAT(dv2.TenDV ORDER BY dv2.TenDV SEPARATOR ', ')
                        FROM RangBuocDichVu rb JOIN PhieuChiDinh p2 ON p2.MaLK = p.MaLK AND p2.MaDV = rb.MaDVTruoc
                        JOIN DichVu dv2 ON dv2.MaDV = p2.MaDV
                        WHERE rb.MaDV = p.MaDV AND p2.TrangThai IN (?)) AS CanLamTruoc
                FROM PhieuChiDinh p JOIN DichVu dv ON dv.MaDV = p.MaDV JOIN LuotKham lk ON lk.MaLK = p.MaLK
                JOIN BenhNhan bn ON bn.MaBN = lk.MaBN JOIN NhanVien bs ON bs.MaNV = p.MaBSChiDinh
                LEFT JOIN NhanVien th ON th.MaNV = p.MaBSThucHien
                WHERE p.MaPhong = ? AND (p.TrangThai = 'DANG_THUC_HIEN'
                      OR (p.TrangThai = 'CHO_THUC_HIEN' AND p.ThoiDiemVaoHangCho >= ?))
                ORDER BY p.TrangThai = 'DANG_THUC_HIEN' DESC, p.ThoiDiemVaoHangCho, p.MaPCD""",
                PHIEU_CHUA_XONG, phong.get("MaPhong"), dongHo.homNay().atStartOfDay()));
        kq.put("DaXong", tv.ds("""
                SELECT p.MaPCD, p.MaLK, p.TrangThai, p.ThoiDiemCoKetQua, dv.TenDV, dv.LoaiDV, lk.MaLichHen,
                       lk.TrangThai AS TrangThaiLuot, bn.HoTen, bn.NgaySinh, bn.GioiTinh, kq.KetLuan, kq.NhanXet,
                       kq.PhienBan, th.HoTen AS BacSiThucHien
                FROM PhieuChiDinh p JOIN DichVu dv ON dv.MaDV = p.MaDV JOIN LuotKham lk ON lk.MaLK = p.MaLK
                JOIN BenhNhan bn ON bn.MaBN = lk.MaBN JOIN KetQuaCLS kq ON kq.MaPCD = p.MaPCD
                LEFT JOIN NhanVien th ON th.MaNV = kq.MaBSThucHien
                WHERE p.MaPhong = ? AND p.TrangThai = 'CO_KET_QUA' AND p.ThoiDiemCoKetQua >= ?
                ORDER BY p.ThoiDiemCoKetQua DESC""", phong.get("MaPhong"), dongHo.homNay().atStartOfDay()));
        return kq;
    }

    /** Số phiếu đang chờ của phòng, hiện trên menu. */
    @Transactional(readOnly = true)
    public long soCho(Integer maNV) {
        Map<String, Object> phong = phongPhuTrach(maNV);
        return tv.dem("""
                SELECT COUNT(*) FROM PhieuChiDinh
                WHERE MaPhong = ? AND TrangThai = 'CHO_THUC_HIEN' AND ThoiDiemVaoHangCho >= ?""",
                phong.get("MaPhong"), dongHo.homNay().atStartOfDay());
    }

    /** Một phiếu kèm mẫu kết quả, chỉ số cần nhập, kết quả đã trả, tệp đính kèm và các phiên bản cũ. */
    @Transactional(readOnly = true)
    public Map<String, Object> chiTiet(Integer maPCD, Integer maNV) {
        Map<String, Object> p = phieuCuaPhong(maPCD, maNV, false);
        p.put("BenhNhan", tv.mot("""
                SELECT bn.MaBN, bn.HoTen, bn.NgaySinh, bn.GioiTinh, bn.SDT, bn.DiUng FROM LuotKham lk
                JOIN BenhNhan bn ON bn.MaBN = lk.MaBN WHERE lk.MaLK = ?""", p.get("MaLK")));
        p.put("MauChiSo", tv.ds("""
                SELECT MaChiSo, TenChiSo, DonVi, GioiHanDuoi, GioiHanTren, BatBuoc FROM MauChiSo
                WHERE MaDV = ? AND TrangThai = 'HOAT_DONG' ORDER BY ThuTu, MaChiSo""", p.get("MaDV")));
        Map<String, Object> kq = tv.mot("""
                SELECT kq.MaKQ, kq.MoTa, kq.KetLuan, kq.NhanXet, kq.DaNhinAn, kq.DaKyDongY, kq.CoSinhThiet,
                       kq.SoMauSinhThiet, kq.ViTriSinhThiet, kq.PhienBan, kq.ThoiGianTra, kq.NgayCapNhat,
                       th.HoTen AS BacSiThucHien
                FROM KetQuaCLS kq JOIN NhanVien th ON th.MaNV = kq.MaBSThucHien WHERE kq.MaPCD = ?""", maPCD);
        if (kq != null) {
            Integer maKQ = (Integer) kq.get("MaKQ");
            kq.put("ChiSo", chiSoCuaKetQua(maKQ));
            kq.put("Tep", tepCuaKetQua(maKQ));
            kq.put("LichSu", tv.ds("""
                    SELECT ls.PhienBan, ls.NoiDungCu, ls.LyDoDieuChinh, ls.ThoiGian, nv.HoTen AS NguoiSua
                    FROM LichSuKetQua ls JOIN NhanVien nv ON nv.MaNV = ls.MaNguoiSua
                    WHERE ls.MaKQ = ? ORDER BY ls.PhienBan DESC""", maKQ));
        }
        p.put("KetQua", kq);
        return p;
    }

    // ================= Thực hiện =================

    /** Gọi bệnh nhân vào phòng: phiếu chuyển Đang thực hiện, ghi bác sĩ thực hiện. */
    @Transactional
    public void batDau(Integer maPCD, Integer maNV, Integer maTK) {
        Map<String, Object> p = phieuCuaPhong(maPCD, maNV, true);
        if (!"CHO_THUC_HIEN".equals(p.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ bắt đầu được phiếu đang chờ thực hiện");
        }
        if (p.get("CanLamTruoc") != null) {
            throw new LoiNghiepVu("Cần thực hiện " + p.get("CanLamTruoc") + " trước " + p.get("TenDV"));     // BR18
        }
        tv.capNhat("""
                UPDATE PhieuChiDinh SET TrangThai = 'DANG_THUC_HIEN', MaBSThucHien = ?, ThoiDiemBatDau = ?
                WHERE MaPCD = ?""", maNV, dongHo.bayGio(), maPCD);
        thongBao.benhNhan((Integer) p.get("MaBN"), "LO_TRINH_CLS", "Mời vào phòng " + p.get("MaSoPhong"),
                "Mời bạn vào phòng " + p.get("MaSoPhong") + " để thực hiện " + p.get("TenDV") + ".",
                "LUOT_KHAM", (Integer) p.get("MaLK"), false);
        nhatKy.ghi(maTK, "BAT_DAU_CLS", "PhieuChiDinh", maPCD, p.get("MaLichHen") + ": " + p.get("TenDV"));
    }

    /**
     * Hoãn phiếu (bệnh nhân vắng khi gọi, chưa nhịn ăn, chưa ký cam kết...): về cuối hàng chờ của phòng,
     * ghi lý do để bác sĩ điều trị thấy.
     */
    @Transactional
    public void hoanLai(Integer maPCD, Integer maNV, String lyDo, Integer maTK) {
        Map<String, Object> p = phieuCuaPhong(maPCD, maNV, true);
        if (!"CHO_THUC_HIEN".equals(p.get("TrangThai")) && !"DANG_THUC_HIEN".equals(p.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ hoãn được phiếu chưa có kết quả");
        }
        String ly = rong(lyDo);
        if (ly == null) {
            throw new LoiNghiepVu("Vui lòng nhập lý do hoãn");
        }
        if (ly.length() > 255) {
            throw new LoiNghiepVu("Lý do hoãn tối đa 255 ký tự");
        }
        tv.capNhat("""
                UPDATE PhieuChiDinh SET TrangThai = 'CHO_THUC_HIEN', ThoiDiemVaoHangCho = ?, SoLanBoQua = SoLanBoQua + 1,
                       GhiChu = ?, MaBSThucHien = NULL, ThoiDiemBatDau = NULL
                WHERE MaPCD = ?""", dongHo.bayGio(), ly, maPCD);
        thongBao.benhNhan((Integer) p.get("MaBN"), "LO_TRINH_CLS", "Hoãn " + p.get("TenDV"),
                p.get("TenDV") + " tại phòng " + p.get("MaSoPhong") + " được hoãn: " + ly
                        + ". Bạn được xếp lại cuối hàng chờ của phòng.", "LUOT_KHAM", (Integer) p.get("MaLK"), false);
        nhatKy.ghi(maTK, "HOAN_CLS", "PhieuChiDinh", maPCD, p.get("MaLichHen") + ": " + p.get("TenDV") + " - " + ly);
    }

    /** Trả kết quả lần đầu: phiếu Có kết quả; đủ kết quả thì bệnh nhân quay lại bác sĩ điều trị. */
    @Transactional
    public Integer traKetQua(Integer maPCD, Integer maNV, KetQuaNhap b, Integer maTK) {
        Map<String, Object> p = phieuCuaPhong(maPCD, maNV, true);
        if (!"DANG_THUC_HIEN".equals(p.get("TrangThai"))) {
            throw new LoiNghiepVu("Chỉ trả kết quả cho phiếu đang thực hiện");
        }
        List<Object[]> chiSo = kiemTraKetQua(p, b);
        LocalDateTime bayGio = dongHo.bayGio();
        tv.capNhat("""
                INSERT INTO KetQuaCLS (MaPCD, MaBSThucHien, MoTa, KetLuan, NhanXet, DaNhinAn, DaKyDongY, CoSinhThiet,
                       SoMauSinhThiet, ViTriSinhThiet, ThoiGianTra)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                maPCD, maNV, rong(b.moTa()), rong(b.ketLuan()), rong(b.nhanXet()), b.daNhinAn(), b.daKyDongY(),
                b.coSinhThiet(), Boolean.TRUE.equals(b.coSinhThiet()) ? b.soMauSinhThiet() : null,
                Boolean.TRUE.equals(b.coSinhThiet()) ? rong(b.viTriSinhThiet()) : null, bayGio);
        Integer maKQ = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        ghiChiSo(maKQ, chiSo);
        tv.capNhat("""
                UPDATE PhieuChiDinh SET TrangThai = 'CO_KET_QUA', ThoiDiemCoKetQua = ?,
                       MaBSThucHien = COALESCE(MaBSThucHien, ?) WHERE MaPCD = ?""", bayGio, maNV, maPCD);
        nhatKy.ghi(maTK, "TRA_KET_QUA_CLS", "PhieuChiDinh", maPCD, p.get("MaLichHen") + ": " + p.get("TenDV"));
        sauKhiCoKetQua((Integer) p.get("MaLK"));
        return maKQ;
    }

    /** UC14.7: điều chỉnh kết quả khi lượt khám chưa hoàn tất; phiên bản cũ lưu vào LichSuKetQua. */
    @Transactional
    public void capNhatKetQua(Integer maPCD, Integer maNV, KetQuaNhap b, String lyDo, Integer maTK) {
        Map<String, Object> p = phieuCuaPhong(maPCD, maNV, true);
        if (!"CO_KET_QUA".equals(p.get("TrangThai"))) {
            throw new LoiNghiepVu("Phiếu chưa có kết quả để điều chỉnh");
        }
        if ("HOAN_THANH".equals(p.get("TrangThaiLuot"))) {
            throw new LoiNghiepVu("Lượt khám đã hoàn tất, không được điều chỉnh kết quả");
        }
        String ly = rong(lyDo);
        if (ly == null) {
            throw new LoiNghiepVu("Vui lòng nhập lý do điều chỉnh");
        }
        if (ly.length() > 255) {
            throw new LoiNghiepVu("Lý do điều chỉnh tối đa 255 ký tự");
        }
        List<Object[]> chiSo = kiemTraKetQua(p, b);
        Map<String, Object> cu = tv.mot("""
                SELECT MaKQ, MaBSThucHien, MoTa, KetLuan, NhanXet, DaNhinAn, DaKyDongY, CoSinhThiet, SoMauSinhThiet,
                       ViTriSinhThiet, PhienBan, ThoiGianTra, NgayCapNhat
                FROM KetQuaCLS WHERE MaPCD = ? FOR UPDATE""", maPCD);
        Integer maKQ = (Integer) cu.get("MaKQ");
        cu.put("ChiSo", chiSoCuaKetQua(maKQ));
        LocalDateTime bayGio = dongHo.bayGio();
        tv.capNhat("""
                INSERT INTO LichSuKetQua (MaKQ, PhienBan, NoiDungCu, LyDoDieuChinh, MaNguoiSua, ThoiGian)
                VALUES (?, ?, ?, ?, ?, ?)""", maKQ, cu.get("PhienBan"), json.writeValueAsString(cu), ly, maNV, bayGio);
        tv.capNhat("""
                UPDATE KetQuaCLS SET MoTa = ?, KetLuan = ?, NhanXet = ?, DaNhinAn = ?, DaKyDongY = ?, CoSinhThiet = ?,
                       SoMauSinhThiet = ?, ViTriSinhThiet = ?, PhienBan = PhienBan + 1, NgayCapNhat = ?
                WHERE MaKQ = ?""",
                rong(b.moTa()), rong(b.ketLuan()), rong(b.nhanXet()), b.daNhinAn(), b.daKyDongY(), b.coSinhThiet(),
                Boolean.TRUE.equals(b.coSinhThiet()) ? b.soMauSinhThiet() : null,
                Boolean.TRUE.equals(b.coSinhThiet()) ? rong(b.viTriSinhThiet()) : null, bayGio, maKQ);
        tv.capNhat("DELETE FROM KetQuaChiSo WHERE MaKQ = ?", maKQ);
        ghiChiSo(maKQ, chiSo);
        nhatKy.ghi(maTK, "DIEU_CHINH_KET_QUA_CLS", "KetQuaCLS", maKQ,
                p.get("MaLichHen") + ": " + p.get("TenDV") + " - " + ly);
        thongBao.nhanVien((Integer) p.get("MaBSDieuTri"), "KET_QUA_CLS", "Kết quả cận lâm sàng được điều chỉnh",
                p.get("TenDV") + " của bệnh nhân " + p.get("HoTen") + " đã được điều chỉnh: " + ly,
                "LUOT_KHAM", (Integer) p.get("MaLK"));
    }

    // ================= Tệp đính kèm (ảnh phim, ảnh nội soi, PDF máy xét nghiệm) =================

    @Transactional
    public Map<String, Object> themTep(Integer maPCD, Integer maNV, MultipartFile tep, String moTa, Integer maTK) {
        Map<String, Object> p = phieuCuaPhong(maPCD, maNV, true);
        Integer maKQ = tv.giaTri("SELECT MaKQ FROM KetQuaCLS WHERE MaPCD = ?", maPCD);
        if (maKQ == null) {
            throw new LoiNghiepVu("Trả kết quả trước rồi mới đính kèm tệp");
        }
        if ("HOAN_THANH".equals(p.get("TrangThaiLuot"))) {
            throw new LoiNghiepVu("Lượt khám đã hoàn tất, không được thêm tệp");
        }
        if (tv.dem("SELECT COUNT(*) FROM TepDinhKem WHERE MaKQ = ?", maKQ) >= SO_TEP_TOI_DA) {
            throw new LoiNghiepVu("Mỗi kết quả tối đa " + SO_TEP_TOI_DA + " tệp");
        }
        String mt = rong(moTa);
        if (mt != null && mt.length() > 255) {
            throw new LoiNghiepVu("Mô tả tệp tối đa 255 ký tự");
        }
        String duongDan = luuAnh.luu(tep, "ket-qua-cls", "pcd" + maPCD, TEP_TOI_DA, Set.of("jpg", "png", "pdf"));
        String ten = tep.getOriginalFilename() == null || tep.getOriginalFilename().isBlank()
                ? duongDan.substring(duongDan.lastIndexOf('/') + 1) : tep.getOriginalFilename().strip();
        tv.capNhat("""
                INSERT INTO TepDinhKem (DuongDan, TenTep, LoaiTep, KichThuoc, MoTa, MaKQ, MaNguoiTaiLen, ThoiGian)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                duongDan, ten.length() > 255 ? ten.substring(ten.length() - 255) : ten,
                duongDan.substring(duongDan.lastIndexOf('.') + 1).toUpperCase(Locale.ROOT), tep.getSize(), mt, maKQ, maTK,
                dongHo.bayGio());
        Integer maTep = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        nhatKy.ghi(maTK, "THEM_TEP_CLS", "TepDinhKem", maTep, p.get("MaLichHen") + ": " + p.get("TenDV") + " - " + ten);
        return tv.mot("SELECT MaTep, DuongDan, TenTep, LoaiTep, KichThuoc, MoTa FROM TepDinhKem WHERE MaTep = ?", maTep);
    }

    @Transactional
    public void xoaTep(Integer maTep, Integer maNV, Integer maTK) {
        Map<String, Object> t = tv.mot("""
                SELECT t.MaTep, t.DuongDan, t.TenTep, k.MaPCD FROM TepDinhKem t JOIN KetQuaCLS k ON k.MaKQ = t.MaKQ
                WHERE t.MaTep = ?""", maTep);
        if (t == null) {
            throw new KhongTimThay("Không tìm thấy tệp");
        }
        Map<String, Object> p = phieuCuaPhong((Integer) t.get("MaPCD"), maNV, true);
        if ("HOAN_THANH".equals(p.get("TrangThaiLuot"))) {
            throw new LoiNghiepVu("Lượt khám đã hoàn tất, không được xóa tệp");
        }
        tv.capNhat("DELETE FROM TepDinhKem WHERE MaTep = ?", maTep);
        luuAnh.xoa((String) t.get("DuongDan"));
        nhatKy.ghi(maTK, "XOA_TEP_CLS", "TepDinhKem", maTep, p.get("MaLichHen") + ": " + p.get("TenDV") + " - "
                + t.get("TenTep"));
    }

    // ================= Lượt khám sau cận lâm sàng =================

    /**
     * Gọi sau khi một phiếu có kết quả hoặc bị hủy. Còn phiếu chưa xong thì nhắc bệnh nhân phòng tiếp theo;
     * hết thì lượt khám chuyển Đã có kết quả và đứng đầu hàng chờ của bác sĩ điều trị, sau những người
     * đã quay lại trước đó.
     */
    @Transactional
    public void sauKhiCoKetQua(Integer maLK) {
        Map<String, Object> lk = tv.mot("""
                SELECT lk.MaLK, lk.MaLichHen, lk.MaBN, lk.MaBS, lk.NgayKham, lk.TrangThai, bn.HoTen, p.MaSoPhong
                FROM LuotKham lk JOIN BenhNhan bn ON bn.MaBN = lk.MaBN JOIN KhungGio kg ON kg.MaKG = lk.MaKG
                JOIN CaLamViec ca ON ca.MaCa = kg.MaCa JOIN Phong p ON p.MaPhong = ca.MaPhong
                WHERE lk.MaLK = ? FOR UPDATE""", maLK);
        if (lk == null || !"CHO_CLS".equals(lk.get("TrangThai"))) {
            return;
        }
        List<Map<String, Object>> conLai = tv.ds("""
                SELECT dv.TenDV, ph.MaSoPhong, p.TrangThai FROM PhieuChiDinh p JOIN DichVu dv ON dv.MaDV = p.MaDV
                JOIN Phong ph ON ph.MaPhong = p.MaPhong
                WHERE p.MaLK = ? AND p.TrangThai IN (?) ORDER BY p.ThuTuGoiY, p.MaPCD""", maLK, PHIEU_CHUA_XONG);
        Integer maBN = (Integer) lk.get("MaBN");
        if (!conLai.isEmpty()) {
            String tiep = conLai.stream().filter(p -> !"CHO_THANH_TOAN".equals(p.get("TrangThai")))
                    .map(p -> p.get("MaSoPhong") + " (" + p.get("TenDV") + ")").collect(Collectors.joining(", "));
            if (!tiep.isEmpty()) {
                thongBao.benhNhan(maBN, "LO_TRINH_CLS", "Tiếp tục cận lâm sàng",
                        "Mời bạn tiếp tục đến phòng: " + tiep + ".", "LUOT_KHAM", maLK, false);
            }
            return;
        }
        Integer maBS = (Integer) lk.get("MaBS");
        Object ngay = lk.get("NgayKham");
        BigDecimal dauHang = tv.giaTri("""
                SELECT MIN(ThuTuHangCho) FROM LuotKham
                WHERE MaBS = ? AND NgayKham = ? AND TrangThai = 'DA_CHECK_IN' AND MaLK <> ?""", maBS, ngay, maLK);
        BigDecimal quayLaiTruoc = dauHang == null
                ? tv.giaTri("""
                        SELECT MAX(ThuTuHangCho) FROM LuotKham
                        WHERE MaBS = ? AND NgayKham = ? AND TrangThai = 'DA_CO_KET_QUA' AND MaLK <> ?""",
                        maBS, ngay, maLK)
                : tv.giaTri("""
                        SELECT MAX(ThuTuHangCho) FROM LuotKham
                        WHERE MaBS = ? AND NgayKham = ? AND TrangThai = 'DA_CO_KET_QUA' AND MaLK <> ?
                          AND ThuTuHangCho < ?""", maBS, ngay, maLK, dauHang);
        BigDecimal viTri;
        if (quayLaiTruoc != null) {
            viTri = quayLaiTruoc.add(new BigDecimal("0.001"));
        } else if (dauHang != null) {
            viTri = dauHang.subtract(BigDecimal.ONE);
        } else {
            BigDecimal cuoi = tv.giaTri("SELECT MAX(ThuTuHangCho) FROM LuotKham WHERE MaBS = ? AND NgayKham = ?",
                    maBS, ngay);
            viTri = (cuoi == null ? BigDecimal.ZERO : cuoi).add(BigDecimal.ONE);
        }
        tv.capNhat("""
                UPDATE LuotKham SET TrangThai = 'DA_CO_KET_QUA', ThuTuHangCho = ?, DaThongBaoSapDenLuot = FALSE
                WHERE MaLK = ?""", viTri, maLK);
        thongBao.benhNhan(maBN, "KET_QUA_CLS", "Đã có đủ kết quả cận lâm sàng",
                "Mời bạn quay lại phòng " + lk.get("MaSoPhong") + " để bác sĩ đọc kết quả.", "LUOT_KHAM", maLK, false);
        thongBao.nhanVien(maBS, "KET_QUA_CLS", "Bệnh nhân đã có đủ kết quả",
                lk.get("HoTen") + " (" + lk.get("MaLichHen") + ") đã có đủ kết quả cận lâm sàng và quay lại hàng chờ.",
                "LUOT_KHAM", maLK);
        tiepDon.capNhatThoiGianCho(maBS);
    }

    // ================= Dùng chung =================

    /**
     * Kiểm tra nội dung kết quả theo loại dịch vụ, trả về danh sách [MaChiSo, GiaTri, DanhGia] cần ghi.
     * Xét nghiệm: nhập đủ chỉ số bắt buộc, đánh giá cao/thấp theo khoảng tham chiếu. CĐHA, nội soi: có kết luận.
     */
    private List<Object[]> kiemTraKetQua(Map<String, Object> p, KetQuaNhap b) {
        if (b == null) {
            throw new LoiNghiepVu("Vui lòng nhập kết quả");
        }
        String loai = (String) p.get("LoaiDV");
        List<Map<String, Object>> mau = tv.ds("""
                SELECT MaChiSo, TenChiSo, GioiHanDuoi, GioiHanTren, BatBuoc FROM MauChiSo
                WHERE MaDV = ? AND TrangThai = 'HOAT_DONG' ORDER BY ThuTu""", p.get("MaDV"));
        Map<Integer, Map<String, Object>> theoMa = new HashMap<>();
        mau.forEach(m -> theoMa.put((Integer) m.get("MaChiSo"), m));
        List<Object[]> kq = new ArrayList<>();
        Set<Integer> daNhap = new HashSet<>();
        for (ChiSoNhap c : b.chiSo() == null ? List.<ChiSoNhap>of() : b.chiSo()) {
            if (c.maChiSo() == null || c.giaTri() == null) {
                continue;
            }
            Map<String, Object> m = theoMa.get(c.maChiSo());
            if (m == null) {
                throw new LoiNghiepVu("Chỉ số không thuộc mẫu của " + p.get("TenDV"));
            }
            if (!daNhap.add(c.maChiSo())) {
                throw new LoiNghiepVu("Mỗi chỉ số chỉ nhập một lần");
            }
            if (c.giaTri().abs().compareTo(new BigDecimal("9999999")) >= 0) {
                throw new LoiNghiepVu("Giá trị " + m.get("TenChiSo") + " quá lớn");
            }
            BigDecimal duoi = (BigDecimal) m.get("GioiHanDuoi");
            BigDecimal tren = (BigDecimal) m.get("GioiHanTren");
            String danhGia = duoi != null && c.giaTri().compareTo(duoi) < 0 ? "THAP"
                    : tren != null && c.giaTri().compareTo(tren) > 0 ? "CAO" : "BINH_THUONG";
            kq.add(new Object[] {c.maChiSo(), c.giaTri(), danhGia});
        }
        for (Map<String, Object> m : mau) {
            if (dung(m.get("BatBuoc")) && !daNhap.contains((Integer) m.get("MaChiSo"))) {
                throw new LoiNghiepVu("Vui lòng nhập chỉ số " + m.get("TenChiSo"));
            }
        }
        if ("XET_NGHIEM".equals(loai)) {
            if (kq.isEmpty() && rong(b.nhanXet()) == null && rong(b.ketLuan()) == null) {
                throw new LoiNghiepVu("Vui lòng nhập chỉ số hoặc nhận xét kết quả");
            }
        } else if (rong(b.ketLuan()) == null) {
            throw new LoiNghiepVu("Vui lòng nhập kết luận");
        }
        if ("NOI_SOI".equals(loai)) {
            if (dung(p.get("YeuCauNhinAn")) && Boolean.FALSE.equals(b.daNhinAn())) {
                throw new LoiNghiepVu("Bệnh nhân chưa nhịn ăn: hãy hoãn phiếu thay vì trả kết quả");
            }
            if (!Boolean.TRUE.equals(b.daKyDongY())) {
                throw new LoiNghiepVu("Bệnh nhân phải ký cam kết đồng ý trước khi nội soi");
            }
            if (Boolean.TRUE.equals(b.coSinhThiet())) {
                if (b.soMauSinhThiet() == null || b.soMauSinhThiet() < 1 || b.soMauSinhThiet() > 20) {
                    throw new LoiNghiepVu("Số mẫu sinh thiết từ 1 đến 20");
                }
                if (rong(b.viTriSinhThiet()) == null) {
                    throw new LoiNghiepVu("Vui lòng ghi vị trí sinh thiết");
                }
            }
        }
        return kq;
    }

    private void ghiChiSo(Integer maKQ, List<Object[]> chiSo) {
        for (Object[] c : chiSo) {
            tv.capNhat("INSERT INTO KetQuaChiSo (MaKQ, MaChiSo, GiaTri, DanhGia) VALUES (?, ?, ?, ?)",
                    maKQ, c[0], c[1], c[2]);
        }
    }

    private List<Map<String, Object>> chiSoCuaKetQua(Integer maKQ) {
        return tv.ds("""
                SELECT k.MaChiSo, ms.TenChiSo, ms.DonVi, ms.GioiHanDuoi, ms.GioiHanTren, k.GiaTri, k.DanhGia
                FROM KetQuaChiSo k JOIN MauChiSo ms ON ms.MaChiSo = k.MaChiSo
                WHERE k.MaKQ = ? ORDER BY ms.ThuTu, ms.MaChiSo""", maKQ);
    }

    public List<Map<String, Object>> tepCuaKetQua(Integer maKQ) {
        return tv.ds("""
                SELECT MaTep, DuongDan, TenTep, LoaiTep, KichThuoc, MoTa, ThoiGian FROM TepDinhKem
                WHERE MaKQ = ? ORDER BY ThoiGian, MaTep""", maKQ);
    }

    /** Phiếu phải thuộc phòng bác sĩ phụ trách (BR11); khoa = true thì khóa dòng để đổi trạng thái an toàn. */
    private Map<String, Object> phieuCuaPhong(Integer maPCD, Integer maNV, boolean khoa) {
        Map<String, Object> phong = phongPhuTrach(maNV);
        Map<String, Object> p = tv.mot("""
                SELECT p.MaPCD, p.MaLK, p.MaDV, p.MaPhong, p.TrangThai, p.YeuCau, p.ChanDoanSoBo, p.GhiChu,
                       p.SoLanBoQua, p.ThoiDiemVaoHangCho, p.ThoiDiemBatDau, p.ThoiDiemCoKetQua, dv.TenDV, dv.LoaiDV,
                       dv.MauKetQua, dv.YeuCauNhinAn, ph.MaSoPhong, ph.TenPhong, lk.MaLichHen, lk.MaBN,
                       lk.MaBS AS MaBSDieuTri, lk.TrangThai AS TrangThaiLuot, bn.HoTen, bs.HoTen AS BacSiChiDinh,
                       (SELECT GROUP_CONCAT(dv2.TenDV ORDER BY dv2.TenDV SEPARATOR ', ')
                        FROM RangBuocDichVu rb JOIN PhieuChiDinh p2 ON p2.MaLK = p.MaLK AND p2.MaDV = rb.MaDVTruoc
                        JOIN DichVu dv2 ON dv2.MaDV = p2.MaDV
                        WHERE rb.MaDV = p.MaDV AND p2.TrangThai IN (?)) AS CanLamTruoc
                FROM PhieuChiDinh p JOIN DichVu dv ON dv.MaDV = p.MaDV JOIN Phong ph ON ph.MaPhong = p.MaPhong
                JOIN LuotKham lk ON lk.MaLK = p.MaLK JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                JOIN NhanVien bs ON bs.MaNV = p.MaBSChiDinh
                WHERE p.MaPCD = ?""" + (khoa ? " FOR UPDATE" : ""), PHIEU_CHUA_XONG, maPCD);
        if (p == null) {
            throw new KhongTimThay("Không tìm thấy phiếu chỉ định");
        }
        if (!phong.get("MaPhong").equals(p.get("MaPhong"))) {
            throw new LoiQuyen("Phiếu thuộc phòng " + p.get("MaSoPhong") + ", không phải phòng bạn phụ trách");
        }
        return p;
    }

    private static String rong(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    /** Cột BOOLEAN của MySQL có thể về dạng Boolean hoặc số 0/1. */
    private static boolean dung(Object o) {
        return Boolean.TRUE.equals(o) || (o instanceof Number n && n.intValue() != 0);
    }
}
