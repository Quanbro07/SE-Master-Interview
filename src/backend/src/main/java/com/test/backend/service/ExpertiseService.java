package com.test.backend.service;

import com.test.backend.config.CVBucketConfig;
import com.test.backend.dto.expertise.PendingExpertiseDTO;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseId;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.exception.customException.StripeIntegrationException;
import com.test.backend.repository.InterviewerExpertiseRepository;
import com.test.backend.repository.InterviewerRepository;
import com.test.backend.repository.PositionRepository;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;

@Slf4j
@RequiredArgsConstructor
@Service
public class ExpertiseService {
    private final CVBucketConfig cvBucketConfig;

    private final FileService fileService;

    private final PositionRepository positionRepository;

    private final InterviewerRepository interviewerRepository;

    private final InterviewerExpertiseRepository interviewerExpertiseRepository;

    public void sendExpertisePosition(Long userId, String position,
        InterviewerExpertiseLevel level,
        Integer experienceYear,
        BigDecimal hourlyFee,
        MultipartFile file) {

        Position po = positionRepository.findByPositionNameIgnoreCase(position)
        .orElseThrow(() -> new NotFoundException("Position not found"));

        Interviewer interviewer = interviewerRepository.findByInterviewerId(userId)
        .orElseThrow(() -> new NotFoundException("Interviewer not found"));

        // --- CẢI TIẾN ĐIỀU KIỆN KIỂM TRA STRIPE ---
        // 1. Kiểm tra interviewer đã thực hiện khởi tạo tài khoản Stripe chưa
        boolean hasStripeAccountId = interviewer.getStripeAccountId() != null 
        && !interviewer.getStripeAccountId().trim().isEmpty();

        // 2. Cho phép đi tiếp nếu isStripeConnected = true HOẶC đã có stripeAccountId
        if (!Boolean.TRUE.equals(interviewer.getIsStripeConnected()) && !hasStripeAccountId) {
        throw new StripeIntegrationException("Vui lòng kết nối tài khoản Stripe trước khi đăng ký Chuyên môn.");
        }

        // Ghi log cảnh báo nếu Webhook chưa kịp cập nhật trạng thái kết nối
        if (!Boolean.TRUE.equals(interviewer.getIsStripeConnected())) {
        log.warn("Interviewer ID [{}] đã gửi yêu cầu Expertise nhưng chưa hoàn tất đồng bộ Webhook Stripe (isStripeConnected=false).", userId);
        }
        // ------------------------------------------

        byte[] fileData;
        String contentType = file.getContentType();
        String originalFileName = file.getOriginalFilename();
        String target = "interviewer" + "_" + userId.toString() + "_" + position;

        String cvUrl;

        try {
        fileData = file.getBytes();
        } catch (IOException e) {
        throw new RuntimeException(e);
        }

        try {

            cvUrl = fileService.uploadFile(cvBucketConfig.getCVBucketName(), fileData, contentType,originalFileName , target);
        } catch (MinioException | IOException e) {
        log.error("Error: Fail to Upload CV of ID [{}]. Detail: {}", target, e.getMessage(), e);
        throw new RuntimeException("Upload CV thất bại cho target: " + target, e);
        }

        InterviewerExpertise expertise = InterviewerExpertise.builder()
        .interviewer(interviewer)
        .position(po)
        .level(level)
        .experienceYear(experienceYear)
        .hourlyFee(hourlyFee)
        .cvUrl(cvUrl)
        .build();

        interviewerExpertiseRepository.save(expertise);
        }

    public Page<PendingExpertiseDTO> getPendingExpertiseRequests(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").ascending());

        Page<InterviewerExpertise> pendingPage = interviewerExpertiseRepository.findAllByIsCertifiedIsFalse(pageable);

        Page<PendingExpertiseDTO> resultDTO = pendingPage.map(this::convertToDTO);

        return resultDTO;
    }

    // HelperFunction
    private PendingExpertiseDTO convertToDTO(InterviewerExpertise entity) {
        Position position = entity.getPosition();
        Interviewer interviewer = entity.getInterviewer();
        User user = interviewer.getUser();

        return PendingExpertiseDTO.builder()
                .positionId(position.getPositionId())
                .positionName(position.getPositionName())

                // Lấy thông tin từ chính InterviewerExpertise
                .level(entity.getLevel())
                .experienceYear(entity.getExperienceYear())
                .hourlyFee(entity.getHourlyFee())
                .cvUrl(entity.getCvUrl())

                // Lấy thông tin từ Interviewer
                .interviewerId(interviewer.getInterviewerId())
                .interviewerEmail(user.getEmail())
                .interviewerName(user.getFullName())
                .build();
    }

    public void certifyPosition(Long interviewerId, Long positionId) {
        InterviewerExpertiseId expertiseId = new InterviewerExpertiseId(interviewerId, positionId);

        InterviewerExpertise expertise = interviewerExpertiseRepository.findById(expertiseId)
                .orElseThrow(() -> new NotFoundException("Interviewer Expertise not found"));


        expertise.setIsCertified(Boolean.TRUE);

        interviewerExpertiseRepository.save(expertise);
    }
}
