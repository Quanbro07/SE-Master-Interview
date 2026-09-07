package com.test.backend.service.jwt;

import com.test.backend.entity.user.CustomUserDetail;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoder;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.security.Key;
import java.security.PublicKey;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {
    @Value("${jwt.secret_key}")
    private String JWT_SECRET_KEY;

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public <T> T extractClaims(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);

        return claimsResolver.apply(claims);
    }

    public String extractUsername(String token) {
        return extractClaims(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaims(token, Claims::getExpiration);
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public boolean isTokenValid(CustomUserDetail userDetail, String token) {
        final String username = extractUsername(token);

        return username.equals(userDetail.getUsername()) && !isTokenExpired(token);
    }

    public String generateToken(
            Map<String, Object> extraClaims,
            String subject, // email
            TokenType tokenType) {

        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .signWith(getSignKey())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + tokenType.getExpiration()))
                .compact();

    }

    public long getRemainTimeInMillis(String token) {
        try {
            Date expirationDate = extractExpiration(token);

            Date now = new Date();

            long remainingTime = expirationDate.getTime() - now.getTime();

            return Math.max(remainingTime, 0);

        }
        catch (Exception e) {
            return 0;
        }
    }

    private SecretKey getSignKey() {
        byte[] keyBytes = Decoders.BASE64.decode(JWT_SECRET_KEY);
        return Keys.hmacShaKeyFor(keyBytes);
    }

}
