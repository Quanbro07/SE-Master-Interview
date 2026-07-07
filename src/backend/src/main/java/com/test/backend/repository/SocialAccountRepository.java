package com.test.backend.repository;

import com.test.backend.entity.socialAccount.SocialAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {
    Boolean existsByProviderAndProviderId(String provider, String providerId);
}
