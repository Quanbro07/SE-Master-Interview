package com.test.backend.controller;

import com.test.backend.dto.agent.ChatRequest;
import com.test.backend.dto.agent.ChatResponse;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.service.AgentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    @PostMapping("/dummy")
    public ResponseEntity<String> sendDummy(@RequestBody ChatRequest request) {
        return ResponseEntity.ok("Reached the controller successfully!");
    }

    @PostMapping("/prompt")
    public ResponseEntity<ChatResponse> sendPrompt(
            @RequestBody ChatRequest request,
            @AuthenticationPrincipal CustomUserDetail userDetail) {
        Long interviewee_id = userDetail.getUser().getUserId();
        ChatResponse response = agentService.processPrompt(interviewee_id, request);
        return ResponseEntity.ok(response);
    }
}