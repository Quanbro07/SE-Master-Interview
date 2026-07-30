package com.test.backend.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;

@Builder
public record UserUpdateResponse(
        @JsonProperty("user_name")
        String userName,

        @JsonProperty("full_name")
        String fullName,

        @JsonProperty("linkedin_url")
        String linkedinUrl,

        @JsonProperty("github_url")
        String githubUrl

) {
}
