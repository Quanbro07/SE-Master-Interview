package com.test.backend.dto.authentication;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@Builder
public record RefreshTokenResponse(
        @JsonProperty("access_token")
        String accessToken
        ) {}
