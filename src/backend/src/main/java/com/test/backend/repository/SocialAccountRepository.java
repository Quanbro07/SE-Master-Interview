package com.test.backend.repository;

import com.test.backend.entity.socialAccount.SocialAccount;
import com.test.backend.entity.socialAccount.SocialAccountProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {
    Boolean existsByProviderAndProviderId(SocialAccountProvider provider, String providerId);
}
