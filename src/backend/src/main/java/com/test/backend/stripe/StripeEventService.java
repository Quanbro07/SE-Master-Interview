package com.test.backend.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.Charge;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;
import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.booking.BookingStatus;
import com.test.backend.entity.payment.Payment;
import com.test.backend.entity.payment.PaymentCurrency;
import com.test.backend.entity.payment.PaymentStatus;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.BookingRepository;
import com.test.backend.repository.InterviewerRepository;
import com.test.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Slf4j
@RequiredArgsConstructor
@Service
public class StripeEventService {

    private final InterviewerRepository interviewerRepository;

    private final BookingRepository bookingRepository;

    private final PaymentRepository paymentRepository;

    public void handleAccountUpdated(Account account) {
        log.info("Update Account: " + account.getId());

        // Đã điền các thông tin bắt buộc
        Boolean isDetailSubmitted = account.getDetailsSubmitted();

        // Báo cho biết tài khoản đã dc Stripe duyệt để thực hiện giao dịch/nhận tiền chưa.
        Boolean isChargesEnable = account.getChargesEnabled();

        Optional<Interviewer> interviewerOptional = interviewerRepository.findByStripeAccountId(account.getId());

        if(interviewerOptional.isPresent()) {
            Interviewer interviewer = interviewerOptional.get();

            if(Boolean.TRUE.equals(isDetailSubmitted) && Boolean.TRUE.equals(isChargesEnable)) {
                interviewer.setIsStripeConnected(Boolean.TRUE);
            }
            else {
                interviewer.setIsStripeConnected(Boolean.FALSE);
            }

            interviewerRepository.save(interviewer);

            log.info("Updated Connected Stripe State For Interviewer ID: " + interviewer.getInterviewerId());
        }
        else {
            log.error("Error: Cannot Find User with Stripe Account ID: " + account.getId());
        }
    }


    public void handlePaymentIntentSuccess(PaymentIntent intentSuccess) {
        String intentId = intentSuccess.getId();
        log.info("Payment succeeded for Intent ID: {}", intentId);

        Booking booking = bookingRepository.findByPaymentIntentIdFetchPayment(intentId)
                .orElseThrow(() -> new NotFoundException("Error: Cannot Find Booking for Intent ID: " + intentId));

        List<Payment> paymentList = booking.getPaymentList();
        for(Payment payment : paymentList) {
            // Nếu đã có trùng lập payment rồi
            if(PaymentStatus.SUCCESS.equals(payment.getStatus())) {
                log.info("Webhook duplicate: Intent {} was already processed. Ignoring.", intentId);
                return;
            }
        }

        // set status cho booking
        booking.setStatus(BookingStatus.PAID);

        // Lấy receiptUrl
        String receiptUrl = null;
        String chargeId = intentSuccess.getLatestCharge();

        if (chargeId != null) {
            try {
                // Gọi lên Stripe để lấy chi tiết Charge
                Charge charge = Charge.retrieve(chargeId);
                receiptUrl = charge.getReceiptUrl();
            } catch (StripeException e) {
                log.error("Failed to retrieve charge for intent: {}", intentId, e);
            }
        }

        // Tạo Payment Success
        Payment payment = Payment.builder()
                .booking(booking)
                .amount(booking.getTotalAmount())
                .stripeChargeId(chargeId)
                .currency(PaymentCurrency.USD)
                .status(PaymentStatus.SUCCESS)
                .receiptUrl(receiptUrl)
                .build();



        // Lưu vào database
        bookingRepository.save(booking);
        paymentRepository.save(payment);
    }

    public void handlePaymentFailed(PaymentIntent intentFailed) {
        String intentId = intentFailed.getId();

        String errorMessage = intentFailed.getLastPaymentError() != null
                ? intentFailed.getLastPaymentError().getMessage() : null;

        log.warn("Payment failed for Intent ID: {}. Reason {}", intentId, errorMessage);

        Booking booking = bookingRepository.findByPaymentIntentId(intentFailed.getId())
                .orElseThrow(() -> new NotFoundException("Error: Cannot Find Booking for Intent ID: " + intentId));

        // Tạo Payment Failed
        Payment newPayment = Payment.builder()
                .booking(booking)
                .amount(booking.getTotalAmount())
                .currency(PaymentCurrency.USD)
                .status(PaymentStatus.FAILED)
                .failureMessage(errorMessage)
                .build();

        // Lưu vào database
        bookingRepository.save(booking);
        paymentRepository.save(newPayment);
    }

    public void handlePaymentRefund(String intentId) {
        // TODO: Sau khi refund, bạn nhớ cập nhật trạng thái bảng Payment và Booking tương ứng
        Booking booking = bookingRepository.findByPaymentIntentId(intentId)
                .orElseThrow(() -> new NotFoundException("Error: Cannot Find Booking for Intent ID: " + intentId));



        //
        BigDecimal refundPercentage = BigDecimal.valueOf(0.5);

        BigDecimal refundInUsd = booking.getTotalAmount().multiply(refundPercentage);

        Long refundAmountInCents = refundInUsd.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();

        RefundCreateParams params = RefundCreateParams.builder()
            .setPaymentIntent(intentId)
            .setAmount(refundAmountInCents)
            .build();
        try {
            Refund refund = Refund.create(params);
            log.info("Refund successful for Intent ID: {}. Refund ID: {}", intentId, refund.getId());

            booking.setStatus(BookingStatus.CANCELLED);

            // Tạo Payment Refund
            Payment newPayment = Payment.builder()
                    .booking(booking)
                    .amount(refundInUsd)
                    .currency(PaymentCurrency.USD)
                    .status(PaymentStatus.REFUNDED)
                    .build();

            // Lưu vào db
            bookingRepository.save(booking);
            paymentRepository.save(newPayment);

        } catch (StripeException e) {
            log.error("Refund failed for Intent ID: {}", intentId, e);
            throw new RuntimeException("Lỗi hoàn tiền: " + e.getMessage());
        }
    }
}
