package com.test.backend.filterChain;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.test.backend.exception.ErrorResponse;
import com.test.backend.service.RateLimitService;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;

@RequiredArgsConstructor
@Configuration
public class RateLimitFilterChain extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String clientIp = getClientIp(request);

        Bucket tokenBucket = rateLimitService.resolveBucket(clientIp);

        var probe = tokenBucket.tryConsumeAndReturnRemaining(1);

        if(probe.isConsumed()) {
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
            return;
        }
        else {
            var waitToRefill = probe.getNanosToWaitForRefill() / 1_000_000_000;

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.addHeader("X-Rate-Limit-Retry-After-Seconds", String.valueOf(waitToRefill));
            response.setContentType("application/json;charset=UTF-8");

            ErrorResponse errorResponse = new ErrorResponse(
                    LocalDateTime.now().toString(),
                    HttpStatus.TOO_MANY_REQUESTS.value(),
                    HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                    "You have exhausted you API Request Quota! Please wait for " + waitToRefill + " second"
            );

            // Dùng ObjectMapper để biến Java Object thành chuỗi JSON
            String jsonOutput = objectMapper.writeValueAsString(errorResponse);

            // Ghi chuỗi JSON đó vào response
            response.getWriter().write(jsonOutput);
        }
    }

    private String getClientIp(HttpServletRequest request) {

        String xfHeader = request.getHeader("x-Forwarded-For");

        if(xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }

        return xfHeader.split(",")[0].trim();
    }
}
