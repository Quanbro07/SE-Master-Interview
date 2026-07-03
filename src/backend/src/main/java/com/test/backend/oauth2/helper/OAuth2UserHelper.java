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

    public void verifyEmail(String email, String registrationId, OAuth2UserRequest userRequest) {
        boolean isEmailVerified = false;

        if ("github".equalsIgnoreCase(registrationId)) {
            String accessToken = userRequest.getAccessToken().getTokenValue();
            isEmailVerified = checkGithubEmailVerified(accessToken, email);

        } else {
            // Các nền tảng mặc định tin tưởng (như Google OIDC thường đã verified sẵn)
            isEmailVerified = true;
        }

        if (!isEmailVerified) {
            throw new OAuth2AuthenticationException("Email từ nền tảng này chưa được xác thực. Không thể tự động đăng nhập!");
        }
    }

    private boolean checkGithubEmailVerified(String accessToken, String primaryEmail) {
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
            if (emailList != null) {
                for (Map<String, Object> emailObj : emailList) {
                    String email = (String) emailObj.get("email");
                    boolean verified = Boolean.TRUE.equals(emailObj.get("verified"));

                    if (email.equalsIgnoreCase(primaryEmail) && verified) {
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            System.out.println("Lỗi khi check email GitHub: " + e.getMessage());
        }
        return false;
    }
}
