package com.test.backend.service;

import com.test.backend.entity.socialAccount.SocialAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SocialAccountService {

    public SocialAccount createSocialAccountAndReturn(String provider, String providerId) {
        return SocialAccount.builder()
                .provider(provider)
                .providerId(providerId)
                .build()
                ;
    }
}
