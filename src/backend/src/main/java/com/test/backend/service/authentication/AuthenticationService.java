package com.test.backend.service.authentication;

import com.test.backend.dto.authentication.AuthenticationResponse;
import com.test.backend.dto.authentication.RegisterRequest;
import com.test.backend.entity.socialAccount.SocialAccount;
import com.test.backend.entity.socialAccount.SocialAccountProvider;
import com.test.backend.entity.user.Role;
import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewee.Interviewee;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.AlreadyExistException;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.IntervieweeRepository;
import com.test.backend.repository.InterviewerRepository;
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

    private final IntervieweeRepository intervieweeRepository;

    private final InterviewerRepository interviewerRepository;

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

        // lưu User xuống trc để pass user cho bảng interviewee và interviewer
        userRepository.save(newUser);

        // check Role để tạo
        if(registerRequest.role() == Role.Interviewee) {
            Interviewee interviewee = Interviewee
                    .builder()
                    .user(newUser)
                    .build();

            intervieweeRepository.save(interviewee);

        } else if (registerRequest.role() == Role.Interviewer) {
            Interviewer interviewer = Interviewer
                    .builder()
                    .user(newUser)
                    .build();

            interviewerRepository.save(interviewer);
        }

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
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("userId", user.getUserId());

        String email = user.getEmail();

        String accessToken = jwtService.generateToken(extraClaims,email, TokenType.ACCESS);
        String refreshToken = jwtService.generateToken(extraClaims,email, TokenType.REFRESH);

        AuthenticationResponse.AuthenticationResponseBuilder responseBuilder =  AuthenticationResponse.builder()
                .email(user.getEmail())
                .userName(user.getUserName())
                .fullName(user.getFullName())
                .linkedinUrl(user.getLinkedinUrl())
                .githubUrl(user.getGithubUrl())
                .role(user.getRole())
                .accessToken(accessToken)
                .refreshToken(refreshToken);

        if(user.getRole() == Role.Interviewee) {
            Interviewee interviewee = intervieweeRepository.findByIntervieweeId(user.getUserId())
                    .orElseThrow(() -> new NotFoundException("Error - Cannot find Interviewee based on userId"));

            responseBuilder.subscriptionExpiredDate(interviewee.getSubscriptionExpiredDate());
        }
        else if (user.getRole() == Role.Interviewer) {
            Interviewer interviewer = interviewerRepository.findByInterviewerId(user.getUserId())
                    .orElseThrow(() -> new NotFoundException("Error - Cannot find Interviewer based on userId"));

            responseBuilder.isStripeConnected(interviewer.getIsStripeConnected());
            responseBuilder.stripeAccountId(interviewer.getStripeAccountId());
        }

        return responseBuilder.build();
    }
}
