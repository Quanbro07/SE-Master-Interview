package com.test.backend.initializer;

import com.test.backend.entity.socialAccount.SocialAccount;
import com.test.backend.entity.socialAccount.SocialAccountProvider;
import com.test.backend.entity.user.Role;
import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.repository.InterviewerRepository;
import com.test.backend.repository.UserRepository;
import com.test.backend.service.jwt.JwtService;
import com.test.backend.service.jwt.TokenType;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.HashMap;

@RequiredArgsConstructor
@Component
@Order(3)
public class InterviewerInnit {

    private final InterviewerRepository interviewerRepository;

    private final UserRepository userRepository;

    private final JwtService jwtService;

    @Value("${init.isDev}")
    private boolean isDev;

    @Bean
    CommandLineRunner initInterviewer() {
        return args -> {
            if(!isDev) {
                return;
            }

            boolean isUserExists = userRepository.existsByEmail("quanbro7612006@gmail.com");

            if(!isUserExists) {
                SocialAccount socialAccount = SocialAccount.builder()
                        .provider(SocialAccountProvider.GOOGLE)
                        .providerId("118345548882952024278")
                        .build();

                User newUser = User.builder()
                        .email("quanbro7612006@gmail.com")
                        .userName("quanbro7")
                        .fullName("Trần Ngọc Bro")
                        .role(Role.Interviewer)
                        .isEnabled(Boolean.TRUE)
                        .build();

                newUser.addSocialAccount(socialAccount);
                userRepository.save(newUser);

                Interviewer newInterviewer = Interviewer.builder().build();
                newInterviewer.setUser(newUser);

                interviewerRepository.save(newInterviewer);
            }

            User interviewer = userRepository.findByEmail("quanbro7612006@gmail.com")
                    .orElseThrow(() -> new RuntimeException("Interviewer is not exists"));

            String email = interviewer.getEmail();

            String accessToken = jwtService.generateToken(new HashMap<>(), email, TokenType.ACCESS);
            String refreshToken = jwtService.generateToken(new HashMap<>(), email, TokenType.REFRESH);

            System.out.println("Interviewer Access Token: " + accessToken);
            System.out.println("Interviewer Refresh Token: " + refreshToken);

        };
    }
}
