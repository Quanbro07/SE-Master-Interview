package com.test.backend.service;

import io.minio.*;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

@RequiredArgsConstructor
@Service
public class FileService {
    private final MinioClient minioClient;

    public String uploadFile(
            String bucketName,
            byte[] fileData,
            String contentType,
            String target) throws MinioException, IOException {
        boolean isBucketExist = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());

        if(!isBucketExist) {
            throw new RuntimeException("Bucket does not exists");
        }
        try (InputStream inputStream = new ByteArrayInputStream(fileData)) {
            var putObjectArg = PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(target)
                    .stream(inputStream, (long) fileData.length, -1L)
                    .contentType(contentType)
                    .build();

            minioClient.putObject(putObjectArg);
        }
        //

        var presignObjectArg = GetPresignedObjectUrlArgs.builder()
                .method(Http.Method.GET)
                .object(target)
                .bucket(bucketName)
                .build();

        return minioClient.getPresignedObjectUrl(presignObjectArg);
    }
}
