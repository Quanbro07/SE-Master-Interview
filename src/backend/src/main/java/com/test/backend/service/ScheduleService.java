package com.test.backend.service;

import com.test.backend.dto.schedule.*;
import com.test.backend.entity.availableSchedule.AvailableSchedule;
import com.test.backend.entity.blockedSchedule.BlockedSchedule;
import com.test.backend.entity.blockedSchedule.BlockedSchedulePurpose;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.EmptyInputException;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.exception.customException.ScheduleConflictException;
import com.test.backend.repository.AvailableScheduleRepository;
import com.test.backend.repository.BlockedScheduleRepository;
import com.test.backend.repository.InterviewerRepository;
import com.test.backend.service.jwt.JwtService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class ScheduleService {

    private final AvailableScheduleRepository availableScheduleRepository;
    private final InterviewerRepository interviewerRepository;

    private final JwtService jwtService;

    private final BlockedScheduleRepository blockedScheduleRepository;

    @Transactional
    public void updateAvailableSchedule(Long userId, AvailableScheduleDTO request) {
        if (request.scheduleDTOList() == null || request.scheduleDTOList().isEmpty()) {
            throw new EmptyInputException("Error: Request Empty");
        }

        Interviewer interviewer = interviewerRepository.findByInterviewerId(userId)
                .orElseThrow(() -> new NotFoundException("Interviewer Not Found"));

        Set<Short> daysOfWeek = request.scheduleDTOList().stream()
                .map(ScheduleDTO::dayOfWeek)
                .collect(Collectors.toSet());

        // Xóa hết Available Schedule dựa trên interviewerId và dayOfWeek
        availableScheduleRepository.deleteByInterviewerIdAndDayOfWeekIn(userId, daysOfWeek);

        // Interval Merge
        List<ScheduleDTO> mergeIntervalList = this.mergeInterval(request.scheduleDTOList());

        List<AvailableSchedule> newAvailableScheduleList = new ArrayList<>();
        // Tạo ra các Available Schedule mới
        for (ScheduleDTO schedule : mergeIntervalList) {

            Short dayOfWeek = schedule.dayOfWeek();

            for (ScheduleTimeDTO scheduleTime : schedule.scheduleTimeDTOList()) {

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


    // * Get Available Schedule
    public Map<Long, List<DailyFreeScheduleDTO>> getAvailableScheduleForInterviewers(
            List<Long> interviewerIds, LocalDate dateInWeek) {

        if (interviewerIds.isEmpty()) return Collections.emptyMap();

        LocalDate monday = dateInWeek.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime startOfWeek = monday.atStartOfDay();
        LocalDateTime endOfWeek = monday.plusDays(6).atTime(LocalTime.MAX);

        // 1. QUERY BATCH
        List<AvailableSchedule> allTemplates = availableScheduleRepository
                .findAllByInterviewer_InterviewerIdIn(interviewerIds);
        List<BlockedSchedule> allBlocks = blockedScheduleRepository
                .findOverlappingBlocksForInterviewers(interviewerIds, startOfWeek, endOfWeek);

        // 2. GOM NHÓM THEO INTERVIEWER_ID
        Map<Long, List<AvailableSchedule>> templatesByInterviewer = allTemplates.stream()
                .collect(Collectors.groupingBy(t -> t.getInterviewer().getInterviewerId()));

        Map<Long, List<BlockedSchedule>> blocksByInterviewer = allBlocks.stream()
                .collect(Collectors.groupingBy(b -> b.getInterviewer().getInterviewerId()));

        // 3. TÍNH TOÁN LỊCH CHO TỪNG NGƯỜI
        Map<Long, List<DailyFreeScheduleDTO>> result = new HashMap<>();

        for (Long interviewerId : interviewerIds) {
            List<AvailableSchedule> myTemplates = templatesByInterviewer.getOrDefault(interviewerId, Collections.emptyList());
            List<BlockedSchedule> myBlocks = blocksByInterviewer.getOrDefault(interviewerId, Collections.emptyList());

            // Gom template của người này theo ngày trong tuần
            Map<Short, List<AvailableSchedule>> templateByDay = myTemplates.stream()
                    .collect(Collectors.groupingBy(AvailableSchedule::getDayOfWeek));

            List<DailyFreeScheduleDTO> dailyScheduleList = new ArrayList<>();

            for (int i = 0; i < 7; i++) {
                LocalDate currentDate = monday.plusDays(i);
                short dayOfWeekId = (short) (currentDate.getDayOfWeek().getValue() + 1);

                List<AvailableSchedule> dailyTemplates = templateByDay.getOrDefault(dayOfWeekId, Collections.emptyList());
                if (dailyTemplates.isEmpty()) continue;

                List<ScheduleTimeDTO> dailyFreeTimeDTOs = new ArrayList<>();

                LocalDateTime now = LocalDateTime.now();
                for (AvailableSchedule template : dailyTemplates) {
                    LocalDateTime availStart = LocalDateTime.of(currentDate, template.getStartTime());
                    LocalDateTime availEnd = LocalDateTime.of(currentDate, template.getEndTime());

                    // TH 1: Khung giờ này đã hoàn toàn nằm trong quá khứ -> Bỏ qua luôn
                    if (availEnd.isBefore(now)) {
                        continue;
                    }

                    // TH 2: Khung giờ này đang diễn ra (VD: Ca từ 13h - 17h, mà giờ đang là 14h)
                    // -> Cắt bỏ khúc 13h-14h, chỉ cho book từ 14h trở đi
                    if (availStart.isBefore(now)) {
                        availStart = now;
                    }

                    // Tính toán overlap với myBlocks thay vì gọi DB
                    List<TimeSlot> freeSlots = calculateFreeTimeSlots(availStart, availEnd, myBlocks);

                    for (TimeSlot slot : freeSlots) {
                        if (slot.start().isBefore(slot.end())) {
                            dailyFreeTimeDTOs.add(new ScheduleTimeDTO(slot.start().toLocalTime(), slot.end().toLocalTime()));
                        }
                    }
                }

                if (!dailyFreeTimeDTOs.isEmpty()) {
                    dailyFreeTimeDTOs.sort(Comparator.comparing(ScheduleTimeDTO::startTime));
                    dailyScheduleList.add(new DailyFreeScheduleDTO(currentDate, dayOfWeekId, dailyFreeTimeDTOs));
                }
            }

            result.put(interviewerId, dailyScheduleList);
        }
        return result;
    }

    public AvailableScheduleDTO getAvailableSchedule(Long userId, LocalDate dateInWeek) {
        // 1. Xác định khung thời gian của tuần chứa dateInWeek (Thứ 2 00:00:00 đến Chủ Nhật 23:59:59)
        LocalDate monday = dateInWeek.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        LocalDateTime startOfWeek = monday.atStartOfDay();
        LocalDateTime endOfWeek = monday.plusDays(6).atTime(LocalTime.MAX);

        // 2. Fetch dữ liệu
        List<AvailableSchedule> availableTemplates =
                availableScheduleRepository.findAllByInterviewer_InterviewerId(userId);
        List<BlockedSchedule> overlappingBlocks =
                blockedScheduleRepository.findOverlappingBlockedSchedules(userId, startOfWeek, endOfWeek);

        // Group templates theo dayOfWeek 1 LẦN DUY NHẤT, tránh lặp lại mỗi vòng for
        Map<Short, List<AvailableSchedule>> templateByDay = availableTemplates.stream()
                .collect(Collectors.groupingBy(AvailableSchedule::getDayOfWeek));

        List<ScheduleDTO> scheduleDTOList = new ArrayList<>();

        // 3. Duyệt qua 7 ngày trong tuần (Thứ 2 -> Chủ Nhật)
        for (int i = 0; i < 7; i++) {
            LocalDate currentDate = monday.plusDays(i);
            short dayOfWeekId = (short) (currentDate.getDayOfWeek().getValue() + 1); // Java (1-7) -> App (2-8)

            List<AvailableSchedule> dailyTemplates =
                    templateByDay.getOrDefault(dayOfWeekId, Collections.emptyList());
            if (dailyTemplates.isEmpty()) continue;

            List<ScheduleTimeDTO> dailyFreeTimeDTOs = new ArrayList<>();

            for (AvailableSchedule template : dailyTemplates) {
                LocalDateTime availStart = LocalDateTime.of(currentDate, template.getStartTime());
                LocalDateTime availEnd = LocalDateTime.of(currentDate, template.getEndTime());

                List<TimeSlot> freeSlots = calculateFreeTimeSlots(availStart, availEnd, overlappingBlocks);

                for (TimeSlot slot : freeSlots) {
                    if (slot.start().isBefore(slot.end())) {
                        dailyFreeTimeDTOs.add(
                                new ScheduleTimeDTO(slot.start().toLocalTime(), slot.end().toLocalTime()));
                    }
                }
            }

            // Chỉ add vào kết quả sau khi đã xử lý HẾT các template của ngày đó
            if (!dailyFreeTimeDTOs.isEmpty()) {
                dailyFreeTimeDTOs.sort(Comparator.comparing(ScheduleTimeDTO::startTime));
                scheduleDTOList.add(new ScheduleDTO(dayOfWeekId, dailyFreeTimeDTOs));
            }
        }

        // 4. Return SAU KHI đã duyệt xong toàn bộ 7 ngày
        return AvailableScheduleDTO.builder()
                .scheduleDTOList(scheduleDTOList)
                .build();
    }

    // * Add Bocked Schedule
    public void addBlockedSchedule(Long userId, AddBlockedScheduleRequest request) {
        LocalDateTime now = LocalDateTime.now();

        // Rule cơ bản: Thời gian block không được ở trong quá khứ
        if (request.startTime().isBefore(now)) {
            throw new ScheduleConflictException("Không thể block lịch trong quá khứ");
        }

        // Lấy tất cả các lịch đã block hoặc đã book nằm trong khoảng thời gian này
        List<BlockedSchedule> overlaps = blockedScheduleRepository.findOverlappingBlockedSchedules(
                userId, request.startTime(), request.endTime()
        );

        for (BlockedSchedule overlap : overlaps) {
            // Nếu phát hiện trùng với lịch đã có người Book -> Bắn lỗi ngay
            if (overlap.getPurpose() == BlockedSchedulePurpose.INTERVIEW_BOOKED) {
                throw new ScheduleConflictException("Không thể block! Khung giờ này đã có ứng viên đặt lịch phỏng vấn.");
            }

            // Nếu trùng với một lịch Personal khác đã tạo trước đó -> Cũng có thể báo lỗi hoặc gộp lại tùy business
            if (overlap.getPurpose() == BlockedSchedulePurpose.PERSONAL) {
                throw new ScheduleConflictException("Khung giờ này đã được block từ trước.");
            }
        }
        
        Interviewer interviewer = interviewerRepository.findByInterviewerId(userId)
            .orElseThrow(() -> new NotFoundException("Interviewer Not Found"));
        BlockedSchedule newBlockSchedule = BlockedSchedule.builder()
                .interviewer(interviewer)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .purpose(request.purpose())
                .note(request.note())
                .build();

        blockedScheduleRepository.save(newBlockSchedule);
    }

    // * Helper
    private record TimeSlot(LocalDateTime start, LocalDateTime end) {}

    /**
     * Thuật toán Merge Interval loại bỏ các overlap time
     */
    private List<ScheduleDTO> mergeInterval(List<ScheduleDTO> list) {
        List<ScheduleDTO> mergedScheduleDTOS = new ArrayList<>();

        for (ScheduleDTO schedule : list) {
            List<ScheduleTimeDTO> scheduleTimes = schedule.scheduleTimeDTOList();

            // 1. Kiểm tra list rỗng hoặc chỉ có 1 phần tử thì không cần gộp
            if (scheduleTimes == null || scheduleTimes.size() <= 1) {
                mergedScheduleDTOS.add(schedule);
                continue;
            }

            // 2. Sort
            List<ScheduleTimeDTO> sortedTimes = scheduleTimes.stream()
                    .sorted(Comparator.comparing(ScheduleTimeDTO::startTime))
                    .collect(Collectors.toList());

            // 3. Khởi tạo danh sách chứa kết quả sau khi gộp
            List<ScheduleTimeDTO> mergedTimes = new ArrayList<>();

            // Lấy khoảng thời gian đầu tiên làm mốc (current)
            ScheduleTimeDTO current = sortedTimes.get(0);

            for (int i = 1; i < sortedTimes.size(); i++) {
                ScheduleTimeDTO next = sortedTimes.get(i);

                // So sánh: Nếu current.endTime >= next.startTime -> Có giao nhau
                if (!current.endTime().isBefore(next.startTime())) {

                    // Cập nhật endTime bằng giá trị lớn hơn giữa 2 khoảng
                    LocalTime maxEndTime = current.endTime().isAfter(next.endTime())
                            ? current.endTime()
                            : next.endTime();

                    // Tạo lại object current với endTime mới đã được gộp
                    current = new ScheduleTimeDTO(current.startTime(), maxEndTime);
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
            mergedScheduleDTOS.add(new ScheduleDTO(
                    schedule.dayOfWeek(), // Thay đổi cho phù hợp với field thực tế của bạn
                    mergedTimes
            ));

        }

        return mergedScheduleDTOS;
    }

    /**
     * Thuật toán Interval Subtraction sử dụng LocalDateTime
     */
    private List<TimeSlot> calculateFreeTimeSlots(LocalDateTime availStart, LocalDateTime availEnd, List<BlockedSchedule> blocks) {
        List<TimeSlot> freeSlots = new ArrayList<>();
        freeSlots.add(new TimeSlot(availStart, availEnd));

        if (blocks == null || blocks.isEmpty()) {
            return freeSlots;
        }

        for (BlockedSchedule block : blocks) {
            List<TimeSlot> nextFreeSlots = new ArrayList<>();

            for (TimeSlot slot : freeSlots) {
                // Điều kiện giao nhau toán học: Start1 < End2 VÀ End1 > Start2
                boolean isOverlapping = block.getStartTime().isBefore(slot.end())
                        && block.getEndTime().isAfter(slot.start());

                if (isOverlapping) {
                    // Giữ lại khúc đầu (nếu có)
                    if (slot.start().isBefore(block.getStartTime())) {
                        nextFreeSlots.add(new TimeSlot(slot.start(), block.getStartTime()));
                    }
                    // Giữ lại khúc đuôi (nếu có)
                    if (slot.end().isAfter(block.getEndTime())) {
                        nextFreeSlots.add(new TimeSlot(block.getEndTime(), slot.end()));
                    }
                } else {
                    // Không trùng thì giữ nguyên vẹn
                    nextFreeSlots.add(slot);
                }
            }
            freeSlots = nextFreeSlots;
        }

        return freeSlots;
    }
}
