package com.test.backend.controller;

import com.nimbusds.openid.connect.sdk.AuthenticationRequest;
import com.test.backend.dto.AuthenticationResponse;
import com.test.backend.dto.RegisterRequest;
import com.test.backend.service.authentication.AuthenticationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/auth")
public class AuthenticationController {

    private AuthenticationService authenticationService;

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(
            @RequestBody RegisterRequest registerRequest,
            @RequestHeader("Authentication") String authHeader) {

        String tempToken = authHeader.substring(7);

        AuthenticationResponse response =
                authenticationService.register(registerRequest, tempToken);

        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(
            @RequestHeader("Authentication") String authHeader) {

        String tempToken = authHeader.substring(7);

        AuthenticationResponse response =
                authenticationService.login(tempToken);

        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}
