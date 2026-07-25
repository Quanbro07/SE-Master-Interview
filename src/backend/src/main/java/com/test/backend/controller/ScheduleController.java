package com.test.backend.controller;

import com.test.backend.dto.schedule.AvailableScheduleRequest;
import com.test.backend.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PreAuthorize("hasRole('Interviewer')")
    @PostMapping("/update")
    public ResponseEntity<?> updateAvailableSchedule(
            @RequestBody AvailableScheduleRequest request,
            @RequestHeader("Bearer") String token) {

        scheduleService.updateAvailableSchedule(token, request);
        return ResponseEntity.ok("OKE");
    }
}
