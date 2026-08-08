package com.test.backend.dto.agent;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse<T> {
        private String conversationId;
        private T answer;
        private String toolUsed;
        private boolean success;
        private String errorMessage;
}