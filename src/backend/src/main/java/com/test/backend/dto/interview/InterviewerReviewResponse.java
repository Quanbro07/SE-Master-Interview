package com.test.backend.dto.interview;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record InterviewerReviewResponse(
        @JsonProperty("review_id")
        Long reviewId,

        @JsonProperty("reviewer_name")
        String reviewerName,

        @JsonProperty("reviewer_avatar") // Nếu user có avatar thì bạn thêm vào, không thì bỏ đi
        String reviewerAvatar,

        Double rating,

        String comment,

        @JsonProperty("created_at")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
        LocalDateTime createdAt
) {
}
