package com.test.backend.oauth2.customUser;

import com.test.backend.oauth2.helper.OAuth2UserHelper;
import com.test.backend.oauth2.info.OAuth2UserInfo;
import com.test.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

    private final UserRepository userRepository;

    private final OAuth2UserHelper oAuth2UserHelper;

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {

        OidcUser oAuth2User = super.loadUser(userRequest);

        // Lấy tên platform
        String registrationId = userRequest.getClientRegistration().getRegistrationId();


        // Abstract Class
        OAuth2UserInfo oAuth2UserInfo = oAuth2UserHelper.assignPlatForm(registrationId, oAuth2User.getAttributes());

        // Lấy xem Email đã verified google chưa
        Boolean isEmailVerified = oAuth2UserInfo.getIsEmailVerified();


        String email = oAuth2UserInfo.getEmail();
        String providerUserId = oAuth2UserInfo.getId();

        // Check xem verify email có ko
        // Nếu ko thì đi xin verify email
        oAuth2UserHelper.verifyEmail(email, registrationId, userRequest);

        Boolean isNewUser = !userRepository.existsByEmail(email);

        return new CustomOAuth2User(oAuth2User, email, registrationId, providerUserId, isNewUser);
    }
}
