package com.test.backend.stripe.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PaymentEventDTO(
    @JsonProperty("booking_id")
    Long bookingId,
    String status,
    @JsonProperty("receipt_url")
    String receiptUrl
){}
