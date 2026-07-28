package com.test.backend.service;

import com.test.backend.config.CVBucketConfig;
import com.test.backend.dto.authentication.RegisterRequest;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.InterviewerExpertiseRepository;
import com.test.backend.repository.InterviewerRepository;
import com.test.backend.repository.PositionRepository;
import com.test.backend.repository.UserRepository;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;



    // Helper Funciton
    public User createUserAndReturn(String email, RegisterRequest request) {
        return User.builder()
                .email(email)
                .userName(request.userName())
                .fullName(request.fullName())
                .linkedinUrl(request.linkedinUrl())
                .githubUrl(request.githubUrl())
                .role(request.role())
                .isEnabled(Boolean.TRUE)
                .build();
    }


}
