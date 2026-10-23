package vn.vietbac.phongkham.dichvu;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.kho.DangKyChoRepository;
import vn.vietbac.phongkham.kho.KhungGioRepository;
import vn.vietbac.phongkham.kho.LuotKhamRepository;
import vn.vietbac.phongkham.thucthe.DangKyCho;
import vn.vietbac.phongkham.thucthe.KhungGio;
import vn.vietbac.phongkham.thucthe.LuotKham;

/**
 * Gói 5-7: tra cứu lịch trống (UC5.6), đặt/duyệt/hủy/đổi lịch (BR01-BR04, BR23) và danh sách chờ
 * (UC6.8-6.10, UC13.9, BR21).
 */
@Service
@RequiredArgsConstructor
public class DatLichService {

    public static final List<String> TRANG_THAI_CON_HIEU_LUC = List.of("CHO_XAC_NHAN", "DA_XAC_NHAN", "DA_CHECK_IN",
            "DANG_KHAM", "CHO_CLS", "DA_CO_KET_QUA");
    private static final DateTimeFormatter GIO_NGAY = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final DateTimeFormatter GIO_NGAY_NGAN = DateTimeFormatter.ofPattern("HH:mm dd/MM");
    private static final DateTimeFormatter GIO = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter NGAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final KhungGioRepository khungGioRepo;
    private final LuotKhamRepository luotKhamRepo;
    private final DangKyChoRepository dangKyChoRepo;
    private final ThongBaoService thongBao;
    private final NhatKyService nhatKy;
    private final TruyVan tv;
    private final DongHo dongHo;

    // ================= Tra cứu (UC5.6) =================

    /**
     * Khung giờ Trống thỏa BR02 (chưa bắt đầu, trong 30 ngày tới) của 1 bác sĩ, hoặc của cả chuyên khoa (Bác sĩ bất kỳ).
     * vangLai=true (UC7.7): chỉ các khung giờ chưa bắt đầu trong hôm nay.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> lichTrong(LocalDate ngay, Integer maBS, Integer maCK, boolean vangLai) {
        List<String> dk = new ArrayList<>();
        List<Object> ts = new ArrayList<>();
        dk.add("kg.NgayKham = ?");
        ts.add(vangLai ? dongHo.homNay() : ngay);
        dk.add("TIMESTAMP(kg.NgayKham, kg.GioBatDau) > ?");
        ts.add(dongHo.bayGio());
        if (!vangLai) {
            dk.add("kg.NgayKham <= ?");
            ts.add(dongHo.homNay().plusDays(30));
        }
        dk.add("kg.TrangThai = 'TRONG'");
        dk.add("bs.TrangThai = 'HOAT_DONG'");
        locBacSi(dk, ts, maBS, maCK);
        return tv.ds("""
                SELECT kg.MaKG, kg.NgayKham, kg.GioBatDau, kg.GioKetThuc, ca.CaLam, bs.MaNV AS MaBS,
                       bs.HoTen AS BacSi, p.MaSoPhong, p.TenPhong
                FROM KhungGio kg JOIN CaLamViec ca ON ca.MaCa = kg.MaCa
                JOIN NhanVien bs ON bs.MaNV = ca.MaBS JOIN Phong p ON p.MaPhong = ca.MaPhong
                WHERE %s ORDER BY kg.GioBatDau, bs.MaNV""".formatted(String.join(" AND ", dk)), ts.toArray());
    }

    /**
     * Theo từng ngày trong 30 ngày tới có bác sĩ làm việc: số khung giờ chưa bắt đầu (SoKhung, không tính khung bị khóa)
     * và số khung còn Trống. SoKhungTrong = 0 nghĩa là ngày đã kín lịch.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> ngayConTrong(Integer maCK, Integer maBS) {
        List<String> dk = new ArrayList<>(List.of("kg.TrangThai <> 'DA_KHOA'", "bs.TrangThai = 'HOAT_DONG'",
                "TIMESTAMP(kg.NgayKham, kg.GioBatDau) > ?", "kg.NgayKham <= ?"));
        List<Object> ts = new ArrayList<>(List.of(dongHo.bayGio(), dongHo.homNay().plusDays(30)));
        locBacSi(dk, ts, maBS, maCK);
        return tv.ds("""
                SELECT kg.NgayKham AS Ngay, COUNT(*) AS SoKhung, SUM(kg.TrangThai = 'TRONG') AS SoKhungTrong
                FROM KhungGio kg JOIN CaLamViec ca ON ca.MaCa = kg.MaCa JOIN NhanVien bs ON bs.MaNV = ca.MaBS
                WHERE %s GROUP BY kg.NgayKham ORDER BY kg.NgayKham""".formatted(String.join(" AND ", dk)),
                ts.toArray());
    }

    private static void locBacSi(List<String> dk, List<Object> ts, Integer maBS, Integer maCK) {
        if (maBS != null) {
            dk.add("bs.MaNV = ?");
            ts.add(maBS);
        }
        if (maCK != null) {
            dk.add("bs.MaCK = ?");
            ts.add(maCK);
        }
    }

    /** Bác sĩ lâm sàng đang hoạt động, kèm điểm đánh giá để bệnh nhân chọn. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsBacSi(Integer maCK) {
        return tv.ds("""
                SELECT bs.MaNV AS MaBS, bs.HoTen, bs.AnhDaiDien, bs.GioiTinh, bs.HocHamHocVi, bs.SoNamKinhNghiem, bs.GioiThieu,
                       bs.DiemDanhGiaTB, bs.SoLuotDanhGia, bs.MaCK, ck.TenCK
                FROM NhanVien bs JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                WHERE bs.LoaiNhanVien = 'BAC_SI' AND bs.TrangThai = 'HOAT_DONG' %s
                ORDER BY bs.MaCK, bs.HoTen""".formatted(maCK != null ? "AND bs.MaCK = ?" : ""),
                maCK != null ? new Object[] {maCK} : new Object[0]);
    }

    /** Bộ lọc danh sách lịch hẹn; null = không lọc theo tiêu chí đó. */
    public record LocLichHen(Integer maBN, Integer maBS, LocalDate ngay, List<String> trangThai, String tuKhoa,
                             boolean moiNhatTruoc) {
    }

    /** Danh sách lịch hẹn: bệnh nhân xem của mình (UC6.3), lễ tân quản lý (UC7.1), bác sĩ xem lịch khám. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> dsLichHen(LocLichHen loc) {
        List<String> dk = new ArrayList<>(List.of("1 = 1"));
        List<Object> ts = new ArrayList<>();
        if (loc.maBN() != null) {
            dk.add("lk.MaBN = ?");
            ts.add(loc.maBN());
        }
        if (loc.maBS() != null) {
            dk.add("lk.MaBS = ?");
            ts.add(loc.maBS());
        }
        if (loc.ngay() != null) {
            dk.add("lk.NgayKham = ?");
            ts.add(loc.ngay());
        }
        if (loc.trangThai() != null && !loc.trangThai().isEmpty()) {
            dk.add("lk.TrangThai IN (?)");
            ts.add(loc.trangThai());
        }
        if (loc.tuKhoa() != null && !loc.tuKhoa().isBlank()) {
            dk.add("(bn.HoTen LIKE ? OR bn.SDT LIKE ? OR lk.MaLichHen LIKE ?)");
            for (int i = 0; i < 3; i++) ts.add("%" + loc.tuKhoa() + "%");
        }
        String thuTu = loc.moiNhatTruoc() ? "DESC" : "ASC";
        return tv.ds("""
                SELECT lk.MaLK, lk.MaLichHen, lk.NgayKham, kg.GioBatDau, kg.GioKetThuc, lk.TrangThai, lk.KenhDat,
                       lk.LyDoKham, lk.TrieuChungSoBo, lk.SoLanDoi, lk.SoThuTu, lk.ThoiDiemCheckIn, lk.LyDoHuy,
                       lk.TrangThaiBHYT, lk.MucHuong, lk.GioDuKienVaoKham, lk.NgayTao,
                       bn.MaBN, bn.HoTen AS BenhNhan, bn.SDT, bn.NgaySinh, bn.GioiTinh,
                       bs.MaNV AS MaBS, bs.HoTen AS BacSi, bs.HocHamHocVi, ck.MaCK, ck.TenCK,
                       p.MaSoPhong, p.TenPhong
                FROM LuotKham lk JOIN KhungGio kg ON kg.MaKG = lk.MaKG
                JOIN CaLamViec ca ON ca.MaCa = kg.MaCa JOIN Phong p ON p.MaPhong = ca.MaPhong
                JOIN BenhNhan bn ON bn.MaBN = lk.MaBN
                JOIN NhanVien bs ON bs.MaNV = lk.MaBS JOIN ChuyenKhoa ck ON ck.MaCK = bs.MaCK
                WHERE %s
                ORDER BY lk.NgayKham %s, kg.GioBatDau %s, lk.MaLK""".formatted(String.join(" AND ", dk), thuTu, thuTu),
                ts.toArray());
    }

    /** MaBN của lịch hẹn, để controller kiểm tra bệnh nhân chỉ thao tác trên lịch của mình. */
    @Transactional(readOnly = true)
    public Integer benhNhanCuaLich(Integer maLK) {
        return luotKhamRepo.findById(maLK).map(LuotKham::getMaBN)
                .orElseThrow(() -> new KhongTimThay("Không tìm thấy lịch hẹn"));
    }

    // ================= Đặt lịch (gói 6, 7) =================

    private record KetQuaDat(LuotKham lk, KhungGio kg, boolean daXacNhan) {
    }

    /** Kiểm tra BR01, BR02, BR03 trong cùng giao dịch, tạo lượt khám và giữ khung giờ. */
    private KetQuaDat taoLuotKham(Integer maBN, Integer maKG, String kenh, String lyDo, String trieuChung,
                                  Integer maNguoiTao, boolean choPhepGiuCho) {
        LocalDateTime bayGio = dongHo.bayGio();
        Map<String, Object> bn = maBN == null ? null : tv.mot("""
                SELECT tk.TrangThai FROM BenhNhan bn LEFT JOIN TaiKhoan tk ON tk.MaTK = bn.MaTK WHERE bn.MaBN = ?""", maBN);
        if (bn == null) {
            throw new KhongTimThay("Không tìm thấy bệnh nhân");
        }
        if ("BI_KHOA".equals(bn.get("TrangThai"))) {
            throw new LoiNghiepVu("Tài khoản của bệnh nhân đang bị khóa, không thể đặt lịch");
        }
        KhungGio kg = maKG == null ? null : khungGioRepo.khoa(maKG).orElse(null);
        List<String> hopLe = choPhepGiuCho ? List.of("TRONG", "DANG_GIU_CHO") : List.of("TRONG");
        if (kg == null || !hopLe.contains(kg.getTrangThai())) {
            throw new LoiNghiepVu("Khung giờ không còn trống");                                   // BR01
        }
        if ("TAI_QUAY".equals(kenh)) {                                                           // UC7.7 vãng lai
            if (!kg.getNgayKham().equals(bayGio.toLocalDate()) || !kg.batDau().isAfter(bayGio)) {
                throw new LoiNghiepVu("Bệnh nhân vãng lai chỉ được xếp vào khung giờ chưa bắt đầu trong ngày");
            }
        } else {
            kiemTraThoiDiemDat(kg, bayGio);                                                      // BR02
        }
        if (tv.dem("SELECT COUNT(*) FROM LuotKham WHERE MaBN = ? AND TrangThai IN (?)",
                maBN, TRANG_THAI_CON_HIEU_LUC) >= 3) {
            throw new LoiNghiepVu("Mỗi bệnh nhân có tối đa 3 lịch hẹn chưa hoàn thành");                // BR03
        }
        Integer maBS = tv.giaTri("SELECT MaBS FROM CaLamViec WHERE MaCa = ?", kg.getMaCa());
        kiemTraTrungLich(maBN, null, kg, maBS);

        // BR23: lịch do lễ tân tạo (điện thoại, tin nhắn, tại quầy) được xác nhận ngay
        boolean daXacNhan = List.of("DIEN_THOAI", "TIN_NHAN", "TAI_QUAY").contains(kenh);
        LuotKham lk = new LuotKham();
        lk.setMaLichHen("TMP" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        lk.setMaBN(maBN);
        lk.setMaBS(maBS);
        lk.setMaKG(maKG);
        lk.setNgayKham(kg.getNgayKham());
        lk.setKenhDat(kenh);
        lk.setLyDoKham(lyDo);
        lk.setTrieuChungSoBo(trieuChung);
        lk.setTrangThai(daXacNhan ? "DA_XAC_NHAN" : "CHO_XAC_NHAN");
        lk.setMaNguoiTao(maNguoiTao);
        if (daXacNhan) {
            lk.setMaNguoiDuyet(maNguoiTao);
            lk.setThoiDiemDuyet(bayGio);
        }
        lk.setNgayTao(bayGio);
        luotKhamRepo.save(lk);
        // Mã đọc được dạng LH2610120018 sau khi đã có khóa tự tăng
        lk.setMaLichHen("LH" + bayGio.format(DateTimeFormatter.ofPattern("yyMMdd")) + String.format("%04d", lk.getMaLK()));
        kg.setTrangThai("DA_DAT");
        return new KetQuaDat(lk, kg, daXacNhan);
    }

    /** BR02: khung giờ chưa bắt đầu và trong vòng 30 ngày tới. */
    private static void kiemTraThoiDiemDat(KhungGio kg, LocalDateTime bayGio) {
        if (!kg.batDau().isAfter(bayGio)) {
            throw new LoiNghiepVu("Khung giờ này đã bắt đầu, vui lòng chọn khung giờ khác");
        }
        if (kg.batDau().isAfter(bayGio.plusDays(30))) {
            throw new LoiNghiepVu("Chỉ được đặt lịch trong 30 ngày tới");
        }
    }

    /** BR03: không trùng thời điểm với lịch khác, không 2 lịch cùng bác sĩ trong một ngày. boQua = lịch đang đổi. */
    private void kiemTraTrungLich(Integer maBN, Integer boQua, KhungGio kg, Integer maBS) {
        Map<String, Object> r = tv.mot("""
                SELECT COALESCE(SUM(kg.GioBatDau = ?), 0) AS trungGio, COALESCE(SUM(lk.MaBS = ?), 0) AS cungBS
                FROM LuotKham lk JOIN KhungGio kg ON kg.MaKG = lk.MaKG
                WHERE lk.MaBN = ? AND lk.MaLK <> ? AND lk.TrangThai IN (?) AND kg.NgayKham = ?""",
                kg.getGioBatDau(), maBS, maBN, boQua == null ? 0 : boQua, TRANG_THAI_CON_HIEU_LUC, kg.getNgayKham());
        if (((Number) r.get("trungGio")).longValue() > 0) {
            throw new LoiNghiepVu("Bệnh nhân đã có lịch hẹn khác trùng thời điểm");
        }
        if (((Number) r.get("cungBS")).longValue() > 0) {
            throw new LoiNghiepVu("Bệnh nhân đã có lịch hẹn với bác sĩ này trong ngày");
        }
    }

    /** UC6.1 (bệnh nhân, kênh WEB), UC7.13 (điện thoại), UC7.14 (tin nhắn), UC7.7 (vãng lai - TAI_QUAY). */
    @Transactional
    public Integer datLich(Integer maBN, Integer maKG, String kenh, String lyDo, String trieuChung, Integer maNguoiTao) {
        KetQuaDat kq = taoLuotKham(maBN, maKG, kenh, lyDo, trieuChung, maNguoiTao, false);
        LuotKham lk = kq.lk();
        String gio = kq.kg().batDau().format(GIO_NGAY);
        thongBao.benhNhan(maBN, "LICH_HEN", "Đặt lịch thành công", "Lịch hẹn " + lk.getMaLichHen() + " lúc " + gio + " "
                        + (kq.daXacNhan() ? "đã được xác nhận" : "đang chờ lễ tân xác nhận") + ".",
                "LUOT_KHAM", lk.getMaLK(), "TIN_NHAN".equals(kenh));
        if (kq.daXacNhan()) {
            nhatKy.ghi(maNguoiTao, "DAT_LICH_HO", "LuotKham", lk.getMaLK(), moTa(lk, kq.kg()) + ", kênh " + kenh);
        } else {
            thongBao.vaiTro("LE_TAN", "LICH_HEN", "Lịch hẹn mới chờ duyệt",
                    "Lịch hẹn " + lk.getMaLichHen() + " lúc " + gio, "LUOT_KHAM", lk.getMaLK());
        }
        return lk.getMaLK();
    }

    /** UC7.2. */
    @Transactional
    public void duyetLich(Integer maLK, Integer maTKLeTan) {
        LuotKham lk = luotKhamRepo.khoa(maLK).orElse(null);
        if (lk == null || !"CHO_XAC_NHAN".equals(lk.getTrangThai())) {
            throw new LoiNghiepVu("Trạng thái lịch hẹn đã thay đổi");
        }
        lk.setTrangThai("DA_XAC_NHAN");
        lk.setMaNguoiDuyet(maTKLeTan);
        lk.setThoiDiemDuyet(dongHo.bayGio());
        nhatKy.ghi(maTKLeTan, "DUYET_LICH_HEN", "LuotKham", maLK,
                moTa(lk, khungGioRepo.findById(lk.getMaKG()).orElseThrow()));
        thongBao.benhNhan(lk.getMaBN(), "LICH_HEN", "Lịch hẹn đã được xác nhận",
                "Lịch hẹn " + lk.getMaLichHen() + " đã được xác nhận.", "LUOT_KHAM", maLK, false);
    }

    /** UC6.4 (bệnh nhân, BR04), UC7.3 từ chối, UC7.4 lễ tân hủy thay (không ràng buộc BR04). */
    @Transactional
    public void huyLich(Integer maLK, String lyDo, Integer maTK, boolean boiLeTan) {
        LuotKham lk = luotKhamRepo.khoa(maLK).orElse(null);
        if (lk == null || !List.of("CHO_XAC_NHAN", "DA_XAC_NHAN").contains(lk.getTrangThai())) {
            throw new LoiNghiepVu("Lịch hẹn không ở trạng thái có thể hủy");
        }
        KhungGio kg = khungGioRepo.findById(lk.getMaKG()).orElseThrow();
        if (!boiLeTan && !duocHuy(lk, kg, dongHo.bayGio())) {
            throw new LoiNghiepVu("Chỉ được hủy lịch trước giờ khám ít nhất 4 giờ, "
                    + "hoặc trong " + PHUT_HUY_SAU_KHI_DAT + " phút sau khi đặt");                      // BR04
        }
        lk.setTrangThai("DA_HUY");
        lk.setLyDoHuy(lyDo);
        lk.setMaNguoiHuy(maTK);
        lk.setThoiDiemHuy(dongHo.bayGio());
        kg.setTrangThai("TRONG");
        if (boiLeTan) {
            nhatKy.ghi(maTK, "HUY_LICH_HEN", "LuotKham", maLK, moTa(lk, kg) + ". Lý do: " + lyDo);
        }
        thongBao.benhNhan(lk.getMaBN(), "LICH_HEN", "Lịch hẹn đã hủy", "Lịch hẹn " + lk.getMaLichHen()
                + " đã được hủy. Lý do: " + lyDo, "LUOT_KHAM", maLK, "TIN_NHAN".equals(lk.getKenhDat()));
        thongBao.nhanVien(lk.getMaBS(), "LICH_HEN", "Bệnh nhân hủy lịch", "Lịch hẹn " + lk.getMaLichHen() + " lúc "
                + kg.batDau().format(GIO_NGAY_NGAN) + " đã hủy", "LUOT_KHAM", maLK);
        phanBoDanhSachCho(kg.getMaKG());                                                         // UC13.9
    }

    /** Thời gian bệnh nhân được hủy lịch vừa đặt mà không tính BR04 (sửa khi chọn nhầm). */
    static final int PHUT_HUY_SAU_KHI_DAT = 15;

    /**
     * BR04: bệnh nhân hủy khi còn ít nhất 4 giờ trước giờ khám; hoặc trong 15 phút đầu sau khi đặt,
     * miễn là khung giờ chưa bắt đầu (đặt sát giờ mà chọn nhầm vẫn hủy được, nhưng không đặt sớm rồi hủy sát giờ).
     */
    private static boolean duocHuy(LuotKham lk, KhungGio kg, LocalDateTime bayGio) {
        if (Duration.between(bayGio, kg.batDau()).toMinutes() >= 240) {
            return true;
        }
        return kg.batDau().isAfter(bayGio) && lk.getNgayTao() != null
                && !bayGio.isAfter(lk.getNgayTao().plusMinutes(PHUT_HUY_SAU_KHI_DAT));
    }

    /** UC6.5: BR01, BR02, BR04; đổi tối đa 2 lần, lịch quay về Chờ xác nhận. */
    @Transactional
    public void doiLich(Integer maLK, Integer maKGMoi, Integer maTK) {
        LuotKham lk = luotKhamRepo.khoa(maLK).orElse(null);
        if (lk == null || !List.of("CHO_XAC_NHAN", "DA_XAC_NHAN").contains(lk.getTrangThai())) {
            throw new LoiNghiepVu("Lịch hẹn không ở trạng thái có thể đổi");
        }
        if (lk.getSoLanDoi() >= 2) {
            throw new LoiNghiepVu("Mỗi lịch hẹn chỉ được đổi tối đa 2 lần");                            // BR04
        }
        KhungGio cu = khungGioRepo.findById(lk.getMaKG()).orElseThrow();
        if (Duration.between(dongHo.bayGio(), cu.batDau()).toMinutes() < 240) {
            throw new LoiNghiepVu("Chỉ được đổi lịch trước giờ khám ít nhất 4 giờ");                    // BR04
        }
        KhungGio moi = khungGioRepo.khoa(maKGMoi).orElse(null);
        if (moi == null || !"TRONG".equals(moi.getTrangThai())) {
            throw new LoiNghiepVu("Khung giờ mới không còn trống");
        }
        kiemTraThoiDiemDat(moi, dongHo.bayGio());                                                // BR02
        Integer maBSMoi = tv.giaTri("SELECT MaBS FROM CaLamViec WHERE MaCa = ?", moi.getMaCa());
        kiemTraTrungLich(lk.getMaBN(), maLK, moi, maBSMoi);
        lk.setMaKG(maKGMoi);
        lk.setMaBS(maBSMoi);
        lk.setNgayKham(moi.getNgayKham());
        lk.setSoLanDoi(lk.getSoLanDoi() + 1);
        lk.setTrangThai("CHO_XAC_NHAN");
        lk.setMaNguoiDuyet(null);
        lk.setThoiDiemDuyet(null);
        lk.setDaNhacLich(false);
        moi.setTrangThai("DA_DAT");
        cu.setTrangThai("TRONG");
        thongBao.benhNhan(lk.getMaBN(), "LICH_HEN", "Đổi lịch thành công", "Lịch hẹn " + lk.getMaLichHen()
                + " đã đổi sang " + moi.batDau().format(GIO_NGAY) + ", chờ xác nhận.", "LUOT_KHAM", maLK, false);
        phanBoDanhSachCho(cu.getMaKG());
    }

    // ================= Danh sách chờ (UC6.8-6.10, UC13.9, BR21) =================

    /** UC6.8: khung giờ mong muốn đã kín -> xếp hàng chờ, có chỗ trống sẽ được giữ 15 phút. */
    @Transactional
    public Integer dangKyCho(Integer maBN, Integer maCK, LocalDate ngay, String buoi, Integer maBS, String lyDo) {
        if (ngay == null || ngay.isBefore(dongHo.homNay()) || ngay.isAfter(dongHo.homNay().plusDays(30))) {
            throw new LoiNghiepVu("Chỉ đăng ký chờ cho các ngày trong 30 ngày tới");                    // BR02
        }
        if (maCK == null) {
            throw new LoiNghiepVu("Vui lòng chọn chuyên khoa");
        }
        String b = buoi == null ? "CA_NGAY" : buoi;
        List<String> dk = new ArrayList<>(List.of("kg.TrangThai = 'TRONG'", "bs.TrangThai = 'HOAT_DONG'",
                "kg.NgayKham = ?", "TIMESTAMP(kg.NgayKham, kg.GioBatDau) > ?"));
        List<Object> ts = new ArrayList<>(List.of(ngay, dongHo.bayGio()));
        locBacSi(dk, ts, maBS, maCK);
        if (!"CA_NGAY".equals(b)) {
            dk.add("ca.CaLam = ?");
            ts.add(b);
        }
        if (tv.dem("""
                SELECT COUNT(*) FROM KhungGio kg JOIN CaLamViec ca ON ca.MaCa = kg.MaCa JOIN NhanVien bs ON bs.MaNV = ca.MaBS
                WHERE %s""".formatted(String.join(" AND ", dk)), ts.toArray()) > 0) {
            throw new LoiNghiepVu("Ngày này vẫn còn khung giờ trống, vui lòng đặt lịch trực tiếp");    // UC6.8
        }
        if (dangKyChoRepo.demConHieuLuc(maBN) >= 2) {
            throw new LoiNghiepVu("Mỗi bệnh nhân có tối đa 2 đăng ký chờ còn hiệu lực");               // BR21
        }
        if (maBS != null && tv.dem("""
                SELECT (SELECT COUNT(*) FROM LuotKham WHERE MaBN = ? AND MaBS = ? AND NgayKham = ?
                          AND TrangThai IN ('CHO_XAC_NHAN','DA_XAC_NHAN'))
                     + (SELECT COUNT(*) FROM DangKyCho WHERE MaBN = ? AND MaBS = ? AND NgayMongMuon = ?
                          AND TrangThai IN ('DANG_CHO','DANG_DUOC_MOI'))""",
                maBN, maBS, ngay, maBN, maBS, ngay) > 0) {
            throw new LoiNghiepVu("Đã có lịch hẹn hoặc đăng ký chờ với bác sĩ này trong ngày");
        }
        DangKyCho d = new DangKyCho();
        d.setMaBN(maBN);
        d.setMaCK(maCK);
        d.setMaBS(maBS);
        d.setNgayMongMuon(ngay);
        d.setBuoi(b);
        d.setLyDoKham(lyDo);
        d.setThoiDiemDangKy(dongHo.bayGio());
        d.setThoiDiemXepHang(dongHo.bayGio());
        dangKyChoRepo.save(d);
        return d.getMaDKC();
    }

    /** UC13.9: khung giờ vừa trống -> giữ chỗ 15 phút cho người đầu danh sách chờ phù hợp. */
    void phanBoDanhSachCho(Integer maKG) {
        Map<String, Object> kg = tv.mot("""
                SELECT kg.NgayKham, kg.GioBatDau, ca.CaLam, ca.MaBS, bs.MaCK FROM KhungGio kg
                JOIN CaLamViec ca ON ca.MaCa = kg.MaCa JOIN NhanVien bs ON bs.MaNV = ca.MaBS
                WHERE kg.MaKG = ? AND kg.TrangThai = 'TRONG'""", maKG);
        if (kg == null) {
            return;
        }
        LocalDate ngay = (LocalDate) kg.get("NgayKham");
        LocalDateTime batDau = LocalDateTime.of(ngay, java.time.LocalTime.parse((String) kg.get("GioBatDau")));
        if (batDau.isBefore(dongHo.bayGio().plusMinutes(15))) {
            return;                                                    // khung sắp bắt đầu, không kịp giữ chỗ 15 phút
        }
        // Bỏ qua người không nhận được khung giờ này (BR03, tài khoản bị khóa), tránh khung giờ kẹt ở Đang giữ chỗ
        Integer maDKC = tv.giaTri("""
                SELECT d.MaDKC FROM DangKyCho d
                WHERE d.TrangThai = 'DANG_CHO' AND d.NgayMongMuon = ? AND d.MaCK = ?
                  AND (d.MaBS IS NULL OR d.MaBS = ?) AND d.Buoi IN ('CA_NGAY', ?)
                  AND (SELECT COUNT(*) FROM LuotKham lk WHERE lk.MaBN = d.MaBN AND lk.TrangThai IN (?)) < 3
                  AND NOT EXISTS (SELECT 1 FROM LuotKham lk JOIN KhungGio k ON k.MaKG = lk.MaKG
                                  WHERE lk.MaBN = d.MaBN AND lk.TrangThai IN (?) AND k.NgayKham = ?
                                    AND (k.GioBatDau = ? OR lk.MaBS = ?))
                  AND NOT EXISTS (SELECT 1 FROM BenhNhan bn JOIN TaiKhoan tk ON tk.MaTK = bn.MaTK
                                  WHERE bn.MaBN = d.MaBN AND tk.TrangThai = 'BI_KHOA')
                ORDER BY d.ThoiDiemXepHang""", ngay, kg.get("MaCK"), kg.get("MaBS"), kg.get("CaLam"),
                TRANG_THAI_CON_HIEU_LUC, TRANG_THAI_CON_HIEU_LUC, ngay, kg.get("GioBatDau"), kg.get("MaBS")); // giaTri tự thêm LIMIT 1
        if (maDKC == null) {
            return;
        }
        DangKyCho d = dangKyChoRepo.khoa(maDKC).orElseThrow();
        LocalDateTime han = dongHo.bayGio().plusMinutes(15);
        khungGioRepo.khoa(maKG).orElseThrow().setTrangThai("DANG_GIU_CHO");
        d.setTrangThai("DANG_DUOC_MOI");
        d.setMaKGDuocMoi(maKG);
        d.setHanGiuCho(han);
        thongBao.benhNhan(d.getMaBN(), "DANH_SACH_CHO", "Có khung giờ trống cho bạn", "Khung giờ "
                        + batDau.format(GIO_NGAY) + " đang được giữ cho bạn đến " + han.format(GIO) + ".",
                "DANG_KY_CHO", maDKC, false);
    }

    /** UC6.10: nhận khung giờ được mời -> tạo lịch hẹn Chờ xác nhận. */
    @Transactional(noRollbackFor = LoiNghiepVu.class)
    public Integer nhanCho(Integer maDKC, Integer maTK, String kenh) {
        DangKyCho d = dangKyChoRepo.khoa(maDKC).orElse(null);
        if (d == null || !"DANG_DUOC_MOI".equals(d.getTrangThai()) || d.getHanGiuCho().isBefore(dongHo.bayGio())) {
            throw new LoiNghiepVu("Khung giờ đã hết thời gian giữ chỗ");
        }
        LuotKham lk;
        try {
            // taoLuotKham kiểm tra hết điều kiện trước khi ghi, nên khi lỗi dữ liệu chưa bị thay đổi
            lk = taoLuotKham(d.getMaBN(), d.getMaKGDuocMoi(), kenh, d.getLyDoKham(), null, maTK, true).lk();
        } catch (LoiNghiepVu e) {
            traKhungGiuCho(d, "DA_HUY");
            throw new LoiNghiepVu(e.getMessage() + ". Khung giờ đã được chuyển cho người kế tiếp");
        }
        d.setTrangThai("DA_NHAN_CHO");
        d.setMaLK(lk.getMaLK());
        return lk.getMaLK();
    }

    /** Bỏ lời mời giữ chỗ: nhả khung giờ và mời người kế tiếp trong danh sách chờ (UC13.9). */
    private void traKhungGiuCho(DangKyCho d, String trangThaiMoi) {
        Integer maKG = d.getMaKGDuocMoi();
        d.setTrangThai(trangThaiMoi);
        d.setMaKGDuocMoi(null);
        d.setHanGiuCho(null);
        KhungGio kg = khungGioRepo.khoa(maKG).orElseThrow();
        if ("DANG_GIU_CHO".equals(kg.getTrangThai())) {
            kg.setTrangThai("TRONG");
        }
        phanBoDanhSachCho(maKG);
    }

    /** UC6.9: đăng ký chờ của bệnh nhân, kèm khung giờ đang được giữ (nếu có) và vị trí trong hàng. */
    @Transactional
    public List<Map<String, Object>> dsDangKyCho(Integer maBN) {
        xuLyGiuChoHetHan();
        return tv.ds("""
                SELECT d.MaDKC, d.NgayMongMuon, d.Buoi, d.LyDoKham, d.TrangThai, d.HanGiuCho, d.ThoiDiemDangKy,
                       d.MaLK, ck.TenCK, bs.HoTen AS BacSi, kg.NgayKham, kg.GioBatDau, bsm.HoTen AS BacSiDuocMoi,
                       (SELECT COUNT(*) FROM DangKyCho t WHERE t.TrangThai = 'DANG_CHO' AND t.MaCK = d.MaCK
                          AND t.NgayMongMuon = d.NgayMongMuon AND t.ThoiDiemXepHang < d.ThoiDiemXepHang) + 1 AS ViTri
                FROM DangKyCho d JOIN ChuyenKhoa ck ON ck.MaCK = d.MaCK
                LEFT JOIN NhanVien bs ON bs.MaNV = d.MaBS
                LEFT JOIN KhungGio kg ON kg.MaKG = d.MaKGDuocMoi
                LEFT JOIN CaLamViec ca ON ca.MaCa = kg.MaCa LEFT JOIN NhanVien bsm ON bsm.MaNV = ca.MaBS
                WHERE d.MaBN = ? ORDER BY d.MaDKC DESC""", maBN);
    }

    /** UC6.9: hủy đăng ký chờ; đang được mời thì coi như từ chối, khung giờ chuyển cho người sau. */
    @Transactional
    public void huyDangKyCho(Integer maDKC, Integer maBN) {
        DangKyCho d = dangKyChoRepo.khoa(maDKC).filter(x -> x.getMaBN().equals(maBN)).orElse(null);
        if (d == null || !List.of("DANG_CHO", "DANG_DUOC_MOI").contains(d.getTrangThai())) {
            throw new LoiNghiepVu("Đăng ký chờ không còn hiệu lực");
        }
        if ("DANG_DUOC_MOI".equals(d.getTrangThai())) {
            traKhungGiuCho(d, "DA_HUY");
        } else {
            d.setTrangThai("DA_HUY");
        }
    }

    // ================= Tác vụ tự động (gói 13) =================

    /**
     * UC13.9: quá 15 phút không nhận -> đăng ký chờ Hết hạn, khung giờ mở lại và mời người kế tiếp.
     * Không xếp lại người vừa hết hạn, nếu không người duy nhất trong hàng sẽ bị mời lại vô hạn.
     */
    @Transactional
    public int xuLyGiuChoHetHan() {
        List<DangKyCho> ds = dangKyChoRepo.khoaGiuChoHetHan(dongHo.bayGio());
        for (DangKyCho d : ds) {
            traKhungGiuCho(d, "HET_HAN");
            thongBao.benhNhan(d.getMaBN(), "DANH_SACH_CHO", "Hết thời gian giữ chỗ",
                    "Khung giờ được giữ cho bạn đã hết hạn do không xác nhận trong 15 phút.", "DANG_KY_CHO",
                    d.getMaDKC(), false);
        }
        return ds.size();
    }

    /** UC13.2: nhắc lịch hẹn Đã xác nhận trong 24 giờ tới. */
    @Transactional
    public int nhacLich() {
        LocalDateTime bayGio = dongHo.bayGio();
        List<Map<String, Object>> ds = tv.ds("""
                SELECT lk.MaLK, lk.MaBN, lk.MaLichHen, lk.KenhDat, TIMESTAMP(kg.NgayKham, kg.GioBatDau) AS GioKham
                FROM LuotKham lk JOIN KhungGio kg ON kg.MaKG = lk.MaKG
                WHERE lk.TrangThai = 'DA_XAC_NHAN' AND lk.DaNhacLich = FALSE
                  AND TIMESTAMP(kg.NgayKham, kg.GioBatDau) BETWEEN ? AND ?""", bayGio, bayGio.plusHours(24));
        for (Map<String, Object> lk : ds) {
            thongBao.benhNhan((Integer) lk.get("MaBN"), "NHAC_LICH", "Nhắc lịch khám", "Bạn có lịch khám "
                            + lk.get("MaLichHen") + " lúc " + ((LocalDateTime) lk.get("GioKham")).format(GIO_NGAY) + ".",
                    "LUOT_KHAM", (Integer) lk.get("MaLK"), "TIN_NHAN".equals(lk.get("KenhDat")));
            tv.capNhat("UPDATE LuotKham SET DaNhacLich = TRUE WHERE MaLK = ?", lk.get("MaLK"));
        }
        return ds.size();
    }

    /** UC13.3 / BR05: quá giờ khám 30 phút chưa check-in -> Vắng mặt. */
    @Transactional
    public int tuDongVangMat() {
        return tv.capNhat("""
                UPDATE LuotKham lk JOIN KhungGio kg ON kg.MaKG = lk.MaKG SET lk.TrangThai = 'VANG_MAT'
                WHERE lk.TrangThai = 'DA_XAC_NHAN' AND TIMESTAMP(kg.NgayKham, kg.GioBatDau) < ?""",
                dongHo.bayGio().minusMinutes(30));
    }

    /** Mô tả lịch hẹn cho nhật ký thao tác. */
    private String moTa(LuotKham lk, KhungGio kg) {
        return lk.getMaLichHen() + " - " + tv.giaTri("SELECT HoTen FROM BenhNhan WHERE MaBN = ?", lk.getMaBN())
                + ", " + kg.batDau().format(GIO_NGAY);
    }

    static String ngay(LocalDate d) {
        return d.format(NGAY);
    }
}
