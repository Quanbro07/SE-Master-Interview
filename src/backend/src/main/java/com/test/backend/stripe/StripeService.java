package com.test.backend.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.AccountLink;
import com.stripe.model.PaymentIntent;
import com.stripe.param.AccountCreateParams;
import com.stripe.param.AccountLinkCreateParams;
import com.stripe.param.PaymentIntentCreateParams;
import com.test.backend.dto.payment.PaymentDTO;
import com.test.backend.dto.stripe.PaymentIntentResponse;
import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.booking.BookingStatus;
import com.test.backend.entity.payment.PaymentCurrency;
import com.test.backend.entity.payment.PaymentStatus;
import com.test.backend.entity.user.interviewee.Interviewee;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.ForbiddenOperationException;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.exception.customException.StripeIntegrationException;
import com.test.backend.repository.BookingRepository;
import com.test.backend.repository.InterviewerRepository;
import com.test.backend.service.PaymentAsyncService;
import com.test.backend.stripe.dto.StripeLinkAccountResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Slf4j
@RequiredArgsConstructor
@Service
public class StripeService {

    @Value("${fe.url}")
    private String feUrl;

    private final InterviewerRepository interviewerRepository;

    private final BookingRepository bookingRepository;

    private final PaymentAsyncService paymentAsyncService;

    // Liên kết tài khoản
    public StripeLinkAccountResponse createAccountLink(Long userId) {
        Optional<Interviewer> interviewerCheck = interviewerRepository.findByInterviewerId(userId);

        if(interviewerCheck.isEmpty()) {
            throw new ForbiddenOperationException("Only interviewers can perform this action");
        }

        Interviewer interviewer = interviewerCheck.get();

        try {
            String accountId = interviewer.getStripeAccountId();

            if(accountId == null || accountId.isEmpty()) {
                // 1. Tạo 1 Connected Account(Express/Standard)
                AccountCreateParams accountParams = AccountCreateParams.builder()
                        .setType(AccountCreateParams.Type.EXPRESS)
                        .setEmail(interviewer.getUser().getEmail())
                        .setCapabilities(
                                AccountCreateParams.Capabilities.builder()
                                        // Set quyền Merchant(nhận thanh toán)
                                        .setCardPayments(
                                                AccountCreateParams.Capabilities.CardPayments
                                                        .builder()
                                                        .setRequested(true)
                                                        .build()
                                        )
                                        // Set quyền giải ngân từ platform
                                        .setTransfers(
                                                AccountCreateParams.Capabilities.Transfers
                                                        .builder()
                                                        .setRequested(true)
                                                        .build()
                                        )
                                        .build()
                        )
                        .build();

                Account account = Account.create(accountParams);
                // 1.2 Lưu account_id vào Interviewer
                interviewer.setStripeAccountId(account.getId());
                interviewerRepository.save(interviewer);

                accountId = account.getId();
            }

            String refreshUrl = feUrl + "/refresh";
            String returnUrl = feUrl + "/success";

            // 2. Tạo Account Link để lấy URL Onboarding của Stripe
            AccountLinkCreateParams accountLinkParams = AccountLinkCreateParams.builder()
                    .setAccount(accountId)
                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                    .setRefreshUrl(refreshUrl)
                    .setReturnUrl(returnUrl)
                    .build();

            AccountLink accountLink = AccountLink.create(accountLinkParams);

            // 3. Return Response
            StripeLinkAccountResponse response = StripeLinkAccountResponse.builder()
                    .url(accountLink.getUrl())
                    .build();

            return response;

        } catch (StripeException e) {
            log.error("Stripe error", e);
            throw new StripeIntegrationException("Unable to process Stripe request.");
        }
    }


    // Tạo intent
    public PaymentIntentResponse createIntent(Long userId, Long bookingId) {
        Booking booking = bookingRepository.findByBookingIdFetchInterviewerAndBooker(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking Not Found"));

        if (BookingStatus.REJECTED.equals(booking.getStatus()) || BookingStatus.CANCELLED.equals(booking.getStatus())) {
            throw new ForbiddenOperationException("Cannot create Intent for cancelled or rejected booking");
        }

        Interviewer interviewer = booking.getInterviewer();

        if(userId != null && !userId.equals(booking.getBooker().getIntervieweeId())) {
            throw new ForbiddenOperationException("You cannot pay for another user's booking");
        }

        if(interviewer.getStripeAccountId() == null || interviewer.getStripeAccountId().isEmpty()) {
            throw new NotFoundException("Stripe Account Not Found");
        }

        // Stripe Amount
        BigDecimal totalAmount = booking.getTotalAmount();

        Long stripeAmount = totalAmount.multiply(BigDecimal.valueOf(100)).longValue();

        // Check coi payment co ko
        if(booking.getPaymentIntentId() != null && !booking.getPaymentIntentId().isEmpty()) {

            String existPaymentId = booking.getPaymentIntentId();

            try {
                // Lấy lại payment cũ
                PaymentIntent existPayment = PaymentIntent.retrieve(existPaymentId);

                if ("requires_payment_method".equals(existPayment.getStatus()) &&
                        existPayment.getAmount().equals(stripeAmount)) {

                    log.info("Reusing Old PaymentIntent : {}", existPaymentId);

                    // Trả về thẳng clientSecret cũ, KHÔNG tạo mới Intent, KHÔNG insert DB
                    return PaymentIntentResponse.builder()
                            .clientSecret(existPayment.getClientSecret())
                            .build();
                }
            } catch (StripeException e) {
                throw new RuntimeException(e);
            }
        }

            // Khai báo % hoa hồng (20%)
        BigDecimal feePercentage = new BigDecimal("0.20");

        // Tính Application Fee (Dùng RoundingMode.HALF_UP để làm tròn chuẩn toán học)
        Long applicationFee = BigDecimal.valueOf(stripeAmount)
                .multiply(feePercentage)
                .setScale(0, RoundingMode.HALF_UP) // Làm tròn thành số nguyên không có thập phân
                .longValue();

        // Số tiền thực tế Interviewer nhận được
        Long interviewerPayout = stripeAmount - applicationFee;

        String accountId = interviewer.getStripeAccountId();

        // Tạo PaymentIntent
        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(stripeAmount)
                .setCurrency("USD") // để tiền dollar
                // Set chế độ transfer
                .setCaptureMethod(PaymentIntentCreateParams.CaptureMethod.MANUAL)
                .setTransferData(
                    PaymentIntentCreateParams.TransferData.builder()
                            .setDestination(accountId)
                            .build()
                )

                // Set hoa hồng
                .setApplicationFeeAmount(applicationFee)
                .build();

        try {
            // Build PaymentIntent
            PaymentIntent intent = PaymentIntent.create(params);

            // Lưu payment intent id vào booking
            booking.setPaymentIntentId(intent.getId());
            bookingRepository.save(booking);

            // Tạo DTO map tạo payment
            PaymentDTO paymentDTO = PaymentDTO.builder()
                    .bookingId(bookingId)
                    .amount(totalAmount)
                    .currency(PaymentCurrency.USD)
                    .status(PaymentStatus.PENDING)
                    .build();

            paymentAsyncService.createNewPayment(paymentDTO);

            return PaymentIntentResponse.builder()
                    .clientSecret(intent.getClientSecret())
                    .build();
        }
        catch (StripeException e) {
            log.error("Stripe error", e);
            throw new StripeIntegrationException("Unable to process Stripe request.");
        }
    }
}
