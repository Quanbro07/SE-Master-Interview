package com.test.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.test.backend.dto.agent.MessageModel;
import com.test.backend.exception.customException.AgentException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatHistoryService {

    private static final String KEY_PREFIX = "agent:chat:history:";

    // SỬA: Đổi kiểu dữ liệu về StringRedisTemplate chuẩn (không có <String, Object>)
    private final StringRedisTemplate redisTemplate;

    // THÊM: Inject ObjectMapper để tự parse JSON thủ công, thay thế cho Serializer cũ của Redis
    private final ObjectMapper objectMapper;

    @Value("${agent.chat-history.max-messages:20}")
    private int maxMessages;

    @Value("${agent.chat-history.ttl-hours:24}")
    private long ttlHours;

    private String buildKey(String conversationId) {
        return KEY_PREFIX + conversationId;
    }

    public List<MessageModel> getRecentHistory(String conversationId) {
        try {
            String key = buildKey(conversationId);
            // SỬA: Ép kiểu ListOperations về dạng <String, String> để khớp với StringRedisTemplate
            ListOperations<String, String> listOps = redisTemplate.opsForList();

            // Không có key -> conversation mới, trả về list rỗng thay vì throw exception
            Long size = listOps.size(key);
            if (size == null || size == 0) {
                return Collections.emptyList();
            }

            // SỬA: Danh sách trả về từ Redis giờ là String (JSON)
            List<String> rawList = listOps.range(key, 0, -1);
            if (rawList == null) {
                return Collections.emptyList();
            }

            // SỬA: Parse chuỗi JSON String ngược thành Object MessageModel
            return rawList.stream()
                    .map(json -> {
                        try {
                            return objectMapper.readValue(json, MessageModel.class);
                        } catch (Exception e) {
                            log.error("[ChatHistoryService] Lỗi parse JSON lịch sử chat: {}", e.getMessage());
                            return null;
                        }
                    })
                    .filter(java.util.Objects::nonNull)
                    .toList();

        } catch (Exception ex) {
            // Lỗi kết nối Redis không nên làm sập luồng chat -> log lỗi, coi như không có history
            log.error("[ChatHistoryService] Lỗi khi lấy lịch sử chat cho conversationId={}: {}",
                    conversationId, ex.getMessage(), ex);
            return Collections.emptyList();
        }
    }

    public void appendMessage(String conversationId, MessageModel message) {
        try {
            String key = buildKey(conversationId);
            // SỬA: Ép kiểu ListOperations về dạng <String, String>
            ListOperations<String, String> listOps = redisTemplate.opsForList();

            // SỬA: Chuyển Object thành chuỗi JSON trước khi đẩy vào Redis
            String jsonMessage = objectMapper.writeValueAsString(message);
            listOps.rightPush(key, jsonMessage);

            // Cắt bớt các message cũ nhất nếu vượt giới hạn (giữ N message gần nhất)
            listOps.trim(key, -maxMessages, -1);

            // Set/refresh TTL để tránh phình Redis với các conversation "chết"
            redisTemplate.expire(key, Duration.ofHours(ttlHours));

        } catch (Exception ex) {
            log.error("[ChatHistoryService] Lỗi khi lưu message vào Redis cho conversationId={}: {}",
                    conversationId, ex.getMessage(), ex);
            // Ném lỗi rõ ràng để AgentService quyết định có nên fail cả request hay không
            throw new AgentException("Không thể lưu lịch sử chat vào Redis", ex);
        }
    }

    public void clearHistory(String conversationId) {
        try {
            redisTemplate.delete(buildKey(conversationId));
        } catch (Exception ex) {
            log.error("[ChatHistoryService] Lỗi khi xoá lịch sử chat conversationId={}: {}",
                    conversationId, ex.getMessage(), ex);
            throw new AgentException("Không thể xoá lịch sử chat", ex);
        }
    }
}
