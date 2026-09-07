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

        String email = oAuth2UserInfo.getEmail();
        String providerUserId = oAuth2UserInfo.getId();

        // Check + verify email (với Google, hàm này chỉ trả lại chính email đã có,
        // vì Google OIDC luôn coi email là đã verified sẵn)
        String verifiedEmail = oAuth2UserHelper.resolveAndVerifyEmail(email, registrationId, userRequest);

        Boolean isNewUser = !userRepository.existsByEmail(verifiedEmail);

        return new CustomOAuth2User(oAuth2User, verifiedEmail, registrationId, providerUserId, isNewUser);
    }
}