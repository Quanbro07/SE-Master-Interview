package com.test.backend.zoom;

import com.fasterxml.jackson.databind.JsonNode;
import com.test.backend.dto.zoom.ZoomMeetingDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

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

        ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);

        return response.getBody().path("access_token").asText();
    }

    // 2. Hàm tạo phòng họp
    public ZoomMeetingDTO createMeeting(String topic, int durationMinutes) {
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

        // Cấu hình Setting cho phòng
        Map<String, Object> settings = new HashMap<>();
        settings.put("host_video", true);
        settings.put("participant_video", true);
        settings.put("join_before_host", true); // Nên bật để ứng viên vào trước chờ được
        settings.put("waiting_room", false); // Tắt phòng chờ để tự động vào
        settings.put("mute_upon_entry", true); // Mute mic khi mới vào
        body.put("settings", settings);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);

        JsonNode responseBody = response.getBody();

        String meetingId = responseBody.path("id").asText();
        String joinUrl = responseBody.path("join_url").asText();
        String startUrl = responseBody.path("start_url").asText();

        return ZoomMeetingDTO.builder()
                .zoomMeetingId(meetingId)
                .joinUrl(joinUrl)
                .startUrl(startUrl)
                .build();
    }
}
