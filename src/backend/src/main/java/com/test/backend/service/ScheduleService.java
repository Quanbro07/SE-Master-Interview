package com.test.backend.service;

import com.stripe.model.Account;
import com.test.backend.dto.schedule.AvailableScheduleRequest;
import com.test.backend.dto.schedule.ScheduleRequest;
import com.test.backend.dto.schedule.ScheduleTimeRequest;
import com.test.backend.entity.availableSchedule.AvailableSchedule;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.EmptyInputException;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.AvailableScheduleRepository;
import com.test.backend.repository.InterviewerRepository;
import com.test.backend.service.jwt.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class ScheduleService {

    private final AvailableScheduleRepository availableScheduleRepository;

    private final InterviewerRepository interviewerRepository;

    private final JwtService jwtService;

    @Transactional
    public void updateAvailableSchedule(String token, AvailableScheduleRequest request) {
        if (request.scheduleRequestList() == null || request.scheduleRequestList().isEmpty()) {
            throw new EmptyInputException("Error: Request Empty");
        }

        Claims claims = jwtService.extractAllClaims(token);

        Long userId = claims.get("userId", Long.class);

        Interviewer interviewer = interviewerRepository.findByInterviewerId(userId)
                .orElseThrow(() -> new NotFoundException("Interviewer Not Found"));

        Set<Short> daysOfWeek = request.scheduleRequestList().stream()
                .map(ScheduleRequest::dayOfWeek)
                .collect(Collectors.toSet());

        // Xóa hết Available Schedule dựa trên interviewerId và dayOfWeek
        availableScheduleRepository.deleteByInterviewerIdAndDayOfWeekIn(userId, daysOfWeek);

        // Interval Merge
        List<ScheduleRequest> mergeIntervalList = this.mergeInterval(request.scheduleRequestList());

        List<AvailableSchedule> newAvailableScheduleList = new ArrayList<>();
        // Tạo ra các Available Schedule mới
        for(ScheduleRequest schedule: mergeIntervalList) {

            Short dayOfWeek = schedule.dayOfWeek();

            for(ScheduleTimeRequest scheduleTime: schedule.scheduleTimeRequestList()) {

                AvailableSchedule newAvailableSchedule = AvailableSchedule.builder()
                        .dayOfWeek(dayOfWeek)
                        .startTime(scheduleTime.startTime())
                        .endTime(scheduleTime.endTime())
                        .build();

                newAvailableSchedule.setInterviewer(interviewer);

                // Add vào List
                newAvailableScheduleList.add(newAvailableSchedule);
            }
        }

        // Lưu vào database
        availableScheduleRepository.saveAll(newAvailableScheduleList);

    }

    private List<ScheduleRequest> mergeInterval(List<ScheduleRequest> list) {
        List<ScheduleRequest> mergedScheduleRequests = new ArrayList<>();

        for(ScheduleRequest schedule : list) {
            List<ScheduleTimeRequest> scheduleTimes = schedule.scheduleTimeRequestList();

            // 1. Kiểm tra list rỗng hoặc chỉ có 1 phần tử thì không cần gộp
            if (scheduleTimes == null || scheduleTimes.size() <= 1) {
                mergedScheduleRequests.add(schedule);
                continue;
            }

            // 2. Sort
            List<ScheduleTimeRequest> sortedTimes = scheduleTimes.stream()
                    .sorted(Comparator.comparing(ScheduleTimeRequest::startTime))
                    .collect(Collectors.toList());

            // 3. Khởi tạo danh sách chứa kết quả sau khi gộp
            List<ScheduleTimeRequest> mergedTimes = new ArrayList<>();

            // Lấy khoảng thời gian đầu tiên làm mốc (current)
            ScheduleTimeRequest current = sortedTimes.get(0);

            for (int i = 1; i < sortedTimes.size(); i++) {
                ScheduleTimeRequest next = sortedTimes.get(i);

                // So sánh: Nếu current.endTime >= next.startTime -> Có giao nhau
                if (!current.endTime().isBefore(next.startTime())) {

                    // Cập nhật endTime bằng giá trị lớn hơn giữa 2 khoảng
                    LocalTime maxEndTime = current.endTime().isAfter(next.endTime())
                            ? current.endTime()
                            : next.endTime();

                    // Tạo lại object current với endTime mới đã được gộp
                    current = new ScheduleTimeRequest(current.startTime(), maxEndTime);
                } else {
                    // Nếu không giao nhau, đẩy current vào danh sách kết quả
                    mergedTimes.add(current);
                    // Cập nhật mốc current sang khoảng thời gian tiếp theo
                    current = next;
                }
            }

            // Đừng quên đẩy phần tử current cuối cùng vào danh sách
            mergedTimes.add(current);

            // 4. Tạo ScheduleRequest mới với danh sách time đã gộp và lưu vào list tổng
            mergedScheduleRequests.add(new ScheduleRequest(
                    schedule.dayOfWeek(), // Thay đổi cho phù hợp với field thực tế của bạn
                    mergedTimes
            ));

        }

        return mergedScheduleRequests;
    }

}
