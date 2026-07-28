package com.test.backend.dto.authentication;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.test.backend.entity.user.Role;
import lombok.Builder;

import java.time.LocalDate;

@Builder
public record AuthenticationResponse(
        String email,

        String avatar,

        @JsonProperty("user_name")
        String userName,

        @JsonProperty("full_name")
        String fullName,

        @JsonProperty("linked_url")
        String linkedinUrl,

        @JsonProperty("github_url")
        String githubUrl,

        Role role,

        String accessToken,

        String refreshToken,

        // Interviewer
        @JsonProperty("is_stripe_connected")
        Boolean isStripeConnected,

        @JsonProperty("stripe_id")
        String stripeAccountId,

        // Interviewee
        @JsonProperty("subscription_expired_date")
        LocalDate subscriptionExpiredDate
) {}
