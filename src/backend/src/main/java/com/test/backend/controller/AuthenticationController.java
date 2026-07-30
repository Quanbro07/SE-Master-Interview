package com.test.backend.controller;

import com.test.backend.dto.authentication.AuthenticationResponse;
import com.test.backend.dto.authentication.LogoutRequest;
import com.test.backend.dto.authentication.RefreshTokenResponse;
import com.test.backend.dto.authentication.RegisterRequest;
import com.test.backend.service.authentication.AuthenticationService;
import lombok.RequiredArgsConstructor;
import org.apache.coyote.Response;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/auth")
public class AuthenticationController {

    private final AuthenticationService authenticationService;

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(
            @RequestBody RegisterRequest registerRequest,
            @RequestHeader("Authorization") String authHeader) {

        String tempToken = authHeader.substring(7);

        AuthenticationResponse response =
                authenticationService.register(registerRequest, tempToken);

        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(
            @RequestHeader("Authorization") String authHeader) {

        String tempToken = authHeader.substring(7);

        AuthenticationResponse response =
                authenticationService.login(tempToken);

        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("refresh-token")
    public ResponseEntity<RefreshTokenResponse> refreshToken(
            @RequestHeader("Authorization") String authHeader) {

        String refreshToken = authHeader.substring(7);

        RefreshTokenResponse response = authenticationService.refreshToken(refreshToken);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(
            @RequestBody LogoutRequest request,
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.substring(7);

        authenticationService.logout(token, request);

        return ResponseEntity.ok("DONE");
    }
}
