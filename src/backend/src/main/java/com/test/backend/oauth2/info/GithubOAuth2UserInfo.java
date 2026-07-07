package com.test.backend.oauth2.info;

import java.util.Map;

public class GithubOAuth2UserInfo extends OAuth2UserInfo {
    public GithubOAuth2UserInfo(Map<String, Object> attributes) {
        super(attributes);
    }

    public String getId() {
        Object id = attributes.get("id");
        // Chuyển đổi an toàn từ Integer sang String nếu id không null
        return id != null ? id.toString() : null;
    }

    public String getEmail() {
        return (String) attributes.get("email");
    }

    public Boolean getIsEmailVerified() {
        return (Boolean) attributes.get("emailVerified");
    }
}
