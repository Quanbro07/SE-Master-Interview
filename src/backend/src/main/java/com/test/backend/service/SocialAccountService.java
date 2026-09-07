package com.test.backend.service;

import com.test.backend.entity.socialAccount.SocialAccount;
import com.test.backend.entity.socialAccount.SocialAccountProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SocialAccountService {

    public SocialAccount createSocialAccountAndReturn(SocialAccountProvider provider, String providerId) {
        return SocialAccount.builder()
                .provider(provider)
                .providerId(providerId)
                .build()
                ;
    }
}
