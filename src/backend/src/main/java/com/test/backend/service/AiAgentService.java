package com.test.backend.service;

import com.test.backend.dto.agent.ChatResponse;
import com.test.backend.dto.agent.MessageModel;
import com.test.backend.dto.agent.ToolResultHolder;
import lombok.RequiredArgsConstructor; // THÊM IMPORT
import lombok.extern.slf4j.Slf4j;
import org.hibernate.internal.util.collections.Stack;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service; // THÊM ANNOTATION XÁC ĐỊNH BEAN
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiAgentService {

    private final ChatClient chatClient;

    private final AgentToolService agentToolService;

    @Autowired
    private ToolResultHolder resultHolder;

    public List<?> generateAnswer(String prompt, List<MessageModel> context) {
        String ai_answer = chatClient.prompt()
                .system("""
                STRICT RULES:
                1. You are strictly a database-retrieval assistant. ONLY use data from tools.
                2. If a tool returns no data or [], DO NOT invent questions/bookings.
                """)
                .user(prompt)
                .tools(agentToolService)
                .call()
                .content();

        if (resultHolder.hasResult()) {
            Object data = resultHolder.getData();
            if (data instanceof List<?> list) {
                return list; // Safely casted
            } else if (data != null) {
                return List.of(data); // Wraps single object into a list
            }
        }
        return List.of();
    }
}
