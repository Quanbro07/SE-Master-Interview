package com.test.backend.config;

import com.test.backend.oauth2.customService.CustomOauth2UserService;
import com.test.backend.oauth2.customUser.CustomOidcUserService;
import com.test.backend.oauth2.successHandler.AuthenticationSuccessHandler;
import com.test.backend.filterChain.JwtFilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class SecurityConfigTest {

    @Test
    void corsConfigurationShouldAllowPatchAndPreflightRequests() {
        SecurityConfig securityConfig = new SecurityConfig(
                mock(CustomOauth2UserService.class),
                mock(CustomOidcUserService.class),
                mock(AuthenticationSuccessHandler.class),
                mock(JwtFilterChain.class)
        );

        CorsConfigurationSource source = securityConfig.corsConfigurationSource();
        CorsConfiguration corsConfiguration = source.getCorsConfiguration(new MockHttpServletRequest());

        assertThat(corsConfiguration).isNotNull();
        assertThat(corsConfiguration.getAllowedMethods())
                .contains("PATCH")
                .contains("OPTIONS");
    }
}
