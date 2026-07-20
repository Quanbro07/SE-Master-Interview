package com.test.backend.service;

import com.test.backend.entity.position.Position;
import com.test.backend.entity.positionQuestion.PositionQuestion;
import com.test.backend.entity.question.Question;
import com.test.backend.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@RequiredArgsConstructor
@Service
public class PositionService {
    private final PositionRepository positionRepository;

    public void linkQuestion(Question question, String positionName) {
        Position position = this.checkCreateAndReturn(positionName);

        PositionQuestion positionQuestion = PositionQuestion.builder().build();

        positionQuestion.setQuestion(question);
        positionQuestion.setPosition(position);
    }

    public Position checkCreateAndReturn(String positionName) {
        positionName = positionName.trim().replaceAll("\\s+", " ");

        Optional<Position> position = positionRepository.findByPositionNameIgnoreCase(positionName);
        if (position.isPresent()) {
            return position.get();
        }

        Position newPosition = Position.builder().positionName(positionName).build();
        try {
            positionRepository.save(newPosition);
        }
        catch (DataIntegrityViolationException ex) {
            return positionRepository.findByPositionNameIgnoreCase(positionName)
                    .orElseThrow(() -> ex);
        }

        return newPosition;
    }


}
