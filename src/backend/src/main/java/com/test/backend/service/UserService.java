package com.test.backend.service;

import com.nimbusds.common.contenttype.ContentType;
import com.test.backend.config.AvatarBucketConfig;
import com.test.backend.config.CVBucketConfig;
import com.test.backend.dto.authentication.RegisterRequest;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.EmptyInputException;
import com.test.backend.exception.customException.ErrorTypeException;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.InterviewerExpertiseRepository;
import com.test.backend.repository.InterviewerRepository;
import com.test.backend.repository.PositionRepository;
import com.test.backend.repository.UserRepository;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.coyote.BadRequestException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    private final FileService fileService;

    private final AvatarBucketConfig avatarBucketConfig;

    public void changeAvatar(User user, MultipartFile avatar) {
        if(avatar == null || avatar.isEmpty()) {
            throw new EmptyInputException("Avatar is empty");
        }

        String originalContentType = avatar.getContentType();

        // Chỉ cho phép định dạng ảnh cơ bản
        if(originalContentType == null ||
                (!originalContentType.equals("image/jpeg") &&
                        !originalContentType.equals("image/png") &&
                        !originalContentType.equals("image/webp"))) {
            throw new ErrorTypeException("File is not an image type");
        }

        String target = "avatar"+ "_" + user.getUserId();

        byte[] fileData;
        try {
            fileData = avatar.getBytes();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        String avatarUrl;
        try {
            avatarUrl = fileService
                    .uploadFile(avatarBucketConfig.getAvatarBucketName(),
                            fileData,
                            originalContentType,
                            target);
        } catch (MinioException | IOException e) {
            // 1. Ghi log đỏ (ERROR) kèm thông tin định danh và dấu vết lỗi (stacktrace)
            log.error("Error: Fail to Upload CV of ID [{}]. Detail: {}", target, e.getMessage(), e);

            // 2. Vẫn throw ra để dừng luồng hiện tại hoặc để GlobalExceptionHandler/AsyncHandler bắt lại
            throw new RuntimeException("Upload Avatar Fail for Target: " + target, e);
        }

        user.setAvatar(avatarUrl);

        userRepository.save(user);
    }

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
