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
                .system("""
                STRICT RULES:
                1. You are strictly a database-retrieval assistant. You MUST ONLY use questions provided in the response from `searchQuestions`.
                2. NEVER make up, invent, or generate interview questions from your pre-trained knowledge.
                3. If `searchQuestions` returns 'STATUS: EMPTY' or no data, you MUST stop immediately and tell the user: 
                   "Sorry, we currently do not have any interview questions for that position in our database."
                4. Do not offer alternative generic questions if none were returned by the tool.
                """)
                .user(prompt)
                .tools(agentToolService)
                .call()
                .content();
    }
}
