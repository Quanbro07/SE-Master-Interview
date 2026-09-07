package com.test.backend.service;

import com.test.backend.config.CVBucketConfig;
import com.test.backend.dto.cvAssessment.CVAssessmentResponse;
import com.test.backend.dto.cvAssessment.CVSectionFeedbackResponse;
import com.test.backend.entity.cvAssessment.CVAssessment;
import com.test.backend.entity.cvSectionFeedback.CVSectionFeedback;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.user.interviewee.Interviewee;
import com.test.backend.repository.CVAssessmentRepository;
import com.test.backend.repository.IntervieweeRepository;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;

@Slf4j
@RequiredArgsConstructor
@Service
public class CVAsyncHandlerService {

    private final FileService fileService;

    private final IntervieweeRepository intervieweeRepository;

    private final CVBucketConfig cvBucketConfig;

    private final CVAssessmentRepository cvAssessmentRepository;

    @Async
    @Transactional
    public void saveCVAssessmentAndUploadFileAsync(
            Interviewee interviewee,
            Position position,
            CVAssessmentResponse response,
            byte[] fileData,
            String orignalFileName,
            String contentType) {

        CVAssessment cvAssessment = this.buildCVAssessment(response);

        for(CVSectionFeedbackResponse sectionFeedbackResponse: response.sectionFeedbackList()) {
            CVSectionFeedback cvSectionFeedback = this.buildCVSectionFeedback(sectionFeedbackResponse);

            cvAssessment.addCVSectionFeedBack(cvSectionFeedback);

        }

        cvAssessment.setPosition(position);

        interviewee.addCVAssessment(cvAssessment);


        String target = interviewee.getIntervieweeId().toString() + "_" + java.util.UUID.randomUUID().toString();

        String cvUrl;

        try {
            // upload
            cvUrl = fileService.uploadFile(cvBucketConfig.getCVBucketName(), fileData, contentType,orignalFileName, target);

        } catch (MinioException | IOException e) {
            // 1. Ghi log đỏ (ERROR) kèm thông tin định danh và dấu vết lỗi (stacktrace)
            log.error("Error: Fail to Upload CV of ID [{}]. Detail: {}", target, e.getMessage(), e);

            // 2. Vẫn throw ra để dừng luồng hiện tại hoặc để GlobalExceptionHandler/AsyncHandler bắt lại
            throw new RuntimeException("Upload CV thất bại cho target: " + target, e);
        }

        cvAssessment.setCvUrl(cvUrl);


        intervieweeRepository.save(interviewee);

    }


    // Helper Function
    private CVAssessment buildCVAssessment(CVAssessmentResponse response) {
        return CVAssessment.builder()
                .cvUrl(response.cvUrl())
                .overallScore(response.overallScore())
                .matchScore(response.matchScore())
                .matchComment(response.matchComment())
                .layoutComment(response.layoutComment())
                .improvementSuggestion(response.improvementSuggestion())
                .build();
    }

    private CVSectionFeedback buildCVSectionFeedback(CVSectionFeedbackResponse response) {
        return CVSectionFeedback.builder()
                .sectionName(response.sectionName())
                .score(response.score())
                .comment(response.comment())
                .build();
    }

}
