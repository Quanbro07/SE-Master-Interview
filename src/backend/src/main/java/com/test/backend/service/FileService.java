package com.test.backend.service;

import io.minio.*;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RequiredArgsConstructor
@Service
public class FileService {
    private final MinioClient minioClient;

    public String uploadFile(
            String bucketName,
            MultipartFile file,
            String target) throws MinioException, IOException {
        boolean isBucketExist = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());

        if(!isBucketExist) {
            throw new RuntimeException("Bucket does not exists");
        }

        var putObjectArg = PutObjectArgs.builder()
                .bucket(bucketName)
                .object(target)
                .stream(file.getInputStream(), file.getSize(), -1L)
                .contentType(file.getContentType())
                .build();

        //
        minioClient.putObject(putObjectArg);

        var presignObjectArg = GetPresignedObjectUrlArgs.builder()
                .method(Http.Method.GET)
                .object(target)
                .bucket(bucketName)
                .build();

        return minioClient.getPresignedObjectUrl(presignObjectArg);

    }
}
