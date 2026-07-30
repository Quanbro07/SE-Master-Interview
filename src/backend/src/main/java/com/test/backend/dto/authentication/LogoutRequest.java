package com.test.backend.dto.authentication;

import com.fasterxml.jackson.annotation.JsonProperty;

public record LogoutRequest(
        @JsonProperty("refresh_token")
        String refreshToken
) {}
