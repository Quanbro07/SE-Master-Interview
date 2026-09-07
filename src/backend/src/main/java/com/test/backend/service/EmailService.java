package com.test.backend.service;
import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewee.Interviewee;
import com.test.backend.entity.user.interviewer.Interviewer;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@RequiredArgsConstructor
@Service
public class EmailService {
    private final JavaMailSender mailSender;

    public void sendEmail(String to, String subject, String body) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(body, true);

        mailSender.send(message);
    }

    public void sendEmailsForSuccessfulPayment(Booking booking) {
        Interviewee booker = booking.getBooker();
        Interviewer interviewer = booking.getInterviewer();

        User bookerUser = booker.getUser();
        User interviewerUser = interviewer.getUser();

        String bookerEmail = booker.getUser().getEmail();
        String interviewerEmail = interviewer.getUser().getEmail();

        // Sinh HTML riêng cho từng người
        String bookerHtml = buildBookerHtmlBody(booking, bookerUser, interviewerUser);
        String interviewerHtml = buildInterviewerHtmlBody(booking, bookerUser, interviewerUser);

        // Gửi email cho Booker
        try {
            sendEmail(bookerEmail, "Xác nhận thanh toán thành công - Lịch phỏng vấn của bạn", bookerHtml);

            // Gửi email cho Interviewer
            sendEmail(interviewerEmail, "Lịch phỏng vấn mới đã được xác nhận thanh toán", interviewerHtml);
        }
        catch (MessagingException e) {
            log.error("Error while sending email for booking {}: {}", booking.getBookingId(), e.getMessage());
        }
    }

    private String buildBookerHtmlBody(Booking booking, User bookerUser, User interviewerUser) {


        // Bạn có thể dùng Thymeleaf, FreeMarker ở đây. Nếu dùng String thường thì có thể làm như sau:
        return "<h2>Thanh toán thành công!</h2>" +
                "<p>Chào " +bookerUser.getFullName() + ",</p>" +
                "<p>Lịch phỏng vấn của bạn với <strong>" + interviewerUser.getFullName() + "</strong> đã được thanh toán thành công.</p>" +
                "<p>Thời gian: " + booking.getStartTime() + "</p>" +
                "<p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>";
    }

    /**
     * Helper method: Tạo HTML cho Interviewer
     */
    private String buildInterviewerHtmlBody(Booking booking, User bookerUser, User interviewerUser) {
        return "<h2>Lịch phỏng vấn mới đã được xác nhận!</h2>" +
                "<p>Chào " + interviewerUser.getFullName() + ",</p>" +
                "<p>Ứng viên <strong>" + bookerUser.getFullName() + "</strong> đã thanh toán thành công cho lịch phỏng vấn sắp tới.</p>" +
                "<p>Thời gian: " + booking.getStartTime() + "</p>" +
                "<p>Vui lòng chuẩn bị cho buổi phỏng vấn. Chúc bạn một ngày làm việc hiệu quả!</p>";
    }

}
