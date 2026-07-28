package com.test.backend.controller;

import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/user")
public class UserController {

    private final UserService userService;


}
