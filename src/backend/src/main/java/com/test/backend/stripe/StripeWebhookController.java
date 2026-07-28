package com.test.backend.stripe;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Account;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.net.Webhook;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.repository.InterviewerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RequiredArgsConstructor
@Slf4j
@RestController
@RequestMapping("api/v1/stripe/webhook")
public class StripeWebhookController {

    @Value("${stripe.webhook_secret}")
    private String stripeWebhookSecret;

    private final InterviewerRepository interviewerRepository;

    @PostMapping
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        Event event;

        try {

            // Bước 1: Xác thực chữ ký. Đây là bắt buộc để chống fake request.
            event = Webhook.constructEvent(payload, sigHeader, stripeWebhookSecret);

        } catch (SignatureVerificationException e) {
            // Chữ ký không hợp lệ
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        } catch (RuntimeException e) {

            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid payload");
        }

        // Bóc tách object từ event một cách an toàn
        EventDataObjectDeserializer dataObjectDeserializer = event.getDataObjectDeserializer();
        if (!dataObjectDeserializer.getObject().isPresent()) {
            return ResponseEntity.badRequest().body("Desialization failed");
        }

        switch (event.getType()) {
            case "account.updated":
                Account account = (Account) dataObjectDeserializer.getObject().get();
                handleAccountUpdated(account);
                break;

        }

        // LUÔN LUÔN trả về 200 OK cho Stripe biết đã nhận được
        return ResponseEntity.ok("Success");
    }

    // Helper function
    private void handleAccountUpdated(Account account) {
        System.out.println("Update Account: " + account.getId());

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

            System.out.println("Updated Connected Stripe State For Interviewer ID: " + interviewer.getInterviewerId());
        }
        else {
            System.err.println("Error: Cannot Find User with Stripe Account ID: " + account.getId());
        }
    }

}
