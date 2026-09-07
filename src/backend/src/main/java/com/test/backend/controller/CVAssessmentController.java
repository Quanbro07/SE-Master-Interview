package com.test.backend.controller;

import com.test.backend.dto.cvAssessment.CVAssessmentResponse;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.service.CVAssessmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/cv-assessment")
public class CVAssessmentController {

    private final CVAssessmentService cvAssessmentService;

    @PostMapping("/assess-cv")
    public ResponseEntity<CVAssessmentResponse> assessCV(
            @RequestParam("file")MultipartFile file,
            @RequestParam("position") String position,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        Long userId = userDetail.getUser().getUserId();

        CVAssessmentResponse response = cvAssessmentService.assessCV(userId, position, file);

        return ResponseEntity.ok(response);
    }
}
