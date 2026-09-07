package com.test.backend.service;

import io.minio.*;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;
import java.util.HashMap;
import java.util.Map;

@Slf4j
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
        String originalName,
        String target) throws MinioException, IOException {
    boolean isBucketExist = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());

    if(!isBucketExist) {
        throw new RuntimeException("Bucket does not exists");
    }

    contentType = this.guessContentType(contentType, originalName);

    try (InputStream inputStream = new ByteArrayInputStream(fileData)) {
        var putObjectArg = PutObjectArgs.builder()
                .bucket(bucketName)
                .object(target)
                .stream(inputStream, (long) fileData.length, -1L)
                .contentType(contentType)
                .build();

        minioClient.putObject(putObjectArg);
    }

    return getPresignedUrl(bucketName, target, contentType);
}

// Overload: dùng khi không biết contentType gốc (ví dụ lúc build response, không upload lại)
    public String getPresignedUrl(String bucketName, String target) throws MinioException, IOException {
        String guessedType = URLConnection.guessContentTypeFromName(target);
        if (guessedType == null) guessedType = "application/octet-stream";
        return getPresignedUrl(bucketName, target, guessedType);
    }

// Method dùng chung, tách từ logic presign cũ trong uploadFile()
    public String getPresignedUrl(String bucketName, String target, String contentType) throws MinioException, IOException {
        Map<String, String> reqParams = new HashMap<>();
        reqParams.put("response-content-disposition", "inline");
        reqParams.put("response-content-type", contentType);

        var presignObjectArg = GetPresignedObjectUrlArgs.builder()
                .method(Http.Method.GET)
                .object(target)
                .bucket(bucketName)
                .region("us-east-1")
                .extraQueryParams(reqParams)
                .build();

        return externalMinioClient.getPresignedObjectUrl(presignObjectArg);
    }

    private String guessContentType(String contentType, String originalFileName) {

        if (contentType == null || contentType.equals("application/octet-stream")) {
            contentType = URLConnection.guessContentTypeFromName(originalFileName);

            // Nếu Java cũng chịu thua (trả về null), thì ép về octet-stream để ít nhất file vẫn lưu được
            if (contentType == null) {
                contentType = "application/octet-stream";
            }
        }

        return contentType;
    }
}
