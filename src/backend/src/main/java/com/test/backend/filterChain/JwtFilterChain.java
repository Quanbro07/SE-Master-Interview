package com.test.backend.filterChain;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.test.backend.entity.user.CustomUserDetail;
import com.test.backend.exception.ErrorResponse;
import com.test.backend.exception.customException.BlacklistTokenException;
import com.test.backend.exception.customException.InvalidTokenException;
import com.test.backend.service.authentication.BlackListTokenService;
import com.test.backend.service.jwt.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class JwtFilterChain extends OncePerRequestFilter {

    private final UserDetailsService userDetailsService;

    private final JwtService jwtService;

    private final BlackListTokenService blacklistTokenService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException
    {
        final String authHeader = request.getHeader("Authorization");

        final String jwtToken;
        final String userEmail;

        if(authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);

            return;
        }

        jwtToken = authHeader.substring(7);

        if(blacklistTokenService.isTokenBlacklisted(jwtToken)) {
            handleExceptionResponse(response, "Token expired - Login again", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        try {

            String tokenType = jwtService.extractClaims(jwtToken, claims -> claims.get("type", String.class));

            if("PRE_AUTH".equals(tokenType)) {

                filterChain.doFilter(request, response);
                return;
            }

            userEmail = jwtService.extractUsername(jwtToken);

            if(userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                CustomUserDetail userDetail = (CustomUserDetail) userDetailsService.loadUserByUsername(userEmail);

                if (jwtService.isTokenValid(userDetail, jwtToken)) {


                    UsernamePasswordAuthenticationToken authenToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetail,
                                    null,
                                    userDetail.getAuthorities()
                            );

                    authenToken.setDetails(
                            new WebAuthenticationDetailsSource()
                                    .buildDetails(request)
                    );

                    SecurityContextHolder.getContext().setAuthentication(authenToken);
                }
            }

        } catch (ExpiredJwtException e) {
            // HỨNG LỖI TOKEN HẾT HẠN Ở ĐÂY
            handleExceptionResponse(response, "Token Expired", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        } catch (SignatureException | MalformedJwtException | UnsupportedJwtException | IllegalArgumentException e) {
            log.error("JWT validation failed: {}", e.getMessage(), e);
            // Hứng các lỗi JWT khác như sai chữ ký, token bị can thiệp...
            handleExceptionResponse(response, "Token không hợp lệ!", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void handleExceptionResponse(HttpServletResponse response, String message, int statusCode) throws IOException {
        response.setStatus(statusCode);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        // Tạo body JSON (bạn có thể thay bằng ErrorResponse DTO của bạn)
        ErrorResponse errorDetails = new ErrorResponse(
                LocalDateTime.now().toString(),
                statusCode,
                HttpStatus.valueOf(statusCode).getReasonPhrase(),
                message
        );

        // Dùng ObjectMapper để convert Map sang chuỗi JSON và ghi vào response
        ObjectMapper mapper = new ObjectMapper();
        response.getWriter().write(mapper.writeValueAsString(errorDetails));

        // Lưu ý: Không gọi filterChain.doFilter() ở đây để chặn đứng request lại
    }
}
