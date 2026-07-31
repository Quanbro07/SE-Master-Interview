package com.test.backend.dto.stripe;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@Builder
public record PaymentIntentResponse(
        @JsonProperty("client_secret")
        String clientSecret
) {
}
