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
        //

        Map<String, String> reqParams = new HashMap<>();
        // Ép buộc trình duyệt hiển thị trực tiếp bằng header response-content-disposition=inline
        reqParams.put("response-content-disposition", "inline");

        log.info(contentType);
        reqParams.put("response-content-type", contentType);

        var presignObjectArg = GetPresignedObjectUrlArgs.builder()
                .method(Http.Method.GET)
                .object(target)
                .bucket(bucketName)
                .region("us-east-1") // Giữ lại region fix hôm qua nhé
                .extraQueryParams(reqParams) // Thêm tham số override header ở đây <--- QUAN TRỌNG
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
