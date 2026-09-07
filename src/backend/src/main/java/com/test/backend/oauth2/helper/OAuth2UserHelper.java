package com.test.backend.oauth2.helper;

import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.oauth2.info.GithubOAuth2UserInfo;
import com.test.backend.oauth2.info.GoogleOAuth2UserInfo;
import com.test.backend.oauth2.info.OAuth2UserInfo;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
public class OAuth2UserHelper {
    private final RestTemplate restTemplate = new RestTemplate();

    public OAuth2UserInfo assignPlatForm(String registrationId, Map<String, Object> userAttributes) {
        OAuth2UserInfo oAuth2UserInfo = null;

        if ("google".equalsIgnoreCase(registrationId)) {
            oAuth2UserInfo = new GoogleOAuth2UserInfo(userAttributes);
        } else if ("github".equalsIgnoreCase(registrationId)) {
            oAuth2UserInfo = new GithubOAuth2UserInfo(userAttributes);
        }

        if (oAuth2UserInfo == null) {
            throw new NotFoundException("Unknown Platform! Please check your registration id.");
        }

        return oAuth2UserInfo;
    }

    /**
     * Xác thực email VÀ trả về email thật sự nên dùng để tạo/tra user.
     * - Với Google (và các platform mặc định tin tưởng): trả lại chính email đã có.
     * - Với GitHub: email từ /user có thể null (nếu user để email private trên GitHub),
     *   nên phải gọi /user/emails để lấy email primary + verified thật sự.
     */
    public String resolveAndVerifyEmail(String email, String registrationId, OAuth2UserRequest userRequest) {
        if ("github".equalsIgnoreCase(registrationId)) {
            String accessToken = userRequest.getAccessToken().getTokenValue();
            String resolvedEmail = resolveGithubVerifiedEmail(accessToken, email);

            if (resolvedEmail == null) {
                throw new OAuth2AuthenticationException("Email từ nền tảng này chưa được xác thực. Không thể tự động đăng nhập!");
            }
            return resolvedEmail;
        }

        // Các nền tảng mặc định tin tưởng (như Google OIDC thường đã verified sẵn)
        return email;
    }

    /**
     * Gọi GitHub API /user/emails để tìm email verified.
     * Ưu tiên: email trùng với "email" đã có (nếu có và verified) -> email primary+verified -> bất kỳ email verified nào.
     */
    private String resolveGithubVerifiedEmail(String accessToken, String currentEmail) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    "https://api.github.com/user/emails",
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> emailList = response.getBody();
            if (emailList == null || emailList.isEmpty()) {
                System.out.println("GitHub /user/emails trả về rỗng - có thể thiếu scope 'user:email'.");
                return null;
            }

            // Ưu tiên 1: khớp với email hiện có (nếu currentEmail không null) và đã verified
            if (currentEmail != null) {
                for (Map<String, Object> emailObj : emailList) {
                    String e = (String) emailObj.get("email");
                    boolean verified = Boolean.TRUE.equals(emailObj.get("verified"));
                    if (currentEmail.equalsIgnoreCase(e) && verified) {
                        return e;
                    }
                }
            }

            // Ưu tiên 2: email primary + verified (trường hợp email GitHub bị để private)
            for (Map<String, Object> emailObj : emailList) {
                boolean isPrimary = Boolean.TRUE.equals(emailObj.get("primary"));
                boolean verified = Boolean.TRUE.equals(emailObj.get("verified"));
                if (isPrimary && verified) {
                    return (String) emailObj.get("email");
                }
            }

            // Ưu tiên 3: bất kỳ email nào đã verified
            for (Map<String, Object> emailObj : emailList) {
                boolean verified = Boolean.TRUE.equals(emailObj.get("verified"));
                if (verified) {
                    return (String) emailObj.get("email");
                }
            }
        } catch (Exception e) {
            System.out.println("Lỗi khi gọi GitHub /user/emails: " + e.getMessage());
        }
        return null;
    }
}