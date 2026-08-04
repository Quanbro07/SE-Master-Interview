package com.test.backend.dto.agent;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record ChatRequest(
        @NotBlank(message = "userId không được để trống")
        String userId,

        /**
         * Nếu null/blank, service sẽ tự sinh 1 conversationId mới (UUID)
         * cho phiên chat đầu tiên của user.
         */
        String conversationId,

        @JsonProperty("prompt")
        @NotBlank(message = "prompt không được để trống")
        String prompt
) {
}
