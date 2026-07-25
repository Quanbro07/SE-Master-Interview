package com.test.backend.stripe;

import com.test.backend.stripe.dto.StripeLinkAccountResponse;
import lombok.RequiredArgsConstructor;
import okhttp3.Response;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/stripe")
public class StripeController {

    private final StripeService stripeService;

    @PreAuthorize("hasRole('Interviewer')")
    @PostMapping("/{userId}/create-account-link")
    public ResponseEntity<StripeLinkAccountResponse> createAccountLink(@PathVariable Long userId) {

        StripeLinkAccountResponse response = stripeService.createAccountLink(userId);

        return ResponseEntity.ok(response);
    }
}
