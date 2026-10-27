package vn.vietbac.phongkham.dichvu;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.kho.GuiThongBaoRepository;
import vn.vietbac.phongkham.kho.ThongBaoRepository;
import vn.vietbac.phongkham.thucthe.GuiThongBao;
import vn.vietbac.phongkham.thucthe.ThongBao;

/**
 * Thông báo (UC1.8, UC13.1): lưu vào ThongBao và xếp hàng gửi qua các kênh trong GuiThongBao;
 * việc gửi thật (Firebase, SMTP, nền tảng nhắn tin) do worker bên ngoài đảm nhận.
 */
@Service
public class ThongBaoService {

    private final ThongBaoRepository thongBaoRepo;
    private final GuiThongBaoRepository guiRepo;
    private final TruyVan tv;
    private final DongHo dongHo;

    public ThongBaoService(ThongBaoRepository thongBaoRepo, GuiThongBaoRepository guiRepo, TruyVan tv, DongHo dongHo) {
        this.thongBaoRepo = thongBaoRepo;
        this.guiRepo = guiRepo;
        this.tv = tv;
        this.dongHo = dongHo;
    }

    /** Gửi tới tài khoản: hiện trong ứng dụng (PUSH) và qua email. */
    public Long taiKhoan(Integer maTK, String loai, String tieuDe, String noiDung, String doiTuong, Integer maDoiTuong) {
        return luu(maTK, null, loai, tieuDe, noiDung, doiTuong, maDoiTuong, List.of("PUSH", "EMAIL"));
    }

    public Long taiKhoan(Integer maTK, String loai, String tieuDe, String noiDung) {
        return taiKhoan(maTK, loai, tieuDe, noiDung, null, null);
    }

    /** Chỉ gửi email (mã OTP, mật khẩu tạm), không đẩy lên thiết bị. */
    public Long email(Integer maTK, String loai, String tieuDe, String noiDung) {
        return luu(maTK, null, loai, tieuDe, noiDung, null, null, List.of("EMAIL"));
    }

    /** Gửi tới bệnh nhân; bệnh nhân chưa có tài khoản (BR23) chỉ nhận được qua tin nhắn. */
    public Long benhNhan(Integer maBN, String loai, String tieuDe, String noiDung, String doiTuong, Integer maDoiTuong,
                         boolean quaTinNhan) {
        Integer maTK = tv.giaTri("SELECT MaTK FROM BenhNhan WHERE MaBN = ?", maBN);
        List<String> kenh = new ArrayList<>();
        if (maTK != null) {
            kenh.addAll(List.of("PUSH", "EMAIL"));
        }
        if (quaTinNhan) {
            kenh.add("TIN_NHAN");
        }
        return luu(maTK, maTK == null ? maBN : null, loai, tieuDe, noiDung, doiTuong, maDoiTuong, kenh);
    }

    /** Gửi tới mọi tài khoản đang hoạt động của một vai trò (VD: mọi lễ tân). */
    public void vaiTro(String maVaiTro, String loai, String tieuDe, String noiDung, String doiTuong, Integer maDoiTuong) {
        for (Map<String, Object> r : tv.ds("""
                SELECT tk.MaTK FROM TaiKhoan tk JOIN VaiTro vt ON vt.MaVaiTro = tk.MaVaiTro
                WHERE vt.MaCode = ? AND tk.TrangThai = 'HOAT_DONG'""", maVaiTro)) {
            taiKhoan((Integer) r.get("MaTK"), loai, tieuDe, noiDung, doiTuong, maDoiTuong);
        }
    }

    public void nhanVien(Integer maNV, String loai, String tieuDe, String noiDung, String doiTuong, Integer maDoiTuong) {
        Integer maTK = tv.giaTri("SELECT MaTK FROM NhanVien WHERE MaNV = ?", maNV);
        taiKhoan(maTK, loai, tieuDe, noiDung, doiTuong, maDoiTuong);
    }

    private Long luu(Integer maTK, Integer maBN, String loai, String tieuDe, String noiDung, String doiTuong,
                     Integer maDoiTuong, List<String> kenh) {
        ThongBao tb = new ThongBao();
        tb.setMaTKNhan(maTK);
        tb.setMaBN(maBN);
        tb.setLoaiSuKien(loai);
        tb.setTieuDe(tieuDe);
        tb.setNoiDung(noiDung);
        tb.setLoaiDoiTuong(doiTuong);
        tb.setMaDoiTuong(maDoiTuong);
        tb.setThoiGianTao(dongHo.bayGio());
        thongBaoRepo.save(tb);
        kenh.forEach(k -> guiRepo.save(new GuiThongBao(tb.getMaTB(), k)));
        return tb.getMaTB();
    }

    // ---------- UC1.8: người dùng xem thông báo ----------

    @Transactional(readOnly = true)
    public Map<String, Object> cuaTaiKhoan(Integer maTK) {
        List<Map<String, Object>> ds = thongBaoRepo.findByMaTKNhanOrderByMaTBDesc(maTK, PageRequest.of(0, 30))
                .stream().map(ThongBaoService::sangMap).toList();
        Map<String, Object> kq = new LinkedHashMap<>();
        kq.put("chua_doc", thongBaoRepo.countByMaTKNhanAndDaDocFalse(maTK));
        kq.put("ds", ds);
        return kq;
    }

    @Transactional
    public void danhDauDaDoc(Integer maTK, Long maTB) {
        if (maTB == null) {
            thongBaoRepo.docHet(maTK);
        } else if (thongBaoRepo.daDoc(maTK, maTB) == 0) {
            throw new KhongTimThay("Không tìm thấy thông báo");          // của người khác coi như không tồn tại
        }
    }

    private static Map<String, Object> sangMap(ThongBao t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("MaTB", t.getMaTB());
        m.put("MaTKNhan", t.getMaTKNhan());
        m.put("MaBN", t.getMaBN());
        m.put("LoaiSuKien", t.getLoaiSuKien());
        m.put("TieuDe", t.getTieuDe());
        m.put("NoiDung", t.getNoiDung());
        m.put("LoaiDoiTuong", t.getLoaiDoiTuong());
        m.put("MaDoiTuong", t.getMaDoiTuong());
        m.put("DaDoc", Boolean.TRUE.equals(t.getDaDoc()));
        m.put("ThoiGianTao", t.getThoiGianTao());
        return m;
    }
}
