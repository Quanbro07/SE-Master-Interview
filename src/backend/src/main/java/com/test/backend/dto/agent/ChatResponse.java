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
public class ChatResponse {

        private String conversationId;

        /** Nội dung trả lời cuối cùng của AI Agent */
        private String answer;

        /** Tool MCP nào đã được gọi để phục vụ trả lời này (nếu có), phục vụ debug/UI hiển thị */
        private String toolUsed;

        private boolean success;

        private String errorMessage;

        // ---------------------------------------------------------------
        // GHI CHÚ CHUYỂN SANG STREAM (SSE):
        // Nếu về sau cần stream token-by-token từ AI, có thể:
        // 1. Đổi endpoint response type thành SseEmitter hoặc
        //    Flux<ServerSentEvent<String>> (nếu dùng WebFlux).
        // 2. Giữ nguyên ChatResponse này làm "final event" cuối cùng
        //    (event name = "done"), còn các event trung gian
        //    (event name = "token") chỉ chứa delta text.
        // 3. AgentService khi đó cần expose thêm 1 method dạng:
        //    void streamPrompt(ChatRequest req, Consumer<String> onToken, Runnable onComplete)
        //    hoặc trả về Flux<String> nếu dùng reactor.
        // ---------------------------------------------------------------
}