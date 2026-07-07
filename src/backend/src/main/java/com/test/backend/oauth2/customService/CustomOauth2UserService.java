package com.test.backend.oauth2.customService;

import com.test.backend.oauth2.customUser.CustomOAuth2User;
import com.test.backend.oauth2.helper.OAuth2UserHelper;
import com.test.backend.oauth2.info.OAuth2UserInfo;
import com.test.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomOauth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    private final OAuth2UserHelper oauth2UserHelper;

    public OAuth2User loadUser(OAuth2UserRequest userRequest)
            throws OAuth2AuthenticationException {

        OAuth2User oAuth2User = super.loadUser(userRequest);

        // Lay ten platform
        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        OAuth2UserInfo oAuth2UserInfo = oauth2UserHelper.assignPlatForm(registrationId, oAuth2User.getAttributes());

        Boolean isEmailVerified = oAuth2UserInfo.getIsEmailVerified();

        String email = oAuth2UserInfo.getEmail();

        String providerUserId = oAuth2UserInfo.getId();

        oauth2UserHelper.verifyEmail(email, registrationId, userRequest);

        Boolean isNewUser = !userRepository.existsByEmail(email);

        return new CustomOAuth2User(oAuth2User, email, registrationId, providerUserId, isNewUser);
    }

}
