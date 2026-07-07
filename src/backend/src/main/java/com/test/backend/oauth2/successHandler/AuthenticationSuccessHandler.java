package com.test.backend.oauth2.successHandler;

import com.test.backend.oauth2.customUser.CustomOAuth2User;
import com.test.backend.service.jwt.JwtService;
import com.test.backend.service.jwt.TokenType;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;

    @Value("${authentication.redirect_url}")
    private String redirectUrl;

    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication)
            throws IOException, ServletException {

        CustomOAuth2User oAuth2User = (CustomOAuth2User) authentication.getPrincipal();

        System.out.println("Tới Success Handler");

        String targetUrl;
        String regToken;

        Map<String, Object> claims = new HashMap<>();
        claims.put("provider", oAuth2User.getProvider());
        claims.put("providerUserId", oAuth2User.getProviderUserId());
        claims.put("type", "PRE_AUTH");

        if (oAuth2User.getIsNewUser()) {
            // User mới

            // Gọi hàm overload mới, truyền email làm subject
            regToken = jwtService.generateToken(claims, oAuth2User.getEmail(), TokenType.TEMP);


            // Redirect về trang bổ sung thông tin của Frontend kèm token tạm thời
            targetUrl = redirectUrl + regToken + "&purpose=REGISTRATION";
        }
        else {

            // Tạo token tạm để gọi authenticate lấy acess token và refresh token
            regToken = jwtService.generateToken(claims, oAuth2User.getEmail(), TokenType.TEMP);

            targetUrl = redirectUrl + regToken + "&purpose=AUTHENTICATION";
        }

        System.out.println(regToken);

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

}
