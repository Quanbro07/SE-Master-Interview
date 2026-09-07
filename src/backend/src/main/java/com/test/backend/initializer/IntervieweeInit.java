package com.test.backend.initializer;

import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.socialAccount.SocialAccount;
import com.test.backend.entity.socialAccount.SocialAccountProvider;
import com.test.backend.entity.user.Role;
import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewee.Interviewee;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.repository.IntervieweeRepository;
import com.test.backend.repository.UserRepository;
import com.test.backend.service.jwt.JwtService;
import com.test.backend.service.jwt.TokenType;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@RequiredArgsConstructor
@Component
public class IntervieweeInit {

    private final IntervieweeRepository intervieweeRepository;

    private final UserRepository userRepository;

    private final JwtService jwtService;

    @Order(3)
    @Bean
    CommandLineRunner initInterviewee() {
        return args -> {

            boolean isUserExists = userRepository.existsByEmail("downloadvpn612006@gmail.com");

            if (!isUserExists) {
                SocialAccount socialAccount = SocialAccount.builder()
                        .provider(SocialAccountProvider.GOOGLE)
                        .providerId("116906374507955881320")
                        .build();

                User newUser = User.builder()
                        .email("downloadvpn612006@gmail.com")
                        .userName("downloadvpn")
                        .fullName("Trần Ngọc downloadvpn")
                        .role(Role.Interviewee)
                        .isEnabled(Boolean.TRUE)
                        .build();

                newUser.addSocialAccount(socialAccount);
                userRepository.save(newUser);

                Interviewee newInterviewee = Interviewee.builder()
                        .subscriptionExpiredDate(LocalDate.now().plusDays(30))
                        .build();

                newInterviewee.setUser(newUser);

                intervieweeRepository.save(newInterviewee);


            }

            User interviewee = userRepository.findByEmail("downloadvpn612006@gmail.com")
                    .orElseThrow(() -> new RuntimeException("Interviewer is not exists"));

            String email = interviewee.getEmail();

            String accessToken = jwtService.generateToken(new HashMap<>(), email, TokenType.ACCESS);
            String refreshToken = jwtService.generateToken(new HashMap<>(), email, TokenType.REFRESH);

            System.out.println("=== INTERVIEWEE TOKENS ===");
            System.out.println("Interviewee Access Token: " + accessToken);
            System.out.println("Interviewee Refresh Token: " + refreshToken);
        };
    }
}
