package com.test.backend.initializer;

import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertiseLevel;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.user.User;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.InterviewerExpertiseRepository;
import com.test.backend.repository.InterviewerRepository;
import com.test.backend.repository.PositionRepository;
import com.test.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
@Component
public class InterviewerExpertiseInit {

    @Value("${init.isDev}")
    private boolean isDev;

    private final InterviewerRepository interviewerRepository;

    private final InterviewerExpertiseRepository expertiseRepository;

    private final PositionRepository positionRepository;

    private final List<String> positionName = List.of("Java Developer", "React Developer", "Full Stack Developer",
            "Frontend Developer", "Backend Developer");


    @Order(4)
    @Bean
    CommandLineRunner initExpertise() {
        return args -> {
            if(!isDev) {
                return;
            }

            Interviewer interviewer = interviewerRepository.findByUserEmailFetchUser("quanbro7612006@gmail.com")
                    .orElseThrow(() -> new NotFoundException("Interviewer Not Found"));

            List<Position> positions = positionRepository.findAllByPositionNameIn(positionName);

            if(positions.isEmpty()) {
                log.info("No Position to attach expertise!");
                return;
            }

            List<InterviewerExpertise> interviewerExpertises = new ArrayList<>();
            for(Position position: positions) {

                InterviewerExpertise expertise = InterviewerExpertise.builder()
                        .interviewer(interviewer)
                        .position(position)
                        .level(InterviewerExpertiseLevel.FRESHER)
                        .experienceYear(1)
                        .hourlyFee(BigDecimal.valueOf(5))
                        .isCertified(Boolean.TRUE)
                        .build();

                interviewerExpertises.add(expertise);
            }

            expertiseRepository.saveAll(interviewerExpertises);

            System.out.println("DONE insert " + interviewerExpertises.size() + " expertises" + " into Interviewer");
        };

    }
}
