package com.test.backend.oauth2.customUser;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Map;

@Getter
public class CustomOAuth2User implements OidcUser {
    // OAuth2
    private String email;
    private String provider;
    private String providerUserId;
    private Boolean isNewUser;

    // Oidc
    private final OidcIdToken idToken;
    private final OidcUserInfo userInfo;

    private final Map<String, Object> attributes;
    private final Collection<? extends GrantedAuthority> authorities;


    // OAuth2User Constructor
    public CustomOAuth2User(OAuth2User oAuth2User,
                            String email, String provider,
                            String providerUserId,
                            Boolean isNewUser) {
        this.email = email;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.isNewUser = isNewUser;

        this.attributes = oAuth2User.getAttributes();
        this.authorities = oAuth2User.getAuthorities();

        this.idToken = null; // OAuth2 thường không có ID Token
        this.userInfo = null;

    }

    public CustomOAuth2User(OidcUser oidcUser,
                            String email, String provider,
                            String providerUserId,
                            Boolean isNewUser) {
        this.email = email;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.isNewUser = isNewUser;

        this.attributes = oidcUser.getAttributes();
        this.authorities = oidcUser.getAuthorities();
        this.idToken = oidcUser.getIdToken();   // Lấy ID Token gốc từ Google
        this.userInfo = oidcUser.getUserInfo(); // Lấy UserInfo gốc từ Google
    }

    // OAuth2
    @Override
    public String getName() {
        return this.email;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return this.attributes; // Trả về chuẩn Map gốc từ Google/GitHub
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return this.authorities; // Trả về quyền hạn gốc
    }

    // Oidc
    @Override
    public Map<String, Object> getClaims() {
        return this.idToken != null ? this.idToken.getClaims() : Map.of();
    }

    @Override
    public OidcUserInfo getUserInfo() {
        return this.userInfo;
    }

    @Override
    public OidcIdToken getIdToken() {
        return this.idToken;
    }
}
