package com.test.backend.exception.customException;

public class AgentException extends RuntimeException {
    public AgentException(String message) {
        super(message);
    }

    public AgentException(String message, Throwable cause) {
        super(message, cause);
    }
}
