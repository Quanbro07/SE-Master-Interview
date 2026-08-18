package com.test.backend.service;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicLong;

@Service
public class UserMetricsService {
    private final AtomicLong activeUserCount = new AtomicLong(0);

    public UserMetricsService(MeterRegistry registry) {
        // Đăng ký gauge NGAY TỪ ĐẦU, khi app khởi động
        registry.gauge("app.users.active", activeUserCount);
    }

    public void onLogin() {
        activeUserCount.incrementAndGet();
    }

    public void onLogout() {
        activeUserCount.decrementAndGet();
    }

    // optional: để nơi khác đọc giá trị hiện tại nếu cần
    public long getCurrentActiveUsers() {
        return activeUserCount.get();
    }

}
