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
public class CVBucketConfig {
    @Value("${minio.bucket.cv}")
    private String cVbucketName;

    private final MinioClient minioClient;

    @PostConstruct
    public void initCVBucket() {
        try {
            boolean isBucketExist = minioClient.bucketExists(BucketExistsArgs.builder().bucket(cVbucketName).build());
            if(!isBucketExist) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(cVbucketName).build());

            }

        } catch (MinioException e) {
            throw new RuntimeException("ERROR create CV Bucket");
        }
    }
}
