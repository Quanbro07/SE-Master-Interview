package com.test.backend.config;

import com.test.backend.exception.GlobalExceptionHandler;
import com.test.backend.filterChain.JwtFilterChain;
import com.test.backend.filterChain.RateLimitFilterChain;
import com.test.backend.oauth2.customService.CustomOauth2UserService;
import com.test.backend.oauth2.customUser.CustomOidcUserService;
import com.test.backend.oauth2.successHandler.AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOauth2UserService customOauth2UserService;

    private final CustomOidcUserService customOidcUserService;

    private final AuthenticationSuccessHandler authenticationSuccessHandler;

    private final JwtFilterChain jwtFilterChain;

    private final RateLimitFilterChain rateLimitFilterChain;


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
    @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(
                        auth -> auth
                            .requestMatchers(
                                    "/api/v1/auth/register",
                                    "/api/v1/auth/login",
                                    "/api/v1/stripe/webhook",
                                    "/api/v1/zoom/webhook",
                                    //"/stripe_test.html",
                                    "/error",
                                    "/actuator/**",
                                    "/api/v1/agent/dummy",
                                    "/api/v1/agent/prompt"

                                    ).permitAll()
                                .anyRequest().authenticated()
                        )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> {
                            // Đẩy exception về cho @ControllerAdvice xử lý
                            exceptionResolver.resolveException(request, response, null, authException);
                        })
                )
                .oauth2Login(oauth -> oauth
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOauth2UserService)
                                .oidcUserService(customOidcUserService)
                        )

                        .successHandler(authenticationSuccessHandler)
                )

                // Rate Limit trước
                .addFilterBefore(rateLimitFilterChain, UsernamePasswordAuthenticationFilter.class)

                // Token sau
                .addFilterBefore(jwtFilterChain, UsernamePasswordAuthenticationFilter.class)
        ;

        return http.build();
    }
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
