package vn.vietbac.phongkham.dichvu;

import java.time.LocalDate;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import vn.vietbac.phongkham.chung.ChuanHoa;
import vn.vietbac.phongkham.chung.DongHo;
import vn.vietbac.phongkham.chung.KhongTimThay;
import vn.vietbac.phongkham.chung.LoiNghiepVu;
import vn.vietbac.phongkham.chung.LuuAnh;
import vn.vietbac.phongkham.chung.TruyVan;
import vn.vietbac.phongkham.kho.BenhNhanRepository;
import vn.vietbac.phongkham.kho.NhanVienRepository;
import vn.vietbac.phongkham.thucthe.BenhNhan;
import vn.vietbac.phongkham.thucthe.NhanVien;
import vn.vietbac.phongkham.xacthuc.NguoiDung;

/**
 * Hồ sơ cá nhân của người đang đăng nhập (mọi vai trò): xem chi tiết, tự sửa thông tin cơ bản, đổi ảnh đại diện.
 * Email và SĐT là định danh đăng nhập nên không sửa ở đây.
 */
@Service
public class HoSoService {

    private static final String THU_MUC_ANH = "anh-dai-dien";

    private final TruyVan tv;
    private final DongHo dongHo;
    private final LuuAnh luuAnh;
    private final BenhNhanRepository benhNhanRepo;
    private final NhanVienRepository nhanVienRepo;
    private final NhatKyService nhatKy;
    private final TiepDonService tiepDon;

    public HoSoService(TruyVan tv, DongHo dongHo, LuuAnh luuAnh, BenhNhanRepository benhNhanRepo, NhanVienRepository nhanVienRepo, NhatKyService nhatKy, TiepDonService tiepDon) {
        this.tv = tv;
        this.dongHo = dongHo;
        this.luuAnh = luuAnh;
        this.benhNhanRepo = benhNhanRepo;
        this.nhanVienRepo = nhanVienRepo;
        this.nhatKy = nhatKy;
        this.tiepDon = tiepDon;
    }

    /** Thông tin sửa được; trường không thuộc vai trò (VD GioiThieu với bệnh nhân) bị bỏ qua. */
    public record CapNhat(String hoTen, LocalDate ngaySinh, String gioiTinh, String diaChi, String cccd,
                          String nguoiLienHe, String sdtNguoiLienHe, String gioiThieu) {
    }

    @Transactional(readOnly = true)
    public Map<String, Object> xem(NguoiDung nd) {
        if (nd.maBN() != null) {
            Map<String, Object> bn = tv.mot("""
                    SELECT bn.MaBN, bn.HoTen, bn.NgaySinh, bn.GioiTinh, bn.CCCD, bn.DiaChi, bn.AnhDaiDien,
                           bn.NguoiLienHe, bn.SDTNguoiLienHe, bn.DiUng, bn.NgayTao,
                           tk.Email, tk.SDT, tk.LanDangNhapCuoi, vt.TenVaiTro
                    FROM BenhNhan bn JOIN TaiKhoan tk ON tk.MaTK = bn.MaTK JOIN VaiTro vt ON vt.MaVaiTro = tk.MaVaiTro
                    WHERE bn.MaBN = ?""", nd.maBN());
            // Thẻ BHYT do lễ tân nhập lúc đăng ký; bệnh nhân chỉ xem
            bn.put("TheBHYT", tiepDon.theBhyt(nd.maBN()));
            return bn;
        }
        if (nd.maNV() != null) {
            return tv.mot("""
                    SELECT nv.MaNV, nv.HoTen, nv.NgaySinh, nv.GioiTinh, nv.DiaChi, nv.AnhDaiDien, nv.LoaiNhanVien,
                           nv.HocHamHocVi, nv.SoNamKinhNghiem, nv.GioiThieu, nv.DiemDanhGiaTB, nv.SoLuotDanhGia,
                           ck.TenCK, p.MaSoPhong, p.TenPhong,
                           tk.Email, tk.SDT, tk.NgayTao, tk.LanDangNhapCuoi, vt.TenVaiTro
                    FROM NhanVien nv JOIN TaiKhoan tk ON tk.MaTK = nv.MaTK JOIN VaiTro vt ON vt.MaVaiTro = tk.MaVaiTro
                    LEFT JOIN ChuyenKhoa ck ON ck.MaCK = nv.MaCK LEFT JOIN Phong p ON p.MaPhong = nv.MaPhongPhuTrach
                    WHERE nv.MaNV = ?""", nd.maNV());
        }
        throw new KhongTimThay("Tài khoản chưa có hồ sơ");
    }

    @Transactional
    public Map<String, Object> capNhat(NguoiDung nd, CapNhat b) {
        String hoTen = ChuanHoa.hoTen(b.hoTen());
        if (hoTen.isEmpty() || hoTen.length() > 100) {
            throw new LoiNghiepVu("Họ tên không được để trống, tối đa 100 ký tự");
        }
        if (b.ngaySinh() != null && (b.ngaySinh().isAfter(dongHo.homNay()) || b.ngaySinh().getYear() < 1900)) {
            throw new LoiNghiepVu("Ngày sinh không hợp lệ");
        }
        if (b.gioiTinh() != null && !"NAM".equals(b.gioiTinh()) && !"NU".equals(b.gioiTinh())) {
            throw new LoiNghiepVu("Giới tính không hợp lệ");
        }
        String diaChi = gioiHan(b.diaChi(), 255, "Địa chỉ");

        if (nd.maBN() != null) {
            BenhNhan bn = benhNhanRepo.findById(nd.maBN()).orElseThrow();
            if (b.ngaySinh() == null || b.gioiTinh() == null) {
                throw new LoiNghiepVu("Vui lòng nhập ngày sinh và giới tính");
            }
            String cccd = ChuanHoa.rongLaNull(b.cccd());
            // CCCD dùng để gắn hồ sơ (BR23): bệnh nhân chỉ tự nhập khi còn trống, đã có thì nhờ lễ tân sửa
            if (bn.getCccd() == null && cccd != null) {
                ChuanHoa.cccd(cccd);
                if (benhNhanRepo.existsByCccd(cccd)) {
                    throw new LoiNghiepVu("Số CCCD đã thuộc hồ sơ khác, vui lòng liên hệ lễ tân");
                }
                bn.setCccd(cccd);
            }
            String sdtLienHe = ChuanHoa.rongLaNull(b.sdtNguoiLienHe());
            bn.setHoTen(hoTen);
            bn.setNgaySinh(b.ngaySinh());
            bn.setGioiTinh(b.gioiTinh());
            bn.setDiaChi(diaChi);
            bn.setNguoiLienHe(gioiHan(b.nguoiLienHe(), 100, "Tên người liên hệ"));
            bn.setSdtNguoiLienHe(sdtLienHe == null ? null : ChuanHoa.sdt(sdtLienHe));
        } else if (nd.maNV() != null) {
            NhanVien nv = nhanVienRepo.findById(nd.maNV()).orElseThrow();
            nv.setHoTen(hoTen);
            nv.setNgaySinh(b.ngaySinh());
            nv.setGioiTinh(b.gioiTinh());
            nv.setDiaChi(diaChi);
            if ("BAC_SI".equals(nv.getLoaiNhanVien())) {
                nv.setGioiThieu(gioiHan(b.gioiThieu(), 2000, "Giới thiệu"));
            }
        } else {
            throw new KhongTimThay("Tài khoản chưa có hồ sơ");
        }
        nhatKy.taiKhoan(nd.maTK(), "CAP_NHAT_HO_SO", nd.maTK(), "Tự cập nhật thông tin cá nhân");
        return xem(nd);
    }

    /** Thay ảnh đại diện; ảnh cũ bị xóa khỏi đĩa sau khi lưu ảnh mới. */
    @Transactional
    public Map<String, Object> doiAnh(NguoiDung nd, MultipartFile tep) {
        String moi = luuAnh.luu(tep, THU_MUC_ANH, "tk" + nd.maTK());
        luuAnh.xoa(ganAnh(nd, moi));
        return Map.of("AnhDaiDien", moi);
    }

    @Transactional
    public void xoaAnh(NguoiDung nd) {
        luuAnh.xoa(ganAnh(nd, null));
    }

    /** Ghi đường dẫn ảnh mới vào hồ sơ, trả về đường dẫn ảnh cũ. */
    private String ganAnh(NguoiDung nd, String duongDan) {
        String cu;
        if (nd.maBN() != null) {
            BenhNhan bn = benhNhanRepo.findById(nd.maBN()).orElseThrow();
            cu = bn.getAnhDaiDien();
            bn.setAnhDaiDien(duongDan);
        } else if (nd.maNV() != null) {
            NhanVien nv = nhanVienRepo.findById(nd.maNV()).orElseThrow();
            cu = nv.getAnhDaiDien();
            nv.setAnhDaiDien(duongDan);
        } else {
            luuAnh.xoa(duongDan);
            throw new KhongTimThay("Tài khoản chưa có hồ sơ");
        }
        return cu;
    }

    private static String gioiHan(String s, int toiDa, String ten) {
        String v = ChuanHoa.rongLaNull(s);
        if (v != null && v.length() > toiDa) {
            throw new LoiNghiepVu(ten + " tối đa " + toiDa + " ký tự");
        }
        return v;
    }
}
