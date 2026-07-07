package com.test.backend.service;

import com.test.backend.dto.authentication.RegisterRequest;
import com.test.backend.entity.user.User;
import com.test.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    public User createUserAndReturn(RegisterRequest request) {
        return User.builder()
                .email(request.email())
                .userName(request.userName())
                .fullName(request.fullName())
                .linkedinUrl(request.linkedinUrl())
                .githubUrl(request.githubUrl())
                .role(request.role())
                .isEnabled(Boolean.TRUE)
                .build();
    }
}
