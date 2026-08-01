package com.test.backend.zoom;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.test.backend.dto.zoom.ZoomMeetingDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;


import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RequiredArgsConstructor
@Service
public class ZoomService {

    @Value("${zoom.account_id}")
    private String accountId;

    @Value("${zoom.client_id}")
    private String clientId;

    @Value("${zoom.client_secret}")
    private String clientSecret;

    @Value("${mail.username}")
    private String hostEmail;

    private final String zoomAccessUrl = "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=";

    private final String zoomMeetingUrl = "https://api.zoom.us/v2/users/";

    private final RestTemplate restTemplate;

    private final ObjectMapper objectMapper;

    // 1. Hàm lấy Access Token (Server-to-Server)
    private String getAccessToken() {
        String url = zoomAccessUrl + accountId;

        // Mã hóa ClientID:ClientSecret sang Base64
        String auth = clientId + ":" + clientSecret;
        String base64Auth = Base64.getEncoder().encodeToString(auth.getBytes());

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + base64Auth);
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<String> request = new HttpEntity<>(headers);

        try {
            // HỨNG BẰNG STRING CHỐNG LỖI CONVERT
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            String rawBody = response.getBody();
            if (rawBody == null) throw new RuntimeException("Zoom Token API returned empty body");

            // TỰ PARSE BẰNG OBJECT MAPPER
            JsonNode responseBody = objectMapper.readTree(rawBody);

            // DÙNG asText() THAY VÌ asString()
            return responseBody.path("access_token").asText();

        } catch (Exception e) {
            log.error("Failed to get Zoom Access Token", e);
            throw new RuntimeException("Could not authenticate with Zoom", e);
        }
    }

    // 2. Hàm tạo phòng họp
    public ZoomMeetingDTO createMeeting(String topic, int durationMinutes, String password) {
        String token = getAccessToken();

        // Dùng API /users/me/meetings
        String url = zoomMeetingUrl + hostEmail + "/meetings";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Body chứa cấu hình phòng họp
        Map<String, Object> body = new HashMap<>();
        body.put("topic", topic);
        body.put("type", 2); // 2 = Scheduled meeting
        body.put("duration", durationMinutes);
        body.put("timezone", "Asia/Ho_Chi_Minh"); // Set múi giờ cho chuẩn
        if(password != null && !password.trim().isEmpty()) {
            body.put("password", password);
        }

        // Cấu hình Setting cho phòng
        Map<String, Object> settings = new HashMap<>();
        settings.put("host_video", true);
        settings.put("participant_video", true);
        settings.put("join_before_host", true); // Nên bật để ứng viên vào trước chờ được
        settings.put("waiting_room", false); // Tắt phòng chờ để tự động vào
        settings.put("mute_upon_entry", true); // Mute mic khi mới vào
        body.put("settings", settings);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            // HỨNG BẰNG STRING CHỐNG LỖI CONVERT
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            String rawBody = response.getBody();
            if (rawBody == null) throw new RuntimeException("Zoom Create Meeting API returned empty body");

            // TỰ PARSE BẰNG OBJECT MAPPER
            JsonNode responseBody = objectMapper.readTree(rawBody);

            // DÙNG asText() THAY VÌ asString()
            String meetingId = responseBody.path("id").asText();
            String joinUrl = responseBody.path("join_url").asText();
            String startUrl = responseBody.path("start_url").asText();

            return ZoomMeetingDTO.builder()
                    .zoomMeetingId(meetingId)
                    .joinUrl(joinUrl)
                    .startUrl(startUrl)
                    .meetingPassword(password)
                    .build();

        } catch (Exception e) {
            log.error("Failed to create Zoom Meeting", e);
            throw new RuntimeException("Could not create Zoom meeting", e);
        }
    }

    public String getFreshStartUrl(String meetingId) {
        String token = getAccessToken();
        String url = "https://api.zoom.us/v2/meetings/" + meetingId;

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        // Dùng restTemplate.exchange cho method GET
        try {
            // 1. Nhận response về dưới dạng String nguyên thủy để tránh lỗi ép kiểu của Spring
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    request,
                    String.class
            );
            String rawBody = response.getBody();
            if (rawBody == null) {
                throw new RuntimeException("Zoom API returned empty body");
            }
            JsonNode responseBody = objectMapper.readTree(rawBody);


            return responseBody.path("start_url").asText();
        }
        catch (Exception e) {
            // Bắt lỗi an toàn nếu có trục trặc về mạng hoặc parse JSON
            log.error("Failed to get fresh start URL from Zoom for meeting: {}", meetingId, e);
            throw new RuntimeException("Could not fetch Zoom start_url", e);
        }
    }
}
