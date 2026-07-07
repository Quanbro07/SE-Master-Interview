package com.test.backend.service.jwt;

public enum TokenType {
    TEMP(1000 * 60 * 5),          // 2m
    ACCESS(1000 * 60 * 30),        // 30m
    REFRESH(1000 * 60 * 60 * 24); // 24h

    private final long expiration;

    TokenType(long expiration) {
        this.expiration = expiration;
    }

    public long getExpiration() {
        return expiration;
    }
}
