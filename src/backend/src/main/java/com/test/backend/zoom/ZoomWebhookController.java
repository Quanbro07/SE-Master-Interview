package com.test.backend.zoom;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.test.backend.entity.booking.BookingStatus;
import com.test.backend.repository.BookingRepository;
import com.test.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/zoom/webhook")
public class ZoomWebhookController {

    @Value("${zoom.webhook_secret}")
    private String ZOOM_WEBHOOK_SECRET;

    private final ObjectMapper objectMapper;

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<?> handleZoomWebhook(@RequestBody String rawPayload) {

        try {
            // Dùng ObjectMapper để chủ động chuyển String thành JsonNode
            JsonNode payload = objectMapper.readTree(rawPayload);

            String event = payload.path("event").asText("");

            // 2. Xử lý Challenge-Response Check (Khi bấm nút Validate trên Zoom)
            switch (event) {
                // Validate
                case "endpoint.url_validation": {
                    String plainToken = payload.path("payload").path("plainToken").asText();

                    try {
                        // Thuật toán mã hóa HMAC SHA-256 theo yêu cầu của Zoom
                        Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
                        SecretKeySpec secret_key = new SecretKeySpec(ZOOM_WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
                        sha256_HMAC.init(secret_key);

                        byte[] hash = sha256_HMAC.doFinal(plainToken.getBytes(StandardCharsets.UTF_8));
                        String encryptedToken = bytesToHex(hash);

                        // Trả về JSON chứa mã đã mã hóa
                        return ResponseEntity.ok(Map.of(
                                "plainToken", plainToken,
                                "encryptedToken", encryptedToken
                        ));

                    } catch (Exception e) {
                        e.printStackTrace();
                        return ResponseEntity.status(500).build();
                    }
                }

                // Zoom Start
                case "meeting.started": {
                    // Lấy ID cực kì ngắn gọn và chống Null
                    String zoomMeetingId = payload.path("payload").path("object").path("id").asText();
                    log.info("Meeting {} STARTED!", zoomMeetingId);

                    bookingService.updateBookingStatusByZoomId(zoomMeetingId, BookingStatus.IN_PROGRESS);

                    break;
                }

                // Zoom End
                case "meeting.ended": {
                    String zoomMeetingId = payload.path("payload").path("object").path("id").asText();
                    log.info("Meeting {} ENDED!", zoomMeetingId);

                    bookingService.updateBookingStatusByZoomId(zoomMeetingId, BookingStatus.AWAIT_REVIEW);
                    break;
                }

                // Thêm default để xử lý các event không hợp lệ hoặc không quan tâm
                default: {
                    System.out.println("UnCategorized Event Received!: " + event);
                    break;
                }
            }

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            // Bắt Exception chung để bao trọn mọi lỗi (Parse JSON, Thuật toán MAC...)
            log.error("Error processing Zoom webhook: ", e);
            return ResponseEntity.status(500).build();
        }


    }

    // Hàm phụ trợ chuyển đổi Byte Array sang chuỗi Hex (Hexadecimal)
    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
