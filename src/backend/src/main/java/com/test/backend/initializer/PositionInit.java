package com.test.backend.initializer;

import com.test.backend.entity.position.Position;
import com.test.backend.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@RequiredArgsConstructor
@Component
@Order(1)
public class PositionInit {


    @Value("${init.isDev}")
    private boolean isDev;

    private final PositionRepository positionRepository;

    @Bean
    CommandLineRunner initPosition() {
        return args -> {
            if(!isDev) {
                return;
            }

            String[] positionList = {
                    // Software Engineer
                    "Software Engineer I", "Software Engineer II",
                    "Senior Software Engineer", "Staff Software Engineer",
                    "Principal Software Engineer",
                    // Developer
                    "Java Developer", "React Developer", "Full Stack Developer",
                    "Frontend Developer", "Backend Developer",

                    "Data Analyst", "Data Engineer", "Data Scientist", "Data Architect"
            };

            List<Position> positions = new ArrayList<>();

            for(String position: positionList) {
                if (!positionRepository.existsByPositionNameIgnoreCase(position)) {
                    Position newPosition = Position.builder()
                            .positionName(position)
                            .build();

                    positions.add(newPosition);
                }
            }

            positionRepository.saveAll(positions);
        };
    }
}
