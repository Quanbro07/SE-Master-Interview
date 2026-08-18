package com.test.backend.service;


import com.test.backend.repository.PositionRepository;
import com.test.backend.entity.position.Position;
import lombok.RequiredArgsConstructor;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PositionResolverService {

    private final PositionRepository positionRepository;
    private final JaroWinklerSimilarity similarity = new JaroWinklerSimilarity();

    // Minimum similarity score threshold (0.0 to 1.0)
    private static final double SIMILARITY_THRESHOLD = 0.70;

    public String resolvePosition(String rawInput) {
        if (rawInput == null || rawInput.isBlank()) {
            return rawInput;
        }

        List<String> validPositions = positionRepository.findAll().stream()
                .map(Position::getPositionName)
                .toList();

        String normalizedInput = rawInput.trim().toLowerCase();

        // Tier 1: Exact Case-Insensitive Match
        for (String dbPos : validPositions) {
            if (dbPos.equalsIgnoreCase(normalizedInput)) {
                return dbPos;
            }
        }

        // Tier 2: Substring / Word Match
        for (String dbPos : validPositions) {
            String dbPosLower = dbPos.toLowerCase();
            if (dbPosLower.contains(normalizedInput) || normalizedInput.contains(dbPosLower)) {
                return dbPos;
            }
        }

        // Tier 3: Fuzzy Similarity Match (Jaro-Winkler)
        String bestMatch = null;
        double maxScore = 0.0;

        for (String dbPos : validPositions) {
            double score = similarity.apply(normalizedInput, dbPos.toLowerCase());
            if (score > maxScore) {
                maxScore = score;
                bestMatch = dbPos;
            }
        }

        // Return best match if score exceeds confidence threshold, else return rawInput
        return (maxScore >= SIMILARITY_THRESHOLD) ? bestMatch : rawInput;
    }
}