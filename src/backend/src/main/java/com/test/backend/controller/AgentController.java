package com.test.backend.controller;
import com.test.backend.dto.agent.ChatRequest;
import com.test.backend.dto.agent.ChatResponse;
import com.test.backend.service.AgentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/agent")
public class AgentController {

    private final AgentService agentService;

    /**
     * Endpoint chính: nhận prompt từ user, trả về câu trả lời hoàn chỉnh (non-stream).
     */
    @PostMapping("/prompt")
    public ResponseEntity<ChatResponse> sendPrompt(@Valid @RequestBody ChatRequest request) {
        ChatResponse response = agentService.processPrompt(request);
        return ResponseEntity.ok(response);
    }
}