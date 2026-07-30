package com.test.backend.service.authentication;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@RequiredArgsConstructor
@Service
public class RefreshTokenService {

    private final StringRedisTemplate stringRedisTemplate;

    private static final String REDIS_REFRESH_TOKEN_KEY_PREFIX = "refresh_token:";

    public void saveRefreshToken(
            String refreshToken,
            Long userId,
            Long duration,
            TimeUnit timeUnit) {

        String key = REDIS_REFRESH_TOKEN_KEY_PREFIX + refreshToken;

        stringRedisTemplate.opsForValue().set(key, userId.toString(), duration, timeUnit);
    }

    public String getUserIdFromRefreshToken(String token) {

        String key = REDIS_REFRESH_TOKEN_KEY_PREFIX + token;
        return stringRedisTemplate.opsForValue().get(key);
    }

    public void deleteRefreshToken(String refreshToken) {

        String key = REDIS_REFRESH_TOKEN_KEY_PREFIX + refreshToken;

        stringRedisTemplate.delete(key);
    }

}
