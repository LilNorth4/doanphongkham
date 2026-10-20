package vn.vietbac.phongkham.chung;

import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import jakarta.persistence.Tuple;
import jakarta.persistence.TupleElement;

/**
 * Truy vấn SQL gốc (native query) qua JPA cho các màn hình đọc nhiều bảng: danh sách lịch hẹn,
 * lịch trống, nhật ký... Kết quả là danh sách Map {bí danh cột: giá trị} nên JSON trả về giữ đúng
 * tên cột như MaLK, HoTen mà giao diện đang dùng.
 *
 * Tham số viết bằng dấu ? theo thứ tự; giá trị là Collection sẽ được bung thành (?, ?, ...).
 */
@Component
public class TruyVan {

    private static final DateTimeFormatter GIO_PHUT = DateTimeFormatter.ofPattern("HH:mm");

    @PersistenceContext
    private EntityManager em;

    public List<Map<String, Object>> ds(String sql, Object... thamSo) {
        @SuppressWarnings("unchecked")
        List<Tuple> dong = taoTruyVan(sql, Tuple.class, thamSo).getResultList();
        List<Map<String, Object>> kq = new ArrayList<>(dong.size());
        for (Tuple t : dong) {
            Map<String, Object> m = new LinkedHashMap<>();
            for (TupleElement<?> c : t.getElements()) {
                m.put(c.getAlias(), chuyenKieu(t.get(c)));
            }
            kq.add(m);
        }
        return kq;
    }

    /** Dòng đầu tiên hoặc null. */
    public Map<String, Object> mot(String sql, Object... thamSo) {
        List<Map<String, Object>> ds = ds(sql, thamSo);
        return ds.isEmpty() ? null : ds.get(0);
    }

    /** Giá trị cột đầu của dòng đầu, hoặc null. */
    @SuppressWarnings("unchecked")
    public <T> T giaTri(String sql, Object... thamSo) {
        List<?> ds = taoTruyVan(sql, null, thamSo).setMaxResults(1).getResultList();
        if (ds.isEmpty()) {
            return null;
        }
        Object v = ds.get(0);
        return (T) chuyenKieu(v instanceof Object[] a ? a[0] : v);
    }

    public long dem(String sql, Object... thamSo) {
        Number n = giaTri(sql, thamSo);
        return n == null ? 0 : n.longValue();
    }

    /** INSERT/UPDATE/DELETE, trả về số dòng bị ảnh hưởng. */
    public int capNhat(String sql, Object... thamSo) {
        return taoTruyVan(sql, null, thamSo).executeUpdate();
    }

    private Query taoTruyVan(String sql, Class<?> kieu, Object... thamSo) {
        // Thay đổi trên entity trong cùng giao dịch phải xuống CSDL trước để câu SQL gốc nhìn thấy
        if (em.isJoinedToTransaction()) {
            em.flush();
        }
        // Đổi ? thành ?1, ?2... và bung tham số kiểu danh sách
        List<Object> giaTri = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        int i = 0;
        for (char ch : sql.toCharArray()) {
            if (ch != '?') {
                sb.append(ch);
                continue;
            }
            Object v = thamSo[i++];
            if (v instanceof Collection<?> c) {
                if (c.isEmpty()) {
                    throw new IllegalArgumentException("Danh sách tham số rỗng");
                }
                List<String> cho = new ArrayList<>();
                for (Object x : c) {
                    giaTri.add(x);
                    cho.add("?" + giaTri.size());
                }
                sb.append(String.join(", ", cho));
            } else {
                giaTri.add(v);
                sb.append('?').append(giaTri.size());
            }
        }
        if (i != thamSo.length) {
            throw new IllegalArgumentException("Số tham số không khớp câu SQL");
        }
        Query q = kieu == null ? em.createNativeQuery(sb.toString()) : em.createNativeQuery(sb.toString(), kieu);
        for (int k = 0; k < giaTri.size(); k++) {
            q.setParameter(k + 1, giaTri.get(k));
        }
        return q;
    }

    /** Kiểu JDBC -> java.time; cột TIME (giờ khám) -> "HH:mm" như giao diện hiển thị. */
    private static Object chuyenKieu(Object v) {
        if (v instanceof java.sql.Date d) {
            return d.toLocalDate();
        }
        if (v instanceof Timestamp t) {
            return t.toLocalDateTime();
        }
        if (v instanceof Time t) {
            return t.toLocalTime().format(GIO_PHUT);
        }
        if (v instanceof LocalTime t) {
            return t.format(GIO_PHUT);
        }
        return v;
    }
}
