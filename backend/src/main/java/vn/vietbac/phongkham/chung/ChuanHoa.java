package vn.vietbac.phongkham.chung;

import java.util.regex.Pattern;

/** Chuẩn hóa và kiểm tra dữ liệu người dùng nhập (email, SĐT, mật khẩu...). */
public final class ChuanHoa {

    private static final Pattern EMAIL = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");
    private static final Pattern SDT = Pattern.compile("0\\d{9}");
    private static final Pattern CCCD = Pattern.compile("\\d{12}");

    private ChuanHoa() {
    }

    public static String email(String email) {
        String e = email == null ? "" : email.strip().toLowerCase();
        if (!EMAIL.matcher(e).matches() || e.length() > 100) {
            throw new LoiNghiepVu("Email không hợp lệ");
        }
        return e;
    }

    public static String sdt(String sdt) {
        String s = (sdt == null ? "" : sdt).replaceAll("[\\s.\\-]", "");
        if (s.startsWith("+84")) {
            s = "0" + s.substring(3);
        }
        if (!SDT.matcher(s).matches()) {
            throw new LoiNghiepVu("Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0");
        }
        return s;
    }

    public static void cccd(String cccd) {
        if (cccd != null && !CCCD.matcher(cccd).matches()) {
            throw new LoiNghiepVu("Số CCCD phải gồm 12 chữ số");
        }
    }

    /** UC1.3: người dùng nhập email hoặc số điện thoại vào cùng một ô. Trả về {tên cột, giá trị}. */
    public static String[] dinhDanh(String dinhDanh) {
        String d = dinhDanh == null ? "" : dinhDanh.strip();
        if (d.contains("@")) {
            return new String[] {"Email", email(d)};
        }
        try {
            return new String[] {"SDT", sdt(d)};
        } catch (LoiNghiepVu e) {
            throw new LoiNghiepVu("Vui lòng nhập email hoặc số điện thoại hợp lệ");
        }
    }

    /** BR15: tối thiểu 8 ký tự, có cả chữ và số. */
    public static void doManhMatKhau(String mk) {
        if (mk == null || mk.length() < 8 || mk.length() > 128
                || mk.chars().noneMatch(Character::isLetter) || mk.chars().noneMatch(Character::isDigit)) {
            throw new LoiNghiepVu("Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số");
        }
    }

    /** Gộp khoảng trắng thừa trong họ tên. */
    public static String hoTen(String hoTen) {
        return hoTen == null ? "" : hoTen.strip().replaceAll("\\s+", " ");
    }

    /** Chuỗi rỗng/toàn khoảng trắng -> null. */
    public static String rongLaNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
