package com.test.backend.service;

import com.test.backend.dto.agent.MessageModel;
import lombok.RequiredArgsConstructor; // THÊM IMPORT
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service; // THÊM ANNOTATION XÁC ĐỊNH BEAN
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiAgentService {

    private final ChatClient chatClient;

    private final AgentToolService agentToolService;

    public String generateAnswer(String prompt, List<MessageModel> context) {
        return chatClient.prompt()
                .user(prompt)
                .tools(agentToolService)
                .call()
                .content();
    }
}
