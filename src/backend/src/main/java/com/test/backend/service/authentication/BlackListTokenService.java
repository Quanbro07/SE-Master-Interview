package com.test.backend.service.authentication;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@RequiredArgsConstructor
@Service
public class BlackListTokenService {
    private final StringRedisTemplate stringRedisTemplate;

    private static final String BLACKLIST_TOKEN_KEY_PREFIX = "blacklist:token_";

    public void addTokenToBlacklist(String token, long remainingTime) {
        String key = BLACKLIST_TOKEN_KEY_PREFIX + token;

        stringRedisTemplate.opsForValue().set(key, "invalid", Duration.ofMillis(remainingTime));
    }

    public boolean isTokenBlacklisted(String token) {
        String key = BLACKLIST_TOKEN_KEY_PREFIX + token;
        // Trả về true nếu key tồn tại trong Redis
        return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
    }
}
