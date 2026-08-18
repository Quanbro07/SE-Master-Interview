package com.test.backend.config;

import com.test.backend.repository.UserRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MetricsConfig {
    @Bean
    public UserRepository bindUserGauge(MeterRegistry registry, UserRepository userRepository) {
        registry.gauge("app.users.total", userRepository, repo -> (double) repo.count());
        return userRepository;
    }
}
