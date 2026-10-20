package vn.vietbac.phongkham.xacthuc;

import java.util.List;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.RequiredArgsConstructor;
import vn.vietbac.phongkham.chung.LuuAnh;

/**
 * Đăng ký interceptor xác thực, cho phép controller nhận tham số NguoiDung của phiên hiện tại,
 * và phục vụ ảnh người dùng tải lên tại /api/tep/**.
 */
@Configuration
@RequiredArgsConstructor
public class CauHinhWeb implements WebMvcConfigurer {

    private final XacThucInterceptor xacThucInterceptor;
    private final LuuAnh luuAnh;

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
