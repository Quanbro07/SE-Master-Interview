package com.test.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.entity.user.Role;
import lombok.Builder;

@Builder
public record AuthenticationResponse(
        String email,
        String userName,
        String fullName,
        @JsonProperty("linked_url")
        String linkedinUrl,
        @JsonProperty("github_url")
        String githubUrl,
        Role role,
        String accessToken,
        String refreshToken
) {}
