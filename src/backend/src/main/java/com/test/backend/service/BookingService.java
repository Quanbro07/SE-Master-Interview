package com.test.backend.service;

import com.test.backend.dto.booking.BookingRequest;
import com.test.backend.dto.booking.BookingStatusResponse;
import com.test.backend.dto.booking.ConfirmBookingRequest;
import com.test.backend.dto.booking.bookingResponse.BookerResponseDTO;
import com.test.backend.dto.booking.bookingResponse.BookingResponse;
import com.test.backend.dto.booking.FilterInterviewerPositionResponse;
import com.test.backend.dto.booking.bookingResponse.InterviewerResponseDTO;
import com.test.backend.dto.schedule.blockedSchedule.AddBlockedScheduleRequest;
import com.test.backend.entity.blockedSchedule.BlockedSchedulePurpose;
import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.booking.BookingStatus;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewee.Interviewee;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.ForbiddenOperationException;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.exception.customException.ScheduleConflictException;
import com.test.backend.repository.*;
import com.test.backend.zoom.ZoomAsyncService;
import com.test.backend.zoom.ZoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@RequiredArgsConstructor
@Service
public class BookingService {

    private final InterviewerExpertiseRepository interviewerExpertiseRepository;

    private final ScheduleService scheduleService;

    private final PositionRepository positionRepository;

    private final InterviewerRepository interviewerRepository;

    private final IntervieweeRepository intervieweeRepository;

    private final BookingRepository bookingRepository;

    private final ZoomAsyncService zoomAsyncService;

    private final ZoomService zoomService;

    public Page<FilterInterviewerPositionResponse> filterInterviewerByPosition(String position, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Page<InterviewerExpertise> expertisePage = interviewerExpertiseRepository
                .findAllByPositionWithBalancedSort(position, pageable);

        Page<FilterInterviewerPositionResponse> response =
                expertisePage.map(this::coverToFilterInterviewerPositionResponse);

        return response;
    }


    public BookingResponse createBooking(Long intervieweeId, BookingRequest request) {
        LocalDateTime startTime = request.startDate();
        LocalDateTime endTime = request.endDate();

        LocalDateTime now = LocalDateTime.now();

        if(endTime.isBefore(startTime)) {
            throw new ScheduleConflictException("End time is before start time");
        }
        else if(startTime.isBefore(now) || endTime.isBefore(now)) {
            throw new ScheduleConflictException("Start time or End time is before Current Time");
        }

        Duration duration = Duration.between(startTime, endTime);
        if (duration.compareTo(Duration.ofHours(5)) > 0) {
            throw new ScheduleConflictException("Meeting duration cannot exceed 5 hours");
        }

        // Query lấy dữ liệu

        Position position = positionRepository.findByPositionNameIgnoreCase(request.positionName())
                .orElseThrow(() -> new NotFoundException("Position not found"));

        Interviewer interviewer = interviewerRepository.findByInterviewerIdFetchUser(request.interviewerId())
                .orElseThrow(() -> new NotFoundException("Interviewer not found"));

        Interviewee interviewee = intervieweeRepository.findByIntervieweeIdFetchUser(intervieweeId)
                .orElseThrow(() -> new NotFoundException("Interviewee not found"));

        // Build Wrapper để add blocket Schedule cho Interviewer
        AddBlockedScheduleRequest blockedScheduleRequest = AddBlockedScheduleRequest.builder()
                .startTime(startTime)
                .endTime(endTime)
                .purpose(BlockedSchedulePurpose.INTERVIEW_BOOKED)
                .note(request.note())
                .build();

        scheduleService.addBlockedSchedule(intervieweeId, blockedScheduleRequest);

        Booking newBooking = Booking.builder()
                .interviewer(interviewer)
                .booker(interviewee)
                .startTime(startTime)
                .endTime(endTime)
                .build();

        bookingRepository.save(newBooking);

        return this.buildBookingResponse(interviewee, interviewer, intervieweeId, newBooking) ;
    }

    public List<BookingResponse> getAllBooking(Long userId, BookingStatus status) {
        List<Booking> bookingList = bookingRepository.findAllByUserIdAndStatusFilterFetchUser(userId, status);



        List<BookingResponse> responseList = bookingList.stream()
                .map(booking -> {
                    Interviewer interviewer = booking.getInterviewer();
                    Interviewee interviewee = booking.getBooker();

                    return this.buildBookingResponse(interviewee, interviewer, userId, booking);
                })
                .toList();

        return responseList;
    }

    // Confirm Booking
    public BookingStatusResponse confirmBooking(Long userId, Long bookingId, ConfirmBookingRequest request) {

        Booking booking = bookingRepository.findByBookingIdAndInterviewer_InterviewerId(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        // Set Trạng thái Accepted
        booking.setStatus(BookingStatus.ACCEPTED);
        bookingRepository.save(booking);

        Long duration = Duration.between(booking.getStartTime(), booking.getEndTime()).toMinutes();

        // Async tạo link meeting
        zoomAsyncService.generateMeetLink(bookingId, request, duration);

        return BookingStatusResponse.builder()
                .bookingId(bookingId)
                .bookingStatus(booking.getStatus())
                .build();
    }

    // Reject Booking
    public BookingStatusResponse rejectBooking(Long userId, Long bookingId) {
        Booking booking = bookingRepository.findByBookingIdAndInterviewer_InterviewerId(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        booking.setStatus(BookingStatus.REJECTED);
        bookingRepository.save(booking);

        return BookingStatusResponse.builder()
                .bookingId(bookingId)
                .bookingStatus(booking.getStatus())
                .build();
    }

    // Get Start Url of Zoom
    public String getMeetingStartUrl(Long bookingId, Long userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        // 1. Kiểm tra bảo mật: Chỉ Interviewer của buổi này mới được lấy startUrl
        if (!booking.getInterviewer().getInterviewerId().equals(userId)) {
            throw new ForbiddenOperationException("Only the designated interviewer can start this meeting");
        }


        String freshStartUrl = zoomService.getFreshStartUrl(booking.getMeetingId());

        // Set và lưu xuống db để có gì ko gọi lại
        booking.setStartUrl(freshStartUrl);
        bookingRepository.save(booking);

        return freshStartUrl;


    }



    // Helper Function
    private FilterInterviewerPositionResponse coverToFilterInterviewerPositionResponse(InterviewerExpertise expertise) {
        Interviewer interviewer = expertise.getInterviewer();
        User user = interviewer.getUser();

        return FilterInterviewerPositionResponse.builder()
                .interviewerId(interviewer.getInterviewerId())
                .email(user.getEmail())
                .userName(user.getUserName())
                .fullName(user.getFullName())
                .linkedinUrl(user.getLinkedinUrl())
                .githubUrl(user.getGithubUrl())
                .level(expertise.getLevel())
                .experienceYear(expertise.getExperienceYear())
                .build();
    }

    // Booking Response Builder
    private BookingResponse buildBookingResponse(
            Interviewee booker,
            Interviewer interviewer,
            Long currentUserId,
            Booking newBooking) {

        User bookerUser = booker.getUser();
        BookerResponseDTO bookerDTO = BookerResponseDTO.builder()
                .bookerId(bookerUser.getUserId())
                .bookerEmail(bookerUser.getEmail())
                .bookerName(bookerUser.getFullName())
                .bookerAvatar(bookerUser.getAvatar())
                .build();


        User interviewerUser = interviewer.getUser();
        InterviewerResponseDTO interviewerDTO  = InterviewerResponseDTO.builder()
                .interviewerId(interviewerUser.getUserId())
                .interviewerEmail(interviewerUser.getEmail())
                .interviewerName(interviewerUser.getFullName())
                .interviewerAvatar(interviewerUser.getAvatar())
                .build();

        // Khởi tạo Builder
        BookingResponse.BookingResponseBuilder responseBuilder = BookingResponse.builder()
                .bookingId(newBooking.getBookingId())
                .bookerResponseDTO(bookerDTO)
                .interviewerResponseDTO(interviewerDTO)
                .startTime(newBooking.getStartTime())
                .endTime(newBooking.getEndTime())
                .cvUrl(newBooking.getCvUrl())
                .bookingStatus(newBooking.getStatus());

        // Nếu status là ACCEPTED thì mới trả về link (tùy logic nghiệp vụ của bạn)
        if (newBooking.getStatus() == BookingStatus.ACCEPTED) {
            // Nếu người đang gọi API là Booker -> Trả về joinUrl và password
            if (currentUserId.equals(booker.getIntervieweeId())) {
                responseBuilder.meetingUrl(newBooking.getJoinUrl());
                responseBuilder.meetingPassword(newBooking.getMeetingPassword());
            }

            // Nếu người đang gọi API là Interviewer -> KHÔNG trả URL, chỉ trả Password nếu cần
            else if (currentUserId.equals(interviewer.getInterviewerId())) {
                responseBuilder.meetingUrl(null);
                responseBuilder.meetingPassword(newBooking.getMeetingPassword());
            }
        }

        return responseBuilder.build();
    }



}
