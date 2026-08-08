package com.test.backend.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.function.Supplier;

@RequiredArgsConstructor
@Service
public class RateLimitService {
    private static final int REQUEST_CAPACITY = 100;
    private static final int REQUEST_PER_MINIUTE = 10;

    private final ProxyManager<byte[]> proxyManager;

    public Bucket resolveBucket(String key) {
        Supplier<BucketConfiguration> configSupplier = this::getconfig;

        return proxyManager.builder()
                .build(key.getBytes(), configSupplier);
    }

    private BucketConfiguration getconfig() {
        var limit = Bandwidth.builder()
                .capacity(REQUEST_CAPACITY)
                .refillIntervally(REQUEST_PER_MINIUTE, Duration.ofMinutes(1))
                .build()
                ;

        return BucketConfiguration.builder()
                .addLimit(limit)
                .build();
    }
}

