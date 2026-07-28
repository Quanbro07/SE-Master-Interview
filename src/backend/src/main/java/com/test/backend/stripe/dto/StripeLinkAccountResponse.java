package com.test.backend.stripe.dto;

import lombok.Builder;

@Builder
public record StripeLinkAccountResponse(
        String url
) {}
