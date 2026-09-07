package com.test.backend.controller;

import com.test.backend.dto.schedule.AvailableScheduleDTO;
import com.test.backend.dto.schedule.BlockedScheduleDTO;
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

import java.util.List;
import java.time.LocalDate;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PreAuthorize("hasRole('Interviewer')")
    @PostMapping("/update")
    public ResponseEntity<String> updateAvailableSchedule(
            @RequestBody AvailableScheduleDTO request,
            @AuthenticationPrincipal CustomUserDetail userDetails) {

        Long userId = userDetails.getUser().getUserId();

        scheduleService.updateAvailableSchedule(userId, request);
        return ResponseEntity.ok("DONE");
    }

    @PreAuthorize("hasAnyRole('Interviewer')")
    @GetMapping("/get")
    public ResponseEntity<AvailableScheduleDTO> getAvailableSchedule(
            @RequestParam(required = false) Long interviewerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateInWeek,
            @AuthenticationPrincipal CustomUserDetail userDetails) {

        Long targetUserId = (interviewerId != null) ? interviewerId : userDetails.getUser().getUserId();

        // Nếu client không truyền ngày, mặc định lấy tuần hiện tại
        if (dateInWeek == null) {
            dateInWeek = LocalDate.now();
        }

        AvailableScheduleDTO response = scheduleService.getAvailableSchedule(targetUserId, dateInWeek);

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('Interviewer')")
    @GetMapping("/blocked")
    public ResponseEntity<List<BlockedScheduleDTO>> getBlockedSchedule(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateInWeek,
            @AuthenticationPrincipal CustomUserDetail userDetails) {

        Long userId = userDetails.getUser().getUserId();

        if (dateInWeek == null) {
            dateInWeek = LocalDate.now();
        }

        List<BlockedScheduleDTO> response = scheduleService.getBlockedSchedules(userId, dateInWeek);

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('Interviewer', 'Inerviewee')")
    @PostMapping("/add-blocked-schedule")
    public ResponseEntity<String> addBlockedSchedule(
            @AuthenticationPrincipal CustomUserDetail userDetails,
            @Valid @RequestBody AddBlockedScheduleRequest request) {

        Long userId = userDetails.getUser().getUserId();

        // Gọi Service xử lý logic
        scheduleService.addBlockedSchedule(userId, request);

        return ResponseEntity.ok("Blocked schedule added successfully");
    }
}
