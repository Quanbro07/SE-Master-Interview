package com.test.backend.dto;

import com.test.backend.entity.user.Role;
import jakarta.persistence.EnumeratedValue;

public record RegisterRequest(
        String email,
        String userName,
        String fullName,
        String linkedinUrl,
        String githubUrl,
        Role role
) {

}
