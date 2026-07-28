package com.test.backend.controller;

import com.test.backend.dto.expertise.PendingExpertiseDTO;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.service.ExpertiseService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/expertise")
public class InterviewerExpertiseController {

    private final ExpertiseService expertiseService;

    @PreAuthorize("hasRole('Interviewer')")
    @PostMapping("/position-expertise-request")
    public ResponseEntity<?> requestPositionExpertise(
            @RequestParam("file") MultipartFile file,
            @RequestParam("position") String position,
            @RequestParam(value = "level", defaultValue = "INTERN") InterviewerExpertiseLevel level,
            @RequestParam(value = "experience_year", defaultValue = "1") Integer experienceYear,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long userId = userDetail.getUser().getUserId();

        expertiseService.sendExpertisePosition(userId, position, level, experienceYear, file);
        return ResponseEntity.ok("DONE");
    }

    @PreAuthorize("hasRole('Admin')")
    @GetMapping("/get-pending-expertise-request")
    public ResponseEntity<Page<PendingExpertiseDTO>> getPendingExpertiseRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<PendingExpertiseDTO> response =  expertiseService.getPendingExpertiseRequests(page, size);

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('Admin')")
    @PostMapping("/certify-expertise")
    public ResponseEntity<?> certifyExpertise(
            @RequestParam("interviewer_id") Long interviewerId,
            @RequestParam("position_id") Long positionId
    ) {

        expertiseService.certifyPosition(interviewerId, positionId);

        return ResponseEntity.ok("DONE");
    }
}
