package com.test.backend.dto.agent;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;

/**
 * Model đại diện cho 1 message trong lịch sử hội thoại.
 * Được serialize dạng JSON để lưu vào Redis List.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageModel implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** "user" hoặc "assistant" hoặc "tool" (nếu là kết quả gọi MCP tool) */
    private String role;

    private String content;

    /** Thời điểm tạo message, dùng để sắp xếp / debug */
    private Instant timestamp;

    /** conversationId để dễ trace log khi cần */
    private String conversationId;

    /** Optional: tên tool MCP đã được gọi trong turn này (nếu có) */
    private String toolInvoked;
}