package vn.vietbac.phongkham.xacthuc;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.chung.LuuAnh;

/**
 * Đăng ký interceptor xác thực, cho phép controller nhận tham số NguoiDung của phiên hiện tại,
 * phục vụ ảnh người dùng tải lên tại /api/tep/** và giao diện web đã build.
 */
@Configuration
@RequiredArgsConstructor
public class CauHinhWeb implements WebMvcConfigurer {

    private final XacThucInterceptor xacThucInterceptor;
    private final LuuAnh luuAnh;

    @Value("${phongkham.thu-muc-web}")
    private String thuMucWeb;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(xacThucInterceptor).addPathPatterns("/api/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Tên file ngẫu nhiên, không đổi nội dung sau khi lưu nên cho trình duyệt nhớ lâu
        registry.addResourceHandler(LuuAnh.DUONG_DAN_WEB + "**")
                .addResourceLocations(luuAnh.thuMuc().toUri().toString())
                .setCachePeriod(30 * 24 * 3600);

        // Giao diện đã build (web/dist) chạy chung cổng với API: mở http://localhost:8080 là dùng được.
        // Đường dẫn của React Router (VD /bac-si/kham/19) không phải file nên trả index.html; /api/** không trả.
        // Chạy bằng Docker thì Nginx phục vụ giao diện, thư mục này không có và handler không trả gì.
        Path web = Path.of(thuMucWeb).toAbsolutePath().normalize();
        registry.addResourceHandler("/**")
                .addResourceLocations(web.toUri().toString())
                .setCacheControl(CacheControl.noCache())
                .resourceChain(false)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String duongDan, Resource thuMuc) throws IOException {
                        if (duongDan.startsWith("api/")) {
                            return null;
                        }
                        Resource tep = super.getResource(duongDan, thuMuc);
                        if (tep != null || duongDan.contains(".")) {
                            return tep;
                        }
                        return super.getResource("index.html", thuMuc);
                    }
                });
    }

    /** Đường dẫn gốc rỗng không qua được handler tài nguyên ở trên nên chuyển thẳng sang index.html. */
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter p) {
                return p.getParameterType() == NguoiDung.class;
            }

            @Override
            public Object resolveArgument(MethodParameter p, ModelAndViewContainer mav, NativeWebRequest req,
                                          WebDataBinderFactory binder) {
                return req.getAttribute(XacThucInterceptor.THUOC_TINH, RequestAttributes.SCOPE_REQUEST);
            }
        });
    }
}
