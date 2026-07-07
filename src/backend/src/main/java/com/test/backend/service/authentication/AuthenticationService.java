package com.test.backend.service.authentication;

import com.test.backend.dto.authentication.AuthenticationResponse;
import com.test.backend.dto.authentication.RegisterRequest;
import com.test.backend.entity.socialAccount.SocialAccount;
import com.test.backend.entity.socialAccount.SocialAccountProvider;
import com.test.backend.entity.user.User;
import com.test.backend.exception.customException.AlreadyExistException;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.SocialAccountRepository;
import com.test.backend.repository.UserRepository;
import com.test.backend.service.SocialAccountService;
import com.test.backend.service.UserService;
import com.test.backend.service.jwt.JwtService;
import com.test.backend.service.jwt.TokenType;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepository userRepository;

    private final UserService userService;

    private final SocialAccountService socialAccountService;

    private final JwtService jwtService;

    private final SocialAccountRepository socialAccountRepository;

    @Transactional
    public AuthenticationResponse register(RegisterRequest registerRequest, String tempToken) {
        Claims claims = jwtService.extractAllClaims(tempToken);

        String email = claims.getSubject();

        Boolean isUserExist = userRepository.existsByEmail(email);

        if (isUserExist) {
            throw new AlreadyExistException("Error - Cannot Register! User already exist");
        }

        // Tạo user mới
        User newUser = userService.createUserAndReturn(registerRequest);

        String providerStr = claims.get("provider", String.class);
        String providerId = claims.get("providerUserId", String.class);

        SocialAccountProvider provider = SocialAccountProvider.valueOf(providerStr.toUpperCase());

        Boolean isSocialAccountExist = socialAccountRepository.existsByProviderAndProviderId(provider, providerId);

        if (isSocialAccountExist) {
            throw new AlreadyExistException("Error - Cannot Register! Social Account already exist");
        }

        // Tao social Account mới
        SocialAccount newSocialAccount = socialAccountService.createSocialAccountAndReturn(provider, providerId);

        // Liên kết
        newUser.addSocialAccount(newSocialAccount);

        userRepository.save(newUser);

        return buildAuthenticationResponse(newUser);
    }

    @Transactional
    public AuthenticationResponse login(String tempToken) {
        Claims claims = jwtService.extractAllClaims(tempToken);

        String email = claims.getSubject();
        String providerStr = claims.get("provider", String.class);
        String providerId = claims.get("providerUserId", String.class);


        SocialAccountProvider provider = SocialAccountProvider.valueOf(providerStr.toUpperCase());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Error - Cannot Login! User Not Found"));

        Boolean isSocialAccountExist = socialAccountRepository.existsByProviderAndProviderId(provider, providerId);

        if (!isSocialAccountExist) {
            // Chưa tồn tại
            // Tao social Account mới
            SocialAccount newSocialAccount = socialAccountService.createSocialAccountAndReturn(provider, providerId);

            user.addSocialAccount(newSocialAccount);
            userRepository.save(user);
        }
        return buildAuthenticationResponse(user);
    }

    // Helper Function
    private AuthenticationResponse buildAuthenticationResponse(User user) {
        Map<String, Object> extrClaims = new HashMap<>();
        String email = user.getEmail();

        String accessToken = jwtService.generateToken(extrClaims,email, TokenType.ACCESS);
        String refreshToken = jwtService.generateToken(extrClaims,email, TokenType.REFRESH);

        return AuthenticationResponse.builder()
                .email(user.getEmail())
                .userName(user.getUserName())
                .fullName(user.getFullName())
                .linkedinUrl(user.getLinkedinUrl())
                .githubUrl(user.getGithubUrl())
                .role(user.getRole())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build()
                ;
    }
}
