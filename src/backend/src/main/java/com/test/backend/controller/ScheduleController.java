package com.test.backend.controller;

import com.test.backend.dto.schedule.AvailableScheduleDTO;
import com.test.backend.dto.schedule.AddBlockedScheduleRequest;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.service.ScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PreAuthorize("hasRole('Interviewer')")
    @PostMapping("/update")
    public ResponseEntity<?> updateAvailableSchedule(
            @RequestBody AvailableScheduleDTO request,
            @AuthenticationPrincipal CustomUserDetail userDetails) {

        Long userId = userDetails.getUser().getUserId();

        scheduleService.updateAvailableSchedule(userId, request);
        return ResponseEntity.ok("DONE");
    }

    @PreAuthorize("hasRole('Interviewer')")
    @GetMapping("/get")
    public ResponseEntity<AvailableScheduleDTO> getAvailableSchedule(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateInWeek,
            @AuthenticationPrincipal CustomUserDetail userDetails) {

        Long userId = userDetails.getUser().getUserId();

        // Nếu client không truyền ngày, mặc định lấy tuần hiện tại
        if (dateInWeek == null) {
            dateInWeek = LocalDate.now();
        }

        AvailableScheduleDTO response = scheduleService.getAvailableSchedule(userId, dateInWeek);

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('Interviewer')")
    @PostMapping("/add-blocked-schedule")
    public ResponseEntity<?> addBlockedSchedule(
            @AuthenticationPrincipal CustomUserDetail userDetails,
            @Valid @RequestBody AddBlockedScheduleRequest request) {

        Long userId = userDetails.getUser().getUserId();

        // Gọi Service xử lý logic
        scheduleService.addBlockedSchedule(userId, request);

        return ResponseEntity.ok("Blocked schedule added successfully");
    }
}
