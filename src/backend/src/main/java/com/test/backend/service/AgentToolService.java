package com.test.backend.service;

import com.test.backend.dto.agent.ToolResultHolder;
import com.test.backend.dto.booking.FilterInterviewerPositionResponse;
import com.test.backend.dto.question.FilterDifficulty;
import com.test.backend.dto.question.QuestionResponse;
import com.test.backend.entity.user.CustomUserDetail;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.util.List;

/**
 * Định nghĩa tập hợp các MCP Tool mà AI Agent có thể gọi trong quá trình
 * xử lý prompt của người dùng (tool-calling / function-calling).
 * Lưu ý quan trọng:
 * - Mỗi method @Tool KHÔNG nên throw exception thô ra ngoài, vì exception
 *   sẽ làm gãy vòng lặp tool-calling của AI model giữa chừng.
 *   -> Bắt exception, trả về message lỗi dạng String có ngữ nghĩa để AI
 *      có thể đọc hiểu và phản hồi lại cho user một cách hợp lý
 *      (VD: "Không thể tạo booking vì thiếu ngày giờ").
 * - Description trong @Tool phải rõ ràng, vì đây chính là "system context"
 *   để AI model quyết định có nên gọi tool này hay không.
 * - KHÔNG chứa business logic tại đây — chỉ đóng vai trò adapter/bridge
 *   gọi xuống các service core đã có sẵn của hệ thống.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AgentToolService {
    private final ObjectMapper objectMapper;
    private final BookingService bookingService;
    private final QuestionService questionService;
    private final PositionResolverService positionResolverService;

    @Autowired
    private ToolResultHolder resultHolder;

    private CustomUserDetail getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetail userDetail) {
            return userDetail;
        }
        log.warn("[AgentToolService] Không tìm thấy thông tin xác thực CustomUserDetail trong SecurityContext");
        return null;
    }

    @Tool(description = "Searches for questions based on a target job position or topic. If null response, stop immediately.")
    public List<QuestionResponse> searchQuestions(
            @ToolParam(description = "The required job position, MUST not be null") String position,
            @ToolParam(description = "Number of questions, default 10", required = false) Integer questionNum,
            @ToolParam(description = "Difficulty: EASY, MEDIUM, HARD") FilterDifficulty difficulty) {
        try {
            questionNum = questionNum != null ? questionNum : 10;
            difficulty = difficulty != null ? difficulty : FilterDifficulty.EASY;

            log.info("[Tool:searchQuestions] position={}", position);
            String resolvedPosition = positionResolverService.resolvePosition(position);
            List<QuestionResponse> questions = questionService.getQuestions(resolvedPosition, difficulty, questionNum);
            resultHolder.capture("searchQuestions", questions);
            // SCENARIO 1: NO DATA FOUND -> Tell the LLM to STOP immediately
            if (questions.isEmpty()) {
                log.error("No question matches requirements. Stop");
                return List.of();
            }
            // SCENARIO 2: DATA FOUND -> Return clean JSON and tell the LLM to respond
            return questions;
        } catch (Exception ex) {
            log.error("[Tool:searchQuestions] Lỗi khi tìm kiếm position={}: {}", position, ex.getMessage(), ex);
            return List.of();
        }
    }

    @Tool(description = "Find 1 week of available booking by filtering interviewer job position and required date")
    public List<FilterInterviewerPositionResponse> getAvailableBookingsByPosition(
            @ToolParam(description = "The required job position")
            String position,

            @ToolParam(description = "The required date, user will receive 1 week of available schedule from required date. Default is now", required = false)
            LocalDate date,

            @ToolParam(description = "Number of bookings. Default number is 10", required = false)
            Integer size) {
        try {
            // Thiết lập giá trị mặc định an toàn nếu AI hoặc User không truyền tham số phân trang
            int pageParam = 0;
            int sizeParam = (size != null) ? size : 10;
            LocalDate dateParam = (date != null) ? date : LocalDate.now();

            log.info("[Tool:getAvailableBookingsByPosition] position={}, date={}, size={}", position, dateParam, sizeParam);

            String resolvedPosition = positionResolverService.resolvePosition(position);

            // Gọi trực tiếp xuống hàm nghiệp vụ của BookingService
            Page<FilterInterviewerPositionResponse> responsePage = bookingService.filterInterviewerByPosition(resolvedPosition, dateParam, pageParam, sizeParam);
            List<FilterInterviewerPositionResponse> responseList;
            if (responsePage == null || !responsePage.hasContent()) {
                log.error("[Tool:getAvailableBookingsByPosition] There is no available booking for position={}. Stop searching and inform the user that no data exists.", position);
                return List.of();
            }
            else {
                responseList = responsePage.getContent();
            }

            // Chuyển đối tượng Page kết quả thành List
            return responseList;

        } catch (Exception ex) {
            log.error("[Tool:getAvailableBookingsByPosition] Lỗi khi lọc lịch hẹn theo position={}: {}", position, ex.getMessage(), ex);
            return List.of();
        }
    }

}