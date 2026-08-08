package com.test.backend.service;

import io.minio.*;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
public class FileService {
    private final MinioClient minioClient; // Nội bộ
    private final MinioClient externalMinioClient; // Sinh link

    public FileService(
            MinioClient minioClient, // Tự động lấy bean @Primary
            @Qualifier("externalMinioClient") MinioClient externalMinioClient // Lấy chính xác bean external
    ) {
        this.minioClient = minioClient;
        this.externalMinioClient = externalMinioClient;
    }

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

        Map<String, String> reqParams = new HashMap<>();
        // Ép buộc trình duyệt hiển thị trực tiếp bằng header response-content-disposition=inline
        reqParams.put("response-content-disposition", "inline");

        var presignObjectArg = GetPresignedObjectUrlArgs.builder()
                .method(Http.Method.GET)
                .object(target)
                .bucket(bucketName)
                .region("us-east-1") // Giữ lại region fix hôm qua nhé
                .extraQueryParams(reqParams) // Thêm tham số override header ở đây <--- QUAN TRỌNG
                .build();

        return externalMinioClient.getPresignedObjectUrl(presignObjectArg);
    }
}
