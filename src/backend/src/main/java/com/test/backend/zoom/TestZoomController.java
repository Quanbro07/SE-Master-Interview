package com.test.backend.zoom;

import com.test.backend.dto.zoom.ZoomMeetingDTO;
import com.test.backend.zoom.ZoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/zoom/test")
public class TestZoomController {

    private final ZoomService zoomService;

    @GetMapping("/create")
    public ResponseEntity<?> testCreateMeeting() {
        // Tạo phòng phỏng vấn 60 phút
        ZoomMeetingDTO meeting = zoomService.createMeeting("Phỏng vấn Backend Developer", 60, "quanbro7");
        return ResponseEntity.ok(meeting);
    }
}