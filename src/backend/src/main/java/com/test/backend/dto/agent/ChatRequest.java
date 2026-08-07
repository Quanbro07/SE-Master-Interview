package com.test.backend.dto.agent;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {
        /**
         * Nếu null/blank, service sẽ tự sinh 1 conversationId mới (UUID)
         * cho phiên chat đầu tiên của user.
         */
        private String conversationId;

        @NotBlank(message = "prompt không được để trống")
        private String prompt;
}