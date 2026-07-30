package com.test.backend.exception.customException;

public class BlacklistTokenException extends RuntimeException {
    public BlacklistTokenException(String message) {
        super(message);
    }
}
