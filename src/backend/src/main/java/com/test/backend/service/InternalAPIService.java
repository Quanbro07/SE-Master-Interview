package com.test.backend.service;

import com.test.backend.dto.cvAssessment.CVAssessmentResponse;
import com.test.backend.exception.customException.ExternalServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RequiredArgsConstructor
@Service
public class InternalAPIService {

    @Value("${internal.url}")
    private String internalUrl;

    @Value("${internal.cv-assessment.endpoint}")
    private String cvAssessmentEndpoint;

    private final RestTemplate restTemplate;

    public CVAssessmentResponse assessCV(MultipartFile file, String position) {
        String url = internalUrl + cvAssessmentEndpoint;

        try {
            // Header dê gui file
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            // TRICK QUAN TRỌNG: Phải override hàm getFilename() nếu dùng ByteArrayResource
            ByteArrayResource fileAsResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };

            body.add("file", fileAsResource);
            body.add("position", position);

            // Đóng gói Header + Body
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<CVAssessmentResponse> response = restTemplate.postForEntity(
                    url,
                    requestEntity,
                    CVAssessmentResponse.class
            );

            return response.getBody();
        }
        catch (IOException e) {
            throw new RuntimeException("Error reading file CV", e);
        }
        catch (HttpStatusCodeException e) {
            throw new ExternalServiceException(
                    e.getStatusCode().value(),
                    e.getResponseBodyAsString()
            );

        }
        catch (Exception e) {
            throw new RuntimeException("Error connect Service to assess CV", e);
        }
    }
}

