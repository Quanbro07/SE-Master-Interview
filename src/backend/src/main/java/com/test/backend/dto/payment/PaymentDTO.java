package com.test.backend.dto.payment;

import com.test.backend.entity.payment.PaymentCurrency;
import com.test.backend.entity.payment.PaymentStatus;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record PaymentDTO(
        Long bookingId,
        String stripeChargeId,
        BigDecimal amount,
        PaymentCurrency currency,
        PaymentStatus status,
        String receiptUrl,
        String failureMessage
) {
}
