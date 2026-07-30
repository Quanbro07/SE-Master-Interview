package com.test.backend.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Pattern;

public record UserUpdateRequest(
    @JsonProperty("user_name")
    String userName,

    @JsonProperty("full_name")
    String fullName,

    @Pattern(
            regexp = "^https:\\/\\/([a-z]{2,3}\\.)?linkedin\\.com\\/in\\/[a-zA-Z0-9_-]+\\/?$",
            message = "Link LinkedIn không hợp lệ. Vui lòng nhập đúng định dạng (VD: https://linkedin.com/in/username)"
    )
    @JsonProperty("linkedin_url")
    String linkedinUrl,

    @Pattern(
            regexp = "^https:\\/\\/(www\\.)?github\\.com\\/[a-zA-Z0-9_-]+\\/?$",
            message = "Link GitHub không hợp lệ. Vui lòng nhập đúng định dạng (VD: https://github.com/username)"
    )
    @JsonProperty("github_url")
    String githubUrl

) {}
