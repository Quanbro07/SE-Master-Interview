package com.test.backend.service;

import com.test.backend.dto.question.FilterDifficulty;
import com.test.backend.dto.question.QuestionResponse;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

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
    private final CVAssessmentService cvAssessmentService;
    private final EmailService emailService;
    private final UserService userProfileService;
    private final ScheduleService scheduleService;
    private final QuestionService questionService;
    private final PositionRepository positionRepository;

    private CustomUserDetail getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetail userDetail) {
            return userDetail;
        }
        log.warn("[AgentToolService] Không tìm thấy thông tin xác thực CustomUserDetail trong SecurityContext");
        return null;
    }

    @Tool(description = "Tìm kiếm danh sách câu hỏi trong ngân hàng câu hỏi theo vi tri cong viec, so cau hoi, do kho")
    public String searchQuestions(
            @ToolParam(description = "Vi tri cong viec can hoi, bat buoc co") String position,
            @ToolParam(description = "Number of questions, default 10", required = false) Integer questionNum,
            @ToolParam(description = "Difficulty: EASY, MEDIUM, HARD") FilterDifficulty difficulty) {
        try {
            log.info("[Tool:searchQuestions] position={}", position);

            List<QuestionResponse> questions = questionService.getQuestions(position, difficulty, questionNum);

            return objectMapper.writeValueAsString(questions);
        } catch (Exception ex) {
            log.error("[Tool:searchQuestions] Lỗi khi tìm kiếm position={}: {}", position, ex.getMessage(), ex);
            return "Không thể tìm kiếm câu hỏi với position: " + position;
        }
    }
    @Tool(description = "Lấy danh sách các vị trí chuyên môn/chức vụ sẵn có của các Người Phỏng Vấn (Interviewer) trong hệ thống. Dùng để biết hệ thống hiện có những chuyên gia thuộc lĩnh vực nào.")
    public String getAvailableInterviewerPositions() {
        try {
            log.info("[Tool:getAvailableInterviewerPositions] Đang lấy danh sách vị trí của interviewer");

            // Giả định bạn có PositionService hoặc UserService để lấy danh sách này
            // Ví dụ: positionService.getInterviewerPositions() trả về List<PositionResponse> hoặc List<String>
            List<String> positions = positionRepository.findAll().stream()
                    .map(Position::getPositionName)
                    .toList();

            if (positions.isEmpty()) {
                return "Hiện tại chưa có danh sách vị trí chuyên môn nào được cấu hình cho Người Phỏng Vấn.";
            }

            // Chuyển thành JSON
            return objectMapper.writeValueAsString(positions);

        } catch (Exception ex) {
            log.error("[Tool:getAvailableInterviewerPositions] Lỗi khi lấy danh sách vị trí: {}", ex.getMessage(), ex);
            return "Không thể lấy danh sách vị trí của Người Phỏng Vấn do lỗi hệ thống.";
        }
    }


    @Tool(description = "Tìm kiếm danh sách lịch hẹn/booking khả dụng (available) bằng cách lọc các Người Phỏng Vấn (Interviewer) theo vị trí chuyên môn của họ. Kết quả có hỗ trợ phân trang.")
    public String getAvailableBookingsByPosition(
            @ToolParam(description = "Tên vị trí chuyên môn của Người Phỏng Vấn cần lọc, lấy từ Tool getAvailableInterviewerPositions (Ví dụ: Java, React, Product Manager)")
            String position,

            @ToolParam(description = "Số trang dữ liệu cần lấy, bắt đầu từ 0. Mặc định là 0 nếu không chỉ định", required = false)
            Integer page,

            @ToolParam(description = "Số lượng bản ghi trên một trang. Mặc định là 10 nếu không chỉ định", required = false)
            Integer size) {
        try {
            // Thiết lập giá trị mặc định an toàn nếu AI hoặc User không truyền tham số phân trang
            int pageParam = (page != null) ? page : 0;
            int sizeParam = (size != null) ? size : 10;

            log.info("[Tool:getAvailableBookingsByPosition] position={}, page={}, size={}", position, pageParam, sizeParam);

            // Gọi trực tiếp xuống hàm nghiệp vụ của BookingService
            var responsePage = bookingService.filterInterviewerByPosition(position, pageParam, sizeParam);

            if (responsePage == null || !responsePage.hasContent()) {
                return "Hiện tại không có lịch hẹn hoặc người phỏng vấn nào khả dụng cho vị trí: " + position;
            }

            // Chuyển đối tượng Page kết quả thành JSON String cho AI tự tổng hợp câu trả lời
            return objectMapper.writeValueAsString(responsePage);

        } catch (Exception ex) {
            log.error("[Tool:getAvailableBookingsByPosition] Lỗi khi lọc lịch hẹn theo position={}: {}", position, ex.getMessage(), ex);
            return "Không thể tìm kiếm các lịch hẹn khả dụng vào lúc này do lỗi hệ thống.";
        }
    }

}