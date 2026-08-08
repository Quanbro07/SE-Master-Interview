package com.test.backend.service;

import com.test.backend.dto.user.UserProfileResponse;
import com.test.backend.entity.user.CustomUserDetail;
import java.util.Optional;
import com.nimbusds.common.contenttype.ContentType;
import com.nimbusds.openid.connect.sdk.UserInfoRequest;
import com.nimbusds.openid.connect.sdk.claims.UserInfo;
import com.test.backend.config.AvatarBucketConfig;
import com.test.backend.config.CVBucketConfig;
import com.test.backend.dto.authentication.RegisterRequest;
import com.test.backend.dto.user.UserUpdateRequest;
import com.test.backend.dto.user.UserUpdateResponse;
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
import java.util.List;
import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    private final InterviewerRepository interviewerRepository;

    private final FileService fileService;

    private final AvatarBucketConfig avatarBucketConfig;

    public String changeAvatar(User user, MultipartFile avatar) {
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

        return user.getAvatar();
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


    public UserUpdateResponse updateUserInfo(User user, UserUpdateRequest request) {
        // Only update fields that are explicitly provided (not null)
        if (request.userName() != null) {
            user.setUserName(request.userName());
        }
        if (request.fullName() != null) {
            user.setFullName(request.fullName());
        }
        if (request.githubUrl() != null) {
            user.setGithubUrl(request.githubUrl());
        }
        if (request.linkedinUrl() != null) {
            user.setLinkedinUrl(request.linkedinUrl());
        }

        userRepository.save(user);

        return this.buildUserUpdateResponse(user);
    }

    // Helper
    private UserUpdateResponse buildUserUpdateResponse(User user) {
        return UserUpdateResponse.builder()
                .userName(user.getUserName())
                .fullName(user.getFullName())
                .githubUrl(user.getGithubUrl())
                .linkedinUrl(user.getLinkedinUrl())
                .build();
    }

    public UserProfileResponse getCurrentUserProfile(CustomUserDetail userDetail) {
        User user = userDetail.getUser();

        Interviewer interviewer = interviewerRepository.findById(user.getUserId())
            .orElse(null);

    // 2. Chuyển đổi danh sách InterviewerExpertise thành List<UserProfileResponse.ExpertiseDTO>
    List<UserProfileResponse.ExpertiseDTO> expertiseDTOs = null;
    
    if (interviewer != null && interviewer.getExpertiseList() != null) {
        expertiseDTOs = interviewer.getExpertiseList().stream()
                .map(exp -> UserProfileResponse.ExpertiseDTO.builder()
                        .positionId(exp.getPosition().getPositionId())
                        .positionName(exp.getPosition().getPositionName())
                        .level(exp.getLevel() != null ? exp.getLevel().name() : null)
                        .experienceYear(exp.getExperienceYear())
                        .hourlyFee(exp.getHourlyFee())
                        .isCertified(exp.getIsCertified()) // hoặc exp.getIsCertified() tùy getter trong entity
                        .build())
                .toList();
    }

    // 3. Build DTO trả về
    return UserProfileResponse.builder()
            .id(user.getUserId())
            .email(user.getEmail())
            .fullName(user.getFullName())
            .userName(user.getUserName())
            .linkedinUrl(user.getLinkedinUrl())
            .githubUrl(user.getGithubUrl())
            .isStripeConnected(interviewer != null ? interviewer.getIsStripeConnected() : false)
            .stripeAccountId(interviewer != null ? interviewer.getStripeAccountId() : null)
            .expertises(expertiseDTOs) // <--- Gắn danh sách đã map vào đây
            .build();
    }
}
