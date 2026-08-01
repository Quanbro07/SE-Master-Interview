package com.test.backend.stripe;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Account;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@Slf4j
@RestController
@RequestMapping("api/v1/stripe/webhook")
public class StripeWebhookController {

    @Value("${stripe.webhook_secret}")
    private String stripeWebhookSecret;

    private final StripeEventService stripeEventService;


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
                log.info("ACCOUNT UPDATE STRIPE WEBHOOK CALLED!");
                Account account = (Account) dataObjectDeserializer.getObject().get();
                stripeEventService.handleAccountUpdated(account);
                break;

            case "payment_intent.amount_capturable_updated":
                log.info("PAYMENT INTENT AUTHORIZED (FUNDS HELD) STRIPE WEBHOOK CALLED!");
                PaymentIntent intentAuthorized = (PaymentIntent) dataObjectDeserializer.getObject().get();
                // Gọi service cập nhật trạng thái Booking thành "Đã giữ tiền"
                stripeEventService.handlePaymentAuthorized(intentAuthorized);
                break;

            case "payment_intent.succeeded":
                log.info("PAYMENT INTENT SUCCESS STRIPE WEBHOOK CALLED!");
                PaymentIntent intentSuccess = (PaymentIntent) dataObjectDeserializer.getObject().get();
                stripeEventService.handlePaymentIntentSuccess(intentSuccess);
                break;

            case "payment_intent.payment_failed":
                log.info("PAYMENT INTENT FAILED STRIPE WEBHOOK CALLED!");
                PaymentIntent intentFailed = (PaymentIntent) dataObjectDeserializer.getObject().get();
                stripeEventService.handlePaymentFailed(intentFailed);
                break;

            default:
                log.info("Unknown event received: " + event.getType());
        }

        // LUÔN LUÔN trả về 200 OK cho Stripe biết đã nhận được
        return ResponseEntity.ok("Success");
    }
}
