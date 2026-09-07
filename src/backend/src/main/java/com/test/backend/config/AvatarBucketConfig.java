package com.test.backend.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.errors.MinioException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@RequiredArgsConstructor
@Configuration
public class AvatarBucketConfig {
    @Value("${minio.bucket.avatar}")
    private String cvBucketName;

    private final MinioClient minioClient;

    @PostConstruct
    public void initCVBucket() {
        try {
            boolean isBucketExist = minioClient.bucketExists(BucketExistsArgs.builder().bucket(cvBucketName).build());
            if(!isBucketExist) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(cvBucketName).build());

            }

        } catch (MinioException e) {
            throw new RuntimeException("ERROR create Avatar Bucket");
        }
    }

    public String getAvatarBucketName() {
        return cvBucketName;
    }
}
