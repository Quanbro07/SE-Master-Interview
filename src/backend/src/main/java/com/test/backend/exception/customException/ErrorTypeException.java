package com.test.backend.exception.customException;

public class ErrorTypeException extends RuntimeException {
    public ErrorTypeException(String message) {
        super(message);
    }
}
