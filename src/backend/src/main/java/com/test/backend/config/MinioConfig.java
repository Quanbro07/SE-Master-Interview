package com.test.backend.config;

import io.minio.BucketExistsArgs;
import io.minio.Http;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.errors.MinioException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class MinioConfig {
    @Value("${minio.server.url}")
    private String minioUrl;

    // Thêm một biến URL dùng cho bên ngoài.
    // Nếu bạn không khai báo trong application.properties, nó mặc định lấy http://localhost:9000
    @Value("${minio.external.url:http://localhost:9000}")
    private String minioExternalUrl;

    @Value("${minio.access.key}")
    private String accessKey;

    @Value("${minio.secret.key}")
    private String secretKey;

    @Primary
    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(minioUrl)
                .credentials(accessKey, secretKey)
                .build();
    }

    @Bean(name = "externalMinioClient")
    public MinioClient externalMinioClient() {
        return MinioClient.builder()
                .endpoint(minioExternalUrl)
                .credentials(accessKey, secretKey)
                .region("us-east-1")
                .build();
    }

}