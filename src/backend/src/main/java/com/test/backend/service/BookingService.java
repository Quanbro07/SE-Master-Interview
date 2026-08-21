package com.test.backend.service;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.test.backend.config.CVBucketConfig;
import com.test.backend.dto.booking.BookingRequest;
import com.test.backend.dto.booking.BookingStatusResponse;
import com.test.backend.dto.booking.ConfirmBookingRequest;
import com.test.backend.dto.booking.bookingResponse.BookerResponseDTO;
import com.test.backend.dto.booking.bookingResponse.BookingResponse;
import com.test.backend.dto.booking.FilterInterviewerPositionResponse;
import com.test.backend.dto.booking.bookingResponse.InterviewerResponseDTO;
import com.test.backend.dto.interview.InterviewResultRequest;
import com.test.backend.dto.interview.InterviewerReviewResponse;
import com.test.backend.dto.interview.ReviewInterviewerRequest;
import com.test.backend.dto.schedule.AddBlockedScheduleRequest;
import com.test.backend.dto.schedule.DailyFreeScheduleDTO;
import com.test.backend.dto.schedule.WeeklyFreeScheduleResponse;
import com.test.backend.entity.blockedSchedule.BlockedSchedulePurpose;
import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.booking.BookingStatus;
import com.test.backend.entity.bookingReview.BookingReview;
import com.test.backend.entity.interviewResult.InterviewResult;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewee.Interviewee;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.ForbiddenOperationException;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.exception.customException.ScheduleConflictException;
import com.test.backend.exception.customException.StripeIntegrationException;
import com.test.backend.repository.*;
import com.test.backend.zoom.ZoomAsyncService;
import com.test.backend.zoom.ZoomService;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
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

    private final BookingReviewRepository bookingReviewRepository;

    private final FileService fileService;

    private final CVBucketConfig cvBucket;

    public Page<FilterInterviewerPositionResponse> filterInterviewerByPosition(
            String position,
            LocalDate date,
            int page, int size) {
        if(date.isBefore(LocalDate.now())) {
            throw new ForbiddenOperationException("You cannot book in the past");
        }

        Pageable pageable = PageRequest.of(page, size);

        Page<InterviewerExpertise> expertisePage = interviewerExpertiseRepository
                .findAllByPositionWithBalancedSort(position, pageable);

        List<Long> interviewerIds = expertisePage.getContent().stream()
                .map(ie -> ie.getInterviewer().getInterviewerId())
                .toList();

        Map<Long, List<DailyFreeScheduleDTO>> schedulesMap = scheduleService
                .getAvailableScheduleForInterviewers(interviewerIds, date);

        Page<FilterInterviewerPositionResponse> response =
                expertisePage.map(ie -> {
                    Long id = ie.getInterviewer().getInterviewerId();
                    List<DailyFreeScheduleDTO> schedules = schedulesMap.getOrDefault(id, Collections.emptyList());

                    return coverToFilterInterviewerPositionResponse(ie, schedules);
                });

        return response;
    }

    @Transactional
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

        InterviewerExpertise interviewerExpertise = interviewerExpertiseRepository
                .findByInterviewerIdAndPositionNameFetchUserAndPosition(request.interviewerId(), request.positionName())
                .orElseThrow(() -> new NotFoundException("Expertise not found"));

        Interviewer interviewer = interviewerExpertise.getInterviewer();

        Interviewee interviewee = intervieweeRepository.findByIntervieweeIdFetchUser(intervieweeId)
                .orElseThrow(() -> new NotFoundException("Interviewee not found"));

        // Build Wrapper để add blocked Schedule cho Interviewer
        AddBlockedScheduleRequest blockedScheduleRequest = AddBlockedScheduleRequest.builder()
                .startTime(startTime)
                .endTime(endTime)
                .purpose(BlockedSchedulePurpose.INTERVIEW_BOOKED)
                .note(request.note())
                .build();

        scheduleService.addBlockedSchedule(interviewer.getInterviewerId(), blockedScheduleRequest);

        // Tính toán total amount
        long minutes = Duration.between(request.startDate(), request.endDate()).toMinutes();

        // Quy đổi ra giờ (có lưu thập phân, làm tròn 2 chữ số)
        // Ví dụ: 90 phút -> 1.50 giờ
        BigDecimal hours = BigDecimal.valueOf(minutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);

        // 3. Nhân với hourly fee
        BigDecimal totalAmount = interviewerExpertise.getHourlyFee().multiply(hours);

        Booking newBooking = Booking.builder()
                .interviewer(interviewer)
                .booker(interviewee)
                .startTime(startTime)
                .endTime(endTime)
                .totalAmount(totalAmount)
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

        if(!BookingStatus.PENDING.equals(booking.getStatus())) {
            throw new ForbiddenOperationException("Confirm can only use fore Pending Booking");
        }

        // Set Trạng thái Accepted
        booking.setStatus(BookingStatus.ACCEPTED);
        bookingRepository.save(booking);

        Long duration = Duration.between(booking.getStartTime(), booking.getEndTime()).toMinutes();

        // Async tạo link meeting
        zoomAsyncService.generateMeetLink(booking, request, duration);

        return BookingStatusResponse.builder()
                .bookingId(bookingId)
                .bookingStatus(booking.getStatus())
                .build();
    }

    // Reject Booking
    public BookingStatusResponse rejectBooking(Long userId, Long bookingId) {
        Booking booking = bookingRepository.findByBookingIdAndInterviewer_InterviewerId(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        if(!BookingStatus.PENDING.equals(booking.getStatus())) {
            throw new ForbiddenOperationException("Reject can only use fore Pending Booking");
        }

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

        LocalDateTime startTime = booking.getStartTime();

        Duration duration = Duration.between(LocalDateTime.now(), startTime);

        if(duration.toMinutes() > 60) {
            throw new ForbiddenOperationException("You can only get start URL within one hour after the start time");
        }

        String freshStartUrl = zoomService.getFreshStartUrl(booking.getMeetingId());

        // Set và lưu xuống db để có gì ko gọi lại
        booking.setStartUrl(freshStartUrl);
        bookingRepository.save(booking);

        return freshStartUrl;


    }

    // Hoàn tất buổi interview
    public void completeInterview(Long interviewerId, InterviewResultRequest request) {
        Booking booking = bookingRepository
                .findByBookingIdAndInterviewer_InterviewerId(request.bookingId(), interviewerId)
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        if(!BookingStatus.AWAIT_REVIEW.equals(booking.getStatus())) {
            throw new ForbiddenOperationException("Meeting still int Progress. Cannot complete before ending Zoom Meeting");
        }

        InterviewResult interviewResult = InterviewResult.builder()
                .technicalScore(request.technicalScore())
                .communicationScore(request.communicationScore())
                .preparationLevel(request.preparationLevel())
                .overallComment(request.overallComment())
                .build();

        booking.setInterviewResult(interviewResult);
        bookingRepository.save(booking);

        // Capture Payment
        try {
            PaymentIntent intent = PaymentIntent.retrieve(booking.getPaymentIntentId());

            intent.capture();
        } catch (StripeException e) {
            log.info("Error Capture Payment!", e);
            throw new StripeIntegrationException("Error withdraw money" + e.getMessage());
        }

    }

    public void reviewBooking(Long bookerId, ReviewInterviewerRequest request) {
        Booking booking = bookingRepository.findByBookingIdFetchInterviewerAndBooker(request.bookingId())
                .orElseThrow(() -> new NotFoundException("Booking not FOUND"));

        BookingStatus status = booking.getStatus();

        if(status != BookingStatus.AWAIT_REVIEW && status != BookingStatus.COMPLETED) {
            throw new ForbiddenOperationException("YOu cannot review before the meeting is done");
        }

        if (booking.getBookingReview() != null) {
            throw new ForbiddenOperationException("You have already reviewed this booking!");
        }

        if(!bookerId.equals(booking.getBooker().getIntervieweeId())) {
            throw new ForbiddenOperationException("You cannot review this booking");
        }

        BookingReview review = BookingReview.builder()
                .rating(request.rate())
                .comment(request.comment())
                .build();

        Interviewer interviewer = booking.getInterviewer();

        Double oldRating = interviewer.getOverallRating();
        Integer totalRating = interviewer.getTotalReviews();

        Double newRating = (oldRating * totalRating + request.rate()) / (totalRating + 1);

        interviewer.setOverallRating(newRating);
        interviewer.setTotalReviews(totalRating + 1);

        interviewerRepository.save(interviewer);

        booking.setBookingReview(review);
        review.setBooking(booking);

        bookingRepository.save(booking);
    }

    public Page<InterviewerReviewResponse> getInterviewerReview(Long interviewerId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<BookingReview> bookingReviews = bookingReviewRepository
                .findByInterviewerIdFetchBooker(interviewerId, pageable);

        return bookingReviews.map(this::convertToReviewResponse);
    }

    public String uploadCvBooking(Long bookingId, Long intervieweeId, MultipartFile file) {
        Booking booking = bookingRepository.findByBookingIdFetchBooker(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking is not found"));


        if(!intervieweeId.equals(booking.getBooker().getIntervieweeId())) {
            throw new ForbiddenOperationException("You cannot upload CV on someone else Booking");
        }

        String contentType = file.getContentType();
        String originalFileName = file.getOriginalFilename();

        String target = "bookingCV_" + bookingId;

        byte[] fileData = null;

        try {
            fileData = file.getBytes();
        } catch (IOException e) {
            log.warn(e.getMessage());
        }

        String cvUrl = null;

        try {
            cvUrl = fileService.uploadFile(cvBucket.getCVBucketName(), fileData, contentType, originalFileName, target);

        } catch (MinioException | IOException e) {
            log.warn(e.getMessage());
        }
        return cvUrl;
    }

    // Helper Function
    public void updateBookingStatusByZoomId(String zoomId, BookingStatus status) {
        Booking booking = bookingRepository.findByMeetingId(zoomId)
                .orElseThrow(()->new NotFoundException("Booking not FOUND"));

        booking.setStatus(status);

        bookingRepository.save(booking);
    }

    private FilterInterviewerPositionResponse coverToFilterInterviewerPositionResponse(
            InterviewerExpertise expertise,
            List<DailyFreeScheduleDTO> schedules) {
        Interviewer interviewer = expertise.getInterviewer();
        User user = interviewer.getUser();

        return FilterInterviewerPositionResponse.builder()
                .interviewerId(interviewer.getInterviewerId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .overallRating(interviewer.getOverallRating())
                .availableSchedules(WeeklyFreeScheduleResponse.builder().dailySchedules(schedules).build())
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
                .totalAmount(newBooking.getTotalAmount())
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

    private InterviewerReviewResponse convertToReviewResponse(BookingReview review) {

        User bookerUser = review.getBooking().getBooker().getUser();

        return InterviewerReviewResponse.builder()
                .reviewId(review.getReviewId())
                .reviewerName(bookerUser.getFullName()) // Hoặc getUserName() tùy logic của bạn
                .reviewerAvatar(bookerUser.getAvatar()) // Tùy chọn
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }


}
