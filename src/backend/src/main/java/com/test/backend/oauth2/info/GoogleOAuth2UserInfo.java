package com.test.backend.oauth2.info;

import java.util.Map;

public class GoogleOAuth2UserInfo extends OAuth2UserInfo {
    public GoogleOAuth2UserInfo(Map<String, Object> attributes) {
        super(attributes);
    }

    public String getId() {
        return (String) attributes.get("sub");
    }

    public String getEmail() {
        return (String) attributes.get("email");
    }

    public Boolean getIsEmailVerified() {
        return (Boolean) attributes.get("emailVerified");
    }
}
