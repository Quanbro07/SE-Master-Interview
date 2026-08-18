package com.test.backend.stripe;

import com.test.backend.dto.stripe.PaymentIntentResponse;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.stripe.dto.PaymentEventDTO;
import com.test.backend.stripe.dto.StripeLinkAccountResponse;
import lombok.RequiredArgsConstructor;
import okhttp3.Response;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/stripe")
public class StripeController {

    private final StripeService stripeService;

    private final PaymentEventService paymentEventService;

    @PreAuthorize("hasRole('Interviewer')")
    @PostMapping("/create-account-link")
    public ResponseEntity<StripeLinkAccountResponse> createAccountLink(
            @AuthenticationPrincipal CustomUserDetail customUserDetail) {

        Long userId = customUserDetail.getUser().getUserId();

        StripeLinkAccountResponse response = stripeService.createAccountLink(userId);

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('Interviewee')")
    @PostMapping("/{bookingId}/create-intent")
    public ResponseEntity<PaymentIntentResponse> createIntent(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetail customUserDetail) {
        Long userId = customUserDetail.getUser().getUserId();

        PaymentIntentResponse response = stripeService.createIntent(userId, bookingId);

        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/{bookingId}/payment-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<PaymentEventDTO> streamPaymentStatus(@PathVariable Long bookingId) {
        return paymentEventService.subscribe(bookingId);
    }
}
