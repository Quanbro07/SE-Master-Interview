    package com.test.backend.initializer;

    import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
    import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
    import com.test.backend.entity.position.Position;
    import com.test.backend.entity.socialAccount.SocialAccount;
    import com.test.backend.entity.socialAccount.SocialAccountProvider;
    import com.test.backend.entity.user.Role;
    import com.test.backend.entity.user.User;
    import com.test.backend.entity.user.interviewer.Interviewer;
    import com.test.backend.exception.customException.NotFoundException;
    import com.test.backend.repository.InterviewerExpertiseRepository;
    import com.test.backend.repository.InterviewerRepository;
    import com.test.backend.repository.PositionRepository;
    import com.test.backend.repository.UserRepository;
    import com.test.backend.service.jwt.JwtService;
    import com.test.backend.service.jwt.TokenType;
    import lombok.RequiredArgsConstructor;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.boot.CommandLineRunner;
    import org.springframework.context.annotation.Bean;
    import org.springframework.core.annotation.Order;
    import org.springframework.stereotype.Component;

    import java.math.BigDecimal;
    import java.util.ArrayList;
    import java.util.HashMap;
    import java.util.List;

    @RequiredArgsConstructor
    @Component
    public class InterviewerInnit {

        private final InterviewerRepository interviewerRepository;

        private final UserRepository userRepository;

        private final JwtService jwtService;

        private final PositionRepository positionRepository;

        private final InterviewerExpertiseRepository interviewerExpertiseRepository;

        @Value("${init.isDev}")
        private boolean isDev;

        private final List<String> positionList = List.of(
                "quality assurance",
                "software engineer",
                "cloud computing"
        );


        @Order(3)
        @Bean
        CommandLineRunner initInterviewer() {
            return args -> {

                boolean isUserExists = userRepository.existsByEmail("quanbro7612006@gmail.com");
                Interviewer currentInterviewer;

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

                    Interviewer newInterviewer = Interviewer.builder()
                            .stripeAccountId("acct_1TwyL2JJyijhpJey")
                            .overallRating(4.0)
                            .totalReviews(5)
                            .isStripeConnected(Boolean.TRUE)
                            .build();

                    newInterviewer.setUser(newUser);

                    interviewerRepository.save(newInterviewer);
                    currentInterviewer = newInterviewer;
                }
                else {
                    currentInterviewer = interviewerRepository.findByUserEmailFetchUser("quanbro7612006@gmail.com")
                            .orElseThrow(()-> new NotFoundException("Interviewer Not found"));
                }

                List<Position> positions = positionRepository.findAllByPositionNameInIgnoreCase(positionList);

                System.out.println(positions.size());

                if(!positions.isEmpty()) {
                    List<InterviewerExpertise> interviewerExpertises = new ArrayList<>();


                    for(Position position : positions) {
                        if(interviewerExpertiseRepository
                                .existsByInterviewer_InterviewerIdAndPosition_PositionId(
                                        currentInterviewer.getInterviewerId(),
                                        position.getPositionId()
                                )
                        ) {
                            continue;
                        }

                            InterviewerExpertise expertise = InterviewerExpertise.builder()
                                .interviewer(currentInterviewer)
                                .position(position)
                                .level(InterviewerExpertiseLevel.FRESHER)
                                .experienceYear(1)
                                .hourlyFee(BigDecimal.valueOf(5))
                                .isCertified(Boolean.TRUE)
                                .build();

                        interviewerExpertises.add(expertise);
                    }

                    interviewerExpertiseRepository.saveAll(interviewerExpertises);
                    System.out.println("DONE INSERT EXPERTISE: " + interviewerExpertises.size());
                }

                User interviewer = userRepository.findByEmail("quanbro7612006@gmail.com")
                        .orElseThrow(() -> new RuntimeException("Interviewer is not exists"));

                String email = interviewer.getEmail();

                String accessToken = jwtService.generateToken(new HashMap<>(), email, TokenType.ACCESS);
                String refreshToken = jwtService.generateToken(new HashMap<>(), email, TokenType.REFRESH);

                System.out.println("=== INTERVIEWER TOKENS ===");
                System.out.println("Interviewer Access Token: " + accessToken);
                System.out.println("Interviewer Refresh Token: " + refreshToken);

            };
        }
    }
