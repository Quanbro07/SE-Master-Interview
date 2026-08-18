package com.test.backend.service;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class ActiveUserGaugeUpdater {
    private static final String REFRESH_TOKEN_PREFIX = "refresh_token:";

    private final StringRedisTemplate redisTemplate;

    private final AtomicLong activeUserGauge = new AtomicLong(0);


    public ActiveUserGaugeUpdater(StringRedisTemplate redisTemplate, MeterRegistry registry) {
        this.redisTemplate = redisTemplate;
        registry.gauge("app.users.active", activeUserGauge);
    }

    @Scheduled(fixedRate = 30000) // đếm lại mỗi 30s, không phải mỗi lần scrape
    public void refresh() {
        Set<String> activeUserIds = new HashSet<>();

        ScanOptions options = ScanOptions.scanOptions()
                .match(REFRESH_TOKEN_PREFIX + "*")
                .count(500)
                .build();


        try (RedisConnection connection = redisTemplate.getConnectionFactory().getConnection();
             Cursor<byte[]> cursor = connection.scan(options)) {


            while (cursor.hasNext()) {
                String key = new String(cursor.next());
                String userId = redisTemplate.opsForValue().get(key);
                if (userId != null) {
                    activeUserIds.add(userId);
                }
            }
        }

        activeUserGauge.set(activeUserIds.size());
    }

}
