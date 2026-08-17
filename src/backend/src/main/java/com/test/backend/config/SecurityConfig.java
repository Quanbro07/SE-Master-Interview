package com.test.backend.config;

import com.test.backend.filterChain.JwtFilterChain;
import com.test.backend.oauth2.customService.CustomOauth2UserService;
import com.test.backend.oauth2.customUser.CustomOidcUserService;
import com.test.backend.oauth2.successHandler.AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOauth2UserService customOauth2UserService;

    private final CustomOidcUserService customOidcUserService;

    private final AuthenticationSuccessHandler authenticationSuccessHandler;

    private final JwtFilterChain jwtFilterChain;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(
                        auth -> auth
                            .requestMatchers(
                                    "/api/v1/position/**",
                                    "/api/v1/booking/filter-interviewer",
                                    "/api/v1/auth/register",
                                    "/api/v1/auth/login",
                                    "/api/v1/stripe/webhook",
                                    "/api/v1/zoom/webhook",
                                    "/stripe_test.html",
                                    "/api/v1/auth/refresh-token"
                                    ).permitAll()
                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                .anyRequest().authenticated()
                        )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                )
                .oauth2Login(oauth -> oauth
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOauth2UserService)
                                .oidcUserService(customOidcUserService)
                        )

                        .successHandler(authenticationSuccessHandler)
                )

                .addFilterBefore(jwtFilterChain, UsernamePasswordAuthenticationFilter.class)
        ;

        return http.build();
    }
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    // Cho phép Frontend Next.js / React
    configuration.setAllowedOrigins(List.of("http://localhost:3000"));
    // Cho phép các HTTP method
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // BẮT BUỘC: Cho phép header Authorization
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept"));
    configuration.setExposedHeaders(List.of("Authorization"));
    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
    }
}
