package com.test.backend.initializer;

import com.test.backend.entity.socialAccount.SocialAccount;
import com.test.backend.entity.socialAccount.SocialAccountProvider;
import com.test.backend.entity.user.Role;
import com.test.backend.entity.user.User;
import com.test.backend.repository.SocialAccountRepository;
import com.test.backend.repository.UserRepository;
import com.test.backend.service.jwt.JwtService;
import com.test.backend.service.jwt.TokenType;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Optional;

@RequiredArgsConstructor
@Component
@Order(2)
public class UserInit {

    private final UserRepository userRepository;

    private final SocialAccountRepository socialAccountRepository;

    private final JwtService jwtService;

    @Bean
    CommandLineRunner init(UserRepository userRepository) {
        return args -> {
            // Tạo 1 admin
            boolean isAdminExists;
            Optional<User> admin = userRepository.findByEmail("ngocquan612006@gmail.com");
            if(admin.isPresent()) {
                User adminUser = admin.get();
                if(!Role.Admin.equals(adminUser.getRole())) {
                    adminUser.setRole(Role.Admin);
                }
                userRepository.save(adminUser);
                return;
            }
            else {
                isAdminExists = false;
            }

            // Chưa có admin tạo
            if(!isAdminExists) {
                SocialAccount socialAccount = SocialAccount.builder()
                        .provider(SocialAccountProvider.GOOGLE)
                        .providerId("113635588445946844380")
                        .build();

                User newAdmin = User.builder()
                        .email("ngocquan612006@gmail.com")
                        .userName("Quanbroisdead")
                        .fullName("Trần Ngọc Quân")
                        .role(Role.Admin)
                        .isEnabled(Boolean.TRUE)
                        .build();

                newAdmin.addSocialAccount(socialAccount);
                userRepository.save(newAdmin);
            }

            User adminMain = userRepository.findByEmail("ngocquan612006@gmail.com")
                    .orElseThrow(() -> new RuntimeException("Admin not exists"));

            String email = adminMain.getEmail();

            String accessToken = jwtService.generateToken(new HashMap<>(), email, TokenType.ACCESS);
            String refreshToken = jwtService.generateToken(new HashMap<>(), email, TokenType.REFRESH);

            System.out.println("Access Token: " + accessToken);
            System.out.println("Refresh Token: " + refreshToken);
        }
        ;
    }
}