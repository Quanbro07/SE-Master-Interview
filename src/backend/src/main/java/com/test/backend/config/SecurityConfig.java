package com.test.backend.config;

import com.test.backend.oauth2.customService.CustomOauth2UserService;
import com.test.backend.oauth2.customUser.CustomOidcUserService;
import com.test.backend.oauth2.successHandler.AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOauth2UserService customOauth2UserService;

    private final CustomOidcUserService customOidcUserService;

    private final AuthenticationSuccessHandler authenticationSuccessHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(
                        auth -> auth
                            .requestMatchers(
                                    "/api/v1/auth/register",
                                    "/api/v1/auth/login"
                                    ).permitAll()
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
        ;

        return http.build();
    }
}
