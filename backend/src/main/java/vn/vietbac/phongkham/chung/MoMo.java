package vn.vietbac.phongkham.chung;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.ObjectMapper;

/**
 * Gọi cổng thanh toán MoMo (API v2): tạo lệnh thanh toán, tra cứu trạng thái, kiểm tra chữ ký kết quả MoMo gửi về.
 * Chữ ký là HMAC-SHA256 trên chuỗi "khóa=giá trị" sắp theo thứ tự MoMo quy định, khóa bí mật không bao giờ gửi đi.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MoMo {

    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    private final ObjectMapper json;

    @Value("${phongkham.momo.endpoint}")
    private String endpoint;
    @Value("${phongkham.momo.partner-code}")
    private String partnerCode;
    @Value("${phongkham.momo.access-key}")
    private String accessKey;
    @Value("${phongkham.momo.secret-key}")
    private String secretKey;

    /** Đang dùng môi trường thử của MoMo (không trừ tiền thật). */
    public boolean laMoiTruongThu() {
        return endpoint.contains("test-payment");
    }

    /** Tạo lệnh thanh toán; trả về phản hồi MoMo (resultCode = 0 thì có payUrl để mở trang thanh toán). */
    public Map<String, Object> taoThanhToan(String maDon, long soTien, String noiDung, String redirectUrl, String ipnUrl) {
        String requestType = "payWithMethod";
        String raw = "accessKey=" + accessKey + "&amount=" + soTien + "&extraData=&ipnUrl=" + ipnUrl + "&orderId=" + maDon
                + "&orderInfo=" + noiDung + "&partnerCode=" + partnerCode + "&redirectUrl=" + redirectUrl
                + "&requestId=" + maDon + "&requestType=" + requestType;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", partnerCode);
        body.put("requestId", maDon);
        body.put("amount", soTien);
        body.put("orderId", maDon);
        body.put("orderInfo", noiDung);
        body.put("redirectUrl", redirectUrl);
        body.put("ipnUrl", ipnUrl);
        body.put("requestType", requestType);
        body.put("extraData", "");
        body.put("autoCapture", true);
        body.put("lang", "vi");
        body.put("signature", ky(raw));
        return gui("/v2/gateway/api/create", body);
    }

    /** Tra cứu trạng thái lệnh: resultCode 0 thành công, 1000 đang chờ người dùng thanh toán. */
    public Map<String, Object> traCuu(String maDon) {
        String raw = "accessKey=" + accessKey + "&orderId=" + maDon + "&partnerCode=" + partnerCode + "&requestId=" + maDon;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", partnerCode);
        body.put("requestId", maDon);
        body.put("orderId", maDon);
        body.put("lang", "vi");
        body.put("signature", ky(raw));
        return gui("/v2/gateway/api/query", body);
    }

    /** Kiểm tra chữ ký trên kết quả MoMo gửi về (chuyển hướng trình duyệt hoặc IPN), tránh bị giả mạo kết quả. */
    public boolean dungChuKy(Map<String, String> p) {
        String raw = "accessKey=" + accessKey + "&amount=" + p.getOrDefault("amount", "") + "&extraData="
                + p.getOrDefault("extraData", "") + "&message=" + p.getOrDefault("message", "") + "&orderId="
                + p.getOrDefault("orderId", "") + "&orderInfo=" + p.getOrDefault("orderInfo", "") + "&orderType="
                + p.getOrDefault("orderType", "") + "&partnerCode=" + p.getOrDefault("partnerCode", "") + "&payType="
                + p.getOrDefault("payType", "") + "&requestId=" + p.getOrDefault("requestId", "") + "&responseTime="
                + p.getOrDefault("responseTime", "") + "&resultCode=" + p.getOrDefault("resultCode", "") + "&transId="
                + p.getOrDefault("transId", "");
        String chuKy = p.getOrDefault("signature", "");
        return MessageDigest.isEqual(ky(raw).getBytes(StandardCharsets.UTF_8), chuKy.getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, Object> gui(String duong, Map<String, Object> body) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(endpoint + duong)).timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            @SuppressWarnings("unchecked")
            Map<String, Object> kq = json.readValue(res.body(), Map.class);
            return kq;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new LoiNghiepVu("Kết nối MoMo bị gián đoạn, vui lòng thử lại");
        } catch (Exception e) {
            log.warn("Gọi MoMo {} lỗi: {}", duong, e.toString());
            throw new LoiNghiepVu("Không kết nối được MoMo, vui lòng thử lại hoặc thanh toán tại quầy");
        }
    }

    private String ky(String raw) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
