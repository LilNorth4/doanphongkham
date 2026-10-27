package vn.vietbac.phongkham.dichvu;

import static vn.vietbac.phongkham.dichvu.DanhMucService.batBuoc;
import static vn.vietbac.phongkham.dichvu.DanhMucService.timThay;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LuuAnh;
import vn.vietbac.phongkham.chung.TruyVan;

/**
 * Sơ đồ mặt bằng (UC3.9, BR22): mỗi tầng có ảnh mặt bằng, điểm nút (cửa phòng, hành lang, cầu thang...) và
 * đoạn đường nối các điểm. Chỉ đường bằng Dijkstra với trọng số thời gian: đi bộ 1 m/giây,
 * cầu thang 30 giây mỗi tầng, thang máy 60 giây.
 */
@Service
public class MatBangService {

    private static final List<String> LOAI_DIEM = List.of("PHONG", "HANH_LANG", "NGA_RE", "CAU_THANG", "THANG_MAY",
            "QUAY_TIEP_DON", "QUAY_THU_NGAN", "SANH");

    private final NhatKyService nhatKy;
    private final LuuAnh luuAnh;
    private final TruyVan tv;

    public MatBangService(NhatKyService nhatKy, LuuAnh luuAnh, TruyVan tv) {
        this.nhatKy = nhatKy;
        this.luuAnh = luuAnh;
        this.tv = tv;
    }

    // ================= Đọc sơ đồ =================

    /** Toàn bộ sơ đồ: các tầng kèm điểm nút; đoạn đường trả chung vì có đoạn nối giữa hai tầng. */
    @Transactional(readOnly = true)
    public Map<String, Object> soDo() {
        List<Map<String, Object>> tang = tv.ds("SELECT MaTang, SoTang, TenTang, AnhMatBang, TiLe FROM Tang ORDER BY SoTang");
        Map<Object, List<Map<String, Object>>> diemTheoTang = new HashMap<>();
        for (Map<String, Object> d : tv.ds("""
                SELECT d.MaDiem, d.MaTang, d.TenDiem, d.LoaiDiem, d.ToaDoX, d.ToaDoY, d.MaPhong, p.MaSoPhong, p.TenPhong
                FROM DiemNut d LEFT JOIN Phong p ON p.MaPhong = d.MaPhong ORDER BY d.MaDiem""")) {
            diemTheoTang.computeIfAbsent(d.get("MaTang"), k -> new ArrayList<>()).add(d);
        }
        tang.forEach(t -> t.put("Diem", diemTheoTang.getOrDefault(t.get("MaTang"), List.of())));
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("Tang", tang);
        kq.put("Doan", tv.ds("SELECT MaDoan, MaDiemDau, MaDiemCuoi, LoaiDoan, DoDai, SoTang FROM DoanDuong ORDER BY MaDoan"));
        return kq;
    }

    // ================= Tầng =================

    @Transactional
    public Integer themTang(Integer soTang, String tenTang, BigDecimal tiLe, Integer maTK) {
        kiemTraTang(null, soTang, tiLe);
        String ten = batBuoc(tenTang, "tên tầng");
        tv.capNhat("INSERT INTO Tang (SoTang, TenTang, TiLe) VALUES (?, ?, ?)", soTang, ten, tiLe);
        Integer ma = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        nhatKy.ghi(maTK, "THEM_DANH_MUC", "Tang", ma, ten);
        return ma;
    }

    /** Đổi tỉ lệ thì tính lại độ dài các đoạn đi bộ trong tầng theo tọa độ. */
    @Transactional
    public void suaTang(Integer maTang, Integer soTang, String tenTang, BigDecimal tiLe, Integer maTK) {
        BigDecimal tiLeCu = timThay(tv.giaTri("SELECT TiLe FROM Tang WHERE MaTang = ?", maTang), "tầng");
        kiemTraTang(maTang, soTang, tiLe);
        String ten = batBuoc(tenTang, "tên tầng");
        Number soCu = tv.giaTri("SELECT SoTang FROM Tang WHERE MaTang = ?", maTang);
        if (soCu.intValue() != soTang && tv.dem("""
                SELECT COUNT(*) FROM DoanDuong dd JOIN DiemNut a ON a.MaDiem = dd.MaDiemDau JOIN DiemNut b ON b.MaDiem = dd.MaDiemCuoi
                WHERE a.MaTang <> b.MaTang AND (a.MaTang = ? OR b.MaTang = ?)""", maTang, maTang) > 0) {
            throw new LoiNghiepVu("Tầng đã nối cầu thang / thang máy với tầng khác, hãy xóa các đoạn nối trước khi đổi số tầng");
        }
        tv.capNhat("UPDATE Tang SET SoTang = ?, TenTang = ?, TiLe = ? WHERE MaTang = ?", soTang, ten, tiLe, maTang);
        if (tiLeCu.compareTo(tiLe) != 0) {
            tinhLaiDoDai(maTang, null);
        }
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "Tang", maTang, ten);
    }

    @Transactional
    public void xoaTang(Integer maTang, Integer maTK) {
        Map<String, Object> t = timThay(tv.mot("SELECT TenTang, AnhMatBang FROM Tang WHERE MaTang = ?", maTang), "tầng");
        if (tv.dem("SELECT COUNT(*) FROM Phong WHERE MaTang = ?", maTang) > 0) {
            throw new LoiNghiepVu("Tầng còn phòng, hãy chuyển các phòng sang tầng khác trước");
        }
        if (tv.dem("SELECT COUNT(*) FROM DiemNut WHERE MaTang = ?", maTang) > 0) {
            throw new LoiNghiepVu("Tầng còn điểm trên sơ đồ, hãy xóa các điểm trước");
        }
        tv.capNhat("DELETE FROM Tang WHERE MaTang = ?", maTang);
        luuAnh.xoa((String) t.get("AnhMatBang"));
        nhatKy.ghi(maTK, "XOA_DANH_MUC", "Tang", maTang, (String) t.get("TenTang"));
    }

    @Transactional
    public String doiAnhTang(Integer maTang, MultipartFile anh, Integer maTK) {
        Map<String, Object> t = timThay(tv.mot("SELECT TenTang, AnhMatBang FROM Tang WHERE MaTang = ?", maTang), "tầng");
        String moi = luuAnh.luu(anh, "mat-bang", "tang" + maTang);
        tv.capNhat("UPDATE Tang SET AnhMatBang = ? WHERE MaTang = ?", moi, maTang);
        luuAnh.xoa((String) t.get("AnhMatBang"));
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "Tang", maTang, t.get("TenTang") + ": đổi ảnh mặt bằng");
        return moi;
    }

    private void kiemTraTang(Integer maTang, Integer soTang, BigDecimal tiLe) {
        if (soTang == null || soTang < -5 || soTang > 50) {
            throw new LoiNghiepVu("Số tầng từ -5 (tầng hầm) đến 50");
        }
        if (tiLe == null || tiLe.signum() <= 0 || tiLe.compareTo(BigDecimal.TEN) > 0) {
            throw new LoiNghiepVu("Tỉ lệ (mét trên 1 điểm ảnh) phải lớn hơn 0 và không quá 10");
        }
        if (tv.dem("SELECT COUNT(*) FROM Tang WHERE SoTang = ? AND MaTang <> ?", soTang, maTang == null ? 0 : maTang) > 0) {
            throw new LoiNghiepVu("Đã có tầng số " + soTang);
        }
    }

    // ================= Điểm nút =================

    @Transactional
    public Integer themDiem(Integer maTang, String tenDiem, String loaiDiem, Integer x, Integer y, Integer maPhong,
                           Integer maTK) {
        timThay(tv.giaTri("SELECT TenTang FROM Tang WHERE MaTang = ?", maTang), "tầng");
        String ten = kiemTraDiem(null, maTang, tenDiem, loaiDiem, x, y, maPhong);
        tv.capNhat("INSERT INTO DiemNut (MaTang, TenDiem, LoaiDiem, ToaDoX, ToaDoY, MaPhong) VALUES (?, ?, ?, ?, ?, ?)",
                maTang, ten, loaiDiem, x, y, "PHONG".equals(loaiDiem) ? maPhong : null);
        Integer ma = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        nhatKy.ghi(maTK, "THEM_DANH_MUC", "DiemNut", ma, ten);
        return ma;
    }

    /** Di chuyển điểm thì độ dài các đoạn đi bộ nối vào nó được tính lại theo tọa độ mới. */
    @Transactional
    public void suaDiem(Integer maDiem, String tenDiem, String loaiDiem, Integer x, Integer y, Integer maPhong,
                        Integer maTK) {
        Map<String, Object> cu = timThay(tv.mot("SELECT MaTang, LoaiDiem FROM DiemNut WHERE MaDiem = ?", maDiem), "điểm");
        Integer maTang = (Integer) cu.get("MaTang");
        String ten = kiemTraDiem(maDiem, maTang, tenDiem, loaiDiem, x, y, maPhong);
        if (!loaiDiem.equals(cu.get("LoaiDiem")) && tv.dem("""
                SELECT COUNT(*) FROM DoanDuong WHERE (MaDiemDau = ? OR MaDiemCuoi = ?) AND LoaiDoan <> 'DI_BO'""",
                maDiem, maDiem) > 0) {
            throw new LoiNghiepVu("Điểm đang nối cầu thang / thang máy sang tầng khác, hãy xóa đoạn nối trước khi đổi loại");
        }
        tv.capNhat("UPDATE DiemNut SET TenDiem = ?, LoaiDiem = ?, ToaDoX = ?, ToaDoY = ?, MaPhong = ? WHERE MaDiem = ?",
                ten, loaiDiem, x, y, "PHONG".equals(loaiDiem) ? maPhong : null, maDiem);
        tinhLaiDoDai(maTang, maDiem);
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "DiemNut", maDiem, ten);
    }

    @Transactional
    public void xoaDiem(Integer maDiem, Integer maTK) {
        String ten = timThay(tv.giaTri("SELECT TenDiem FROM DiemNut WHERE MaDiem = ?", maDiem), "điểm");
        int soDoan = tv.capNhat("DELETE FROM DoanDuong WHERE MaDiemDau = ? OR MaDiemCuoi = ?", maDiem, maDiem);
        tv.capNhat("DELETE FROM DiemNut WHERE MaDiem = ?", maDiem);
        nhatKy.ghi(maTK, "XOA_DANH_MUC", "DiemNut", maDiem, ten + (soDoan > 0 ? " và " + soDoan + " đoạn đường nối" : ""));
    }

    private String kiemTraDiem(Integer maDiem, Integer maTang, String tenDiem, String loaiDiem, Integer x, Integer y,
                               Integer maPhong) {
        if (!LOAI_DIEM.contains(loaiDiem)) {
            throw new LoiNghiepVu("Loại điểm không hợp lệ");
        }
        if (x == null || y == null || x < 0 || y < 0 || x > 10000 || y > 10000) {
            throw new LoiNghiepVu("Tọa độ điểm không hợp lệ");
        }
        if ("PHONG".equals(loaiDiem)) {
            Map<String, Object> p = maPhong == null ? null : tv.mot("SELECT MaSoPhong, MaTang FROM Phong WHERE MaPhong = ?", maPhong);
            if (p == null) {
                throw new LoiNghiepVu("Điểm loại phòng phải gắn với một phòng");
            }
            if (!maTang.equals(p.get("MaTang"))) {
                throw new LoiNghiepVu("Phòng " + p.get("MaSoPhong") + " không thuộc tầng này");
            }
            if (tv.dem("SELECT COUNT(*) FROM DiemNut WHERE MaPhong = ? AND MaDiem <> ?", maPhong, maDiem == null ? 0 : maDiem) > 0) {
                throw new LoiNghiepVu("Phòng " + p.get("MaSoPhong") + " đã có điểm trên sơ đồ");
            }
            String ten = DanhMucService.rong(tenDiem);
            return ten != null ? ten : "Cửa " + p.get("MaSoPhong");
        }
        return batBuoc(tenDiem, "tên điểm");
    }

    // ================= Đoạn đường =================

    /**
     * Cùng tầng: đoạn đi bộ, độ dài mặc định = khoảng cách tọa độ x tỉ lệ tầng.
     * Khác tầng: cầu thang nối hai điểm cầu thang, thang máy nối hai điểm thang máy; số tầng đi qua tự tính.
     */
    @Transactional
    public Integer themDoan(Integer dau, Integer cuoi, String loaiDoan, BigDecimal doDai, Integer maTK) {
        if (dau == null || cuoi == null || dau.equals(cuoi)) {
            throw new LoiNghiepVu("Chọn hai điểm khác nhau để nối");
        }
        Map<String, Object> a = timThay(diem(dau), "điểm đầu");
        Map<String, Object> b = timThay(diem(cuoi), "điểm cuối");
        if (tv.dem("""
                SELECT COUNT(*) FROM DoanDuong WHERE (MaDiemDau = ? AND MaDiemCuoi = ?) OR (MaDiemDau = ? AND MaDiemCuoi = ?)""",
                dau, cuoi, cuoi, dau) > 0) {
            throw new LoiNghiepVu("Hai điểm đã được nối");
        }
        boolean cungTang = a.get("MaTang").equals(b.get("MaTang"));
        String loai;
        BigDecimal dai;
        int soTang;
        if (cungTang) {
            loai = "DI_BO";
            dai = doDai != null ? doDai : khoangCach(a, b);
            if (dai.signum() < 0) {
                throw new LoiNghiepVu("Độ dài không được âm");
            }
            soTang = 0;
        } else {
            loai = loaiDoan;
            if (!"CAU_THANG".equals(loai) && !"THANG_MAY".equals(loai)) {
                throw new LoiNghiepVu("Nối hai tầng phải là cầu thang hoặc thang máy");
            }
            if (!loai.equals(a.get("LoaiDiem")) || !loai.equals(b.get("LoaiDiem"))) {
                throw new LoiNghiepVu("Đoạn " + ("CAU_THANG".equals(loai) ? "cầu thang phải nối hai điểm cầu thang"
                        : "thang máy phải nối hai điểm thang máy") + " ở hai tầng");
            }
            dai = BigDecimal.ZERO;
            soTang = Math.abs(((Number) a.get("SoTang")).intValue() - ((Number) b.get("SoTang")).intValue());
        }
        tv.capNhat("INSERT INTO DoanDuong (MaDiemDau, MaDiemCuoi, LoaiDoan, DoDai, SoTang) VALUES (?, ?, ?, ?, ?)",
                dau, cuoi, loai, dai, soTang);
        Integer ma = ((Number) tv.giaTri("SELECT LAST_INSERT_ID()")).intValue();
        nhatKy.ghi(maTK, "THEM_DANH_MUC", "DoanDuong", ma, a.get("TenDiem") + " - " + b.get("TenDiem"));
        return ma;
    }

    @Transactional
    public void suaDoDai(Integer maDoan, BigDecimal doDai, Integer maTK) {
        String loai = timThay(tv.giaTri("SELECT LoaiDoan FROM DoanDuong WHERE MaDoan = ?", maDoan), "đoạn đường");
        if (!"DI_BO".equals(loai)) {
            throw new LoiNghiepVu("Chỉ sửa độ dài đoạn đi bộ");
        }
        if (doDai == null || doDai.signum() < 0 || doDai.compareTo(BigDecimal.valueOf(99999)) > 0) {
            throw new LoiNghiepVu("Độ dài không hợp lệ");
        }
        tv.capNhat("UPDATE DoanDuong SET DoDai = ? WHERE MaDoan = ?", doDai, maDoan);
        nhatKy.ghi(maTK, "SUA_DANH_MUC", "DoanDuong", maDoan, "Độ dài " + doDai.toPlainString() + " m");
    }

    @Transactional
    public void xoaDoan(Integer maDoan, Integer maTK) {
        timThay(tv.giaTri("SELECT MaDoan FROM DoanDuong WHERE MaDoan = ?", maDoan), "đoạn đường");
        tv.capNhat("DELETE FROM DoanDuong WHERE MaDoan = ?", maDoan);
        nhatKy.ghi(maTK, "XOA_DANH_MUC", "DoanDuong", maDoan, null);
    }

    private Map<String, Object> diem(Integer maDiem) {
        return tv.mot("""
                SELECT d.MaDiem, d.MaTang, d.TenDiem, d.LoaiDiem, d.ToaDoX, d.ToaDoY, t.SoTang, t.TiLe
                FROM DiemNut d JOIN Tang t ON t.MaTang = d.MaTang WHERE d.MaDiem = ?""", maDiem);
    }

    private static BigDecimal khoangCach(Map<String, Object> a, Map<String, Object> b) {
        double dx = ((Number) a.get("ToaDoX")).doubleValue() - ((Number) b.get("ToaDoX")).doubleValue();
        double dy = ((Number) a.get("ToaDoY")).doubleValue() - ((Number) b.get("ToaDoY")).doubleValue();
        return BigDecimal.valueOf(Math.hypot(dx, dy)).multiply((BigDecimal) a.get("TiLe")).setScale(1, RoundingMode.HALF_UP);
    }

    /** Tính lại độ dài đoạn đi bộ trong tầng (chỉ các đoạn nối vào maDiem nếu có). */
    private void tinhLaiDoDai(Integer maTang, Integer maDiem) {
        for (Map<String, Object> d : tv.ds("""
                SELECT dd.MaDoan, dd.MaDiemDau, dd.MaDiemCuoi FROM DoanDuong dd JOIN DiemNut a ON a.MaDiem = dd.MaDiemDau
                WHERE dd.LoaiDoan = 'DI_BO' AND a.MaTang = ?""" + (maDiem == null ? "" : " AND ? IN (dd.MaDiemDau, dd.MaDiemCuoi)"),
                maDiem == null ? new Object[] {maTang} : new Object[] {maTang, maDiem})) {
            tv.capNhat("UPDATE DoanDuong SET DoDai = ? WHERE MaDoan = ?",
                    khoangCach(diem((Integer) d.get("MaDiemDau")), diem((Integer) d.get("MaDiemCuoi"))), d.get("MaDoan"));
        }
    }

    // ================= Chỉ đường (BR22) =================

    /**
     * Đường đi nhanh nhất từ điểm tu tới điểm den (Dijkstra). tranhCauThang = true cho người đi lại khó khăn:
     * bỏ các đoạn cầu thang bộ.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> chiDuong(Integer tu, Integer den, boolean tranhCauThang) {
        Map<String, Object> diemTu = timThay(diem(tu), "điểm xuất phát");
        timThay(diem(den), "điểm đến");
        Map<Integer, List<int[]>> ke = new HashMap<>();          // điểm -> [điểm kề, mã đoạn, thời gian giây]
        for (Map<String, Object> d : tv.ds("SELECT MaDoan, MaDiemDau, MaDiemCuoi, LoaiDoan, DoDai, SoTang FROM DoanDuong")) {
            String loai = (String) d.get("LoaiDoan");
            if (tranhCauThang && "CAU_THANG".equals(loai)) {
                continue;
            }
            int giay = switch (loai) {
                case "CAU_THANG" -> 30 * ((Number) d.get("SoTang")).intValue();
                case "THANG_MAY" -> 60;
                default -> (int) Math.round(((Number) d.get("DoDai")).doubleValue());
            };
            int a = (Integer) d.get("MaDiemDau");
            int b = (Integer) d.get("MaDiemCuoi");
            int ma = (Integer) d.get("MaDoan");
            ke.computeIfAbsent(a, k -> new ArrayList<>()).add(new int[] {b, ma, giay});
            ke.computeIfAbsent(b, k -> new ArrayList<>()).add(new int[] {a, ma, giay});
        }
        Map<Integer, Integer> kc = new HashMap<>();
        Map<Integer, int[]> truoc = new HashMap<>();            // điểm -> [điểm trước, mã đoạn]
        PriorityQueue<int[]> hang = new PriorityQueue<>((x, y) -> Integer.compare(x[1], y[1]));
        kc.put(tu, 0);
        hang.add(new int[] {tu, 0});
        while (!hang.isEmpty()) {
            int[] u = hang.poll();
            if (u[1] > kc.getOrDefault(u[0], Integer.MAX_VALUE)) {
                continue;
            }
            if (u[0] == den) {
                break;
            }
            for (int[] e : ke.getOrDefault(u[0], List.of())) {
                int moi = u[1] + e[2];
                if (moi < kc.getOrDefault(e[0], Integer.MAX_VALUE)) {
                    kc.put(e[0], moi);
                    truoc.put(e[0], new int[] {u[0], e[1]});
                    hang.add(new int[] {e[0], moi});
                }
            }
        }
        if (!kc.containsKey(den)) {
            throw new LoiNghiepVu("Không có đường đi giữa hai điểm này" + (tranhCauThang ? " khi tránh cầu thang bộ" : ""));
        }
        List<Integer> diem = new ArrayList<>();
        List<Integer> doan = new ArrayList<>();
        for (Integer v = den; !v.equals(tu); v = truoc.get(v)[0]) {
            diem.add(v);
            doan.add(truoc.get(v)[1]);
        }
        diem.add((Integer) diemTu.get("MaDiem"));
        Collections.reverse(diem);
        Collections.reverse(doan);
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("TongGiay", kc.get(den));
        kq.put("Diem", diem);
        kq.put("Doan", doan);
        return kq;
    }
}
