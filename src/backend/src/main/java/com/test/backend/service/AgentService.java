package com.test.backend.service;
import com.test.backend.dto.agent.ChatRequest;
import com.test.backend.dto.agent.ChatResponse;
import com.test.backend.dto.agent.MessageModel;
import com.test.backend.dto.agent.ToolResultHolder;
import com.test.backend.exception.customException.AgentException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentService {

    private final ChatHistoryService chatHistoryService;
    private final AiAgentService aiAgentService;

    private final ToolResultHolder toolResultHolder;

    public ChatResponse<?> processPrompt(Long user_id, ChatRequest request) {
        String conversationId = StringUtils.hasText(request.getConversationId())
                ? request.getConversationId()
                : UUID.randomUUID().toString();

        log.info("[AgentService] Xử lý prompt userId={}, conversationId={}", user_id, conversationId);

        // 1. Lấy lịch sử chat làm context
        List<MessageModel> history = chatHistoryService.getRecentHistory(conversationId);

        MessageModel userMessage = MessageModel.builder()
                .role("user")
                .content(request.getPrompt())
                .conversationId(conversationId)
                .build();

        List<?> aiAnswer;
        String toolName;
        try {
            // 2. AI Agent tự động quyết định có cần gọi 1 trong 6 MCP Tool hay không,
            //    dựa trên nội dung prompt (VD: prompt nhắc "đặt vé" -> tự gọi createBooking).
            aiAnswer = aiAgentService.generateAnswer(request.getPrompt(), history);
            toolName = toolResultHolder.getToolName() != null ? toolResultHolder.getToolName() : "none";

        } catch (Exception ex) {
            log.error("[AgentService] Lỗi khi gọi AI Agent cho conversationId={}: {}",
                    conversationId, ex.getMessage(), ex);
            throw new AgentException("Không thể xử lý yêu cầu AI, vui lòng thử lại", ex);
        }

        MessageModel aiMessage = MessageModel.builder()
                .role("assistant")
                .content(aiAnswer.toString())
                .conversationId(conversationId)
                .build();

        // 3. Lưu lịch sử vào Redis
        chatHistoryService.appendMessage(conversationId, userMessage);
        chatHistoryService.appendMessage(conversationId, aiMessage);

        return ChatResponse.<List<?>>builder()
                .conversationId(conversationId)
                .answer(aiAnswer)
                .toolUsed(toolName)
                .success(true)
                .build();
    }
}
