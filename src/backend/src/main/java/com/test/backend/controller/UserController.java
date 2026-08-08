package com.test.backend.controller;

import com.test.backend.dto.user.UserProfileResponse;
import com.nimbusds.openid.connect.sdk.UserInfoRequest;
import com.nimbusds.openid.connect.sdk.claims.UserInfo;
import com.test.backend.dto.user.UserUpdateRequest;
import com.test.backend.dto.user.UserUpdateResponse;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.entity.user.User;
import com.test.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/user")
public class UserController {

    private final UserService userService;

    @PostMapping("/update-avatar")
    public ResponseEntity<?> updateAvatar(
        @RequestParam("avatar") MultipartFile avatar,
        @AuthenticationPrincipal CustomUserDetail userDetail) {

        User user = userDetail.getUser();

        String avatarUrl = userService.changeAvatar(user, avatar);

        return ResponseEntity.ok(Map.of("avatar-url", avatarUrl));
    }

    @PatchMapping("/update-user-info")
    public ResponseEntity<UserUpdateResponse> updateUserInfo(
            @RequestBody UserUpdateRequest request,
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        User user = userDetail.getUser();

        UserUpdateResponse response = userService.updateUserInfo(user, request);

        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(
            @AuthenticationPrincipal CustomUserDetail userDetail) {

        UserProfileResponse response = userService.getCurrentUserProfile(userDetail);
        return ResponseEntity.ok(response);
    }

}
