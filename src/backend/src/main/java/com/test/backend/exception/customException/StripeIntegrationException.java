package com.test.backend.exception.customException;

public class StripeIntegrationException extends RuntimeException {
    public StripeIntegrationException(String message) {
        super(message);
    }

    public StripeIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
