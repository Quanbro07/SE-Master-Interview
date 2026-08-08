package com.test.backend.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String email;

    @JsonProperty("full_name")
    private String fullName;

    @JsonProperty("user_name")
    private String userName;

    @JsonProperty("linkedin_url")
    private String linkedinUrl;

    @JsonProperty("github_url")
    private String githubUrl;

    @JsonProperty("is_stripe_connected")
    private Boolean isStripeConnected;

    @JsonProperty("stripe_account_id")
    private String stripeAccountId;

    private List<ExpertiseDTO> expertises;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ExpertiseDTO {
        @JsonProperty("position_id")
        private Long positionId;

        @JsonProperty("position_name")
        private String positionName;

        private String level;

        @JsonProperty("experience_year")
        private Integer experienceYear;

        @JsonProperty("hourly_fee")
        private BigDecimal hourlyFee;

        @JsonProperty("is_certified")
        private Boolean isCertified;
    }
}