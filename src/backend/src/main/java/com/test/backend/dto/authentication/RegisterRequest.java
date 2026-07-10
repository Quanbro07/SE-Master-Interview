package com.test.backend.dto.authentication;

import com.test.backend.entity.user.Role;

public record RegisterRequest(
        String email,
        String userName,
        String fullName,
        String linkedinUrl,
        String githubUrl,
        Role role
) {

}
