package com.test.backend.exception;

public record ErrorResponse(
        String timestamp,
        int status,
        String error,
        String message
) {
}
