package vn.vietbac.phongkham.chung;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * Băm mật khẩu PBKDF2-SHA256, lưu dạng pbkdf2_sha256$vòng_lặp$salt$hash.
 * Salt là chuỗi hex dùng trực tiếp làm byte UTF-8, khớp với các hash đã có trong CSDL.
 */
public final class MatKhau {

    private static final SecureRandom NGAU_NHIEN = new SecureRandom();
    private static final int VONG_LAP = 100_000;
    private static final String KY_TU = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private MatKhau() {
    }

    public static String bam(String matKhau) {
        String salt = HexFormat.of().formatHex(ngauNhien(16));
        return "pbkdf2_sha256$" + VONG_LAP + "$" + salt + "$" + pbkdf2(matKhau, salt, VONG_LAP);
    }

    public static boolean kiemTra(String matKhau, String chuoiHash) {
        try {
            String[] p = chuoiHash.split("\\$");
            if (p.length != 4 || !p[0].equals("pbkdf2_sha256")) {
                return false;
            }
            String tinh = pbkdf2(matKhau == null ? "" : matKhau, p[2], Integer.parseInt(p[1]));
            return MessageDigest.isEqual(tinh.getBytes(StandardCharsets.US_ASCII), p[3].getBytes(StandardCharsets.US_ASCII));
        } catch (RuntimeException e) {
            return false;
        }
    }

    private static String pbkdf2(String matKhau, String salt, int vongLap) {
        try {
            PBEKeySpec spec = new PBEKeySpec(matKhau.toCharArray(), salt.getBytes(StandardCharsets.UTF_8), vongLap, 256);
            byte[] h = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            return HexFormat.of().formatHex(h);
        } catch (Exception e) {
            throw new IllegalStateException("Không băm được mật khẩu", e);
        }
    }

    /** Token phiên đăng nhập ngẫu nhiên (43 ký tự base64url). */
    public static String token() {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(ngauNhien(32));
    }

    public static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest((s == null ? "" : s).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** Mã OTP 6 chữ số. */
    public static String otp() {
        return String.format("%06d", NGAU_NHIEN.nextInt(1_000_000));
    }

    /** Mật khẩu tạm 10 ký tự thỏa BR15 (có chữ và số). */
    public static String matKhauTam() {
        while (true) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 10; i++) {
                sb.append(KY_TU.charAt(NGAU_NHIEN.nextInt(KY_TU.length())));
            }
            String mk = sb.toString();
            if (mk.chars().anyMatch(Character::isLetter) && mk.chars().anyMatch(Character::isDigit)) {
                return mk;
            }
        }
    }

    private static byte[] ngauNhien(int n) {
        byte[] b = new byte[n];
        NGAU_NHIEN.nextBytes(b);
        return b;
    }
}
