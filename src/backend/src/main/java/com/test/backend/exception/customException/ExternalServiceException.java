package com.test.backend.exception.customException;

public class ExternalServiceException extends RuntimeException {
    private final int statusCode;
    private final String responseBody;

    public ExternalServiceException(int statusCode, String responseBody) {
        super("Error call external service - Status: " + statusCode);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getResponseBody() {
        return responseBody;
    }
}
