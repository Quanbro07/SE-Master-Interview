package com.test.backend.service;

import com.test.backend.dto.evaluation.*;
import com.test.backend.entity.answerKeyword.AnswerKeyword;
import com.test.backend.repository.AnswerKeywordRepository;
import com.test.backend.repository.QuestionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@RequiredArgsConstructor
@Service
public class EvaluationAnswerService {

    private final AnswerKeywordRepository answerKeywordRepository;

    private final Set<String> UNCERTAIN_WORD = Set.of(
            "maybe", "might", "think", "probably", "hopefully", "umm", "um", "uh"
    );

    private final Set<String> CERTAIN_WORD = Set.of(
            "achieved", "successfully", "spearheaded", "confident", "confidently", "definite", "definitely", "proved"
    );

    private final String[] EXAMPLE_PHRASES = {
            "for example", "for instance", "specifically", "such as", "case in point"
    };

    private final Set<String> englishDictionary = new HashSet<>();

    private final String DICTIONARY_FILE = "dictionary.txt";

    @PostConstruct
    public void loadDictionary() {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(new ClassPathResource(DICTIONARY_FILE).getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                englishDictionary.add(line.trim().toLowerCase());
            }
        } catch (Exception e) {
            System.err.println("Không thể load file từ điển: " + e.getMessage());
        }
    }

    // Main Function
    public EvaluationResultDTO evaluateAnswer(Long questionId, String originalAnswer) {
        String cleanAnswer = originalAnswer.toLowerCase().replaceAll("[.,!?;:()\"'-]", "");
        String[] answerWords = cleanAnswer.split("\\s+");
        int wordCount = answerWords.length;

        // 2. Lấy dữ liệu từ DB và phân tích các chỉ số
        List<AnswerKeyword> keywordList = answerKeywordRepository.findAllByQuestion_QuestionId(questionId);

        RelevanceDTO relevance = getIndustryRelevant(answerWords, keywordList);
        ConfidenceDTO confidence = getConfidentLevel(answerWords);
        DepthDTO depth = getAnswerDepth(originalAnswer.toLowerCase(), wordCount); // Dùng originalAnswer để giữ lại dấu câu/số

        boolean isEnglishValid = checkEnglishValidation(answerWords);
        ComparisonDTO comparison = getCompareStatus(wordCount);

        // Phân tích Pattern
        // 3. Phân tích Patterns & Đưa ra Suggestion
        List<String> recurringPatterns = new ArrayList<>();
        List<String> smartSuggestions = new ArrayList<>();

        if (!isEnglishValid) {
            recurringPatterns.add("Answer unclear or non-English");
            smartSuggestions.add("Answer in English with clear, understandable words");
        }
        if (wordCount < 20) {
            recurringPatterns.add("Answer is too short");
            smartSuggestions.add("Try to elaborate more on your points.");
        }
        if (depth.getUsedExamplesPercentage() == 0) {
            recurringPatterns.add("Answers lack specific examples");
            smartSuggestions.add("Use the STAR method to provide specific examples.");
        }
        if (confidence.getUncertainWordsCount() > confidence.getConfidentWordsCount()) {
            recurringPatterns.add("High usage of uncertain words");
            smartSuggestions.add("Practice regularly to improve confidence and avoid filler words.");
        }

        // 4. Ráp toàn bộ vào DTO tổng để trả về Controller
        AnalysisDTO analysisDTO = AnalysisDTO.builder()
                .depth(depth)
                .relevance(relevance)
                .confidence(confidence)
                .comparison(comparison)
                .recurringPatterns(recurringPatterns)
                .smartSuggestions(smartSuggestions)
                .build();

        return EvaluationResultDTO.builder()
                .questionId(questionId)
                .analysis(analysisDTO)
                .build();


    }

    private RelevanceDTO getIndustryRelevant(String[] answerWord, List<AnswerKeyword> keywordList) {
        BigDecimal totalWeight = BigDecimal.valueOf(0);
        Map<String, BigDecimal> keywordMap = new HashMap<>();

        for(AnswerKeyword keyword : keywordList) {
            keywordMap.put(keyword.getKeyword(), keyword.getWeight());
            keywordMap.put(keyword.getKeyword().toLowerCase(), keyword.getWeight());

            totalWeight = totalWeight.add(keyword.getWeight());
        }

        BigDecimal answerWeightMatch = BigDecimal.ZERO;
        Set<String> matchedKeywords = new HashSet<>();
        int matchedWordCount = 0;

        int matchedCount = 0;

        for (String word : answerWord) {
            if (keywordMap.containsKey(word) && !matchedKeywords.contains(word)) {
                answerWeightMatch = answerWeightMatch.add(keywordMap.get(word));
                matchedKeywords.add(word);
                matchedCount++;
            }
        }

        BigDecimal scorePercentage = (totalWeight.compareTo(BigDecimal.ZERO) == 0)
                ? BigDecimal.ZERO
                : answerWeightMatch.divide(totalWeight, 2, RoundingMode.HALF_UP);

        String status = "Low Relevance";
        if (scorePercentage.doubleValue() >= 0.7) status = "High Relevance";
        else if (scorePercentage.doubleValue() >= 0.4) status = "Moderate Relevance";

        return RelevanceDTO.builder()
                .matchedKeywords(matchedCount)
                .totalKeywords(keywordList.size())
                .status(status)
                .build();

    }

    private ConfidenceDTO getConfidentLevel(String[] answerWord) {
        int uncertainCount = 0;
        int confidentCount = 0;

        for(String word : answerWord) {
            if(UNCERTAIN_WORD.contains(word)) {
                uncertainCount++;
            }
            else if(CERTAIN_WORD.contains(word)) {
                confidentCount++;
            }
        }

        String status = "Balanced";
        if (uncertainCount > confidentCount) status = "Needs Improvement";
        else if (confidentCount > uncertainCount) status = "Highly Confident";

        return ConfidenceDTO.builder()
                .uncertainWordsCount(uncertainCount)
                .confidentWordsCount(confidentCount)
                .status(status)
                .build();
    }

    private DepthDTO getAnswerDepth(String originalAnswer, int wordCount) {
        Pattern numberPattern = Pattern.compile("\\b\\d+\\b");
        Matcher matcher = numberPattern.matcher(originalAnswer);
        int specificDetailsCount = 0;
        while (matcher.find()) specificDetailsCount++;

        int exampleCount = 0;
        for (String phrase : EXAMPLE_PHRASES) {
            if (originalAnswer.contains(phrase)) exampleCount++;
        }

        // Tránh chia cho 0 nếu user không nói gì
        int examplePercentage = (wordCount == 0) ? 0 : Math.min(100, (exampleCount * 100) / (wordCount / 10 + 1));

        String rating = (specificDetailsCount > 0 || exampleCount > 0) ? "Good Depth" : "Needs Improvement";

        return DepthDTO.builder()
                .specificDetailsCount(specificDetailsCount)
                .usedExamplesPercentage(examplePercentage)
                .rating(rating)
                .build();
    }

    // Hàm check tỷ lệ tiếng Anh
    private boolean checkEnglishValidation(String[] answerWords) {
        if (answerWords.length == 0) return false;

        int validWordCount = 0;
        for (String word : answerWords) {
            if (englishDictionary.contains(word)) {
                validWordCount++;
            }
        }

        // Tính tỷ lệ từ hợp lệ
        double validRatio = (double) validWordCount / answerWords.length;

        // Nếu tỷ lệ từ tiếng Anh chuẩn > 50%, coi như câu trả lời hợp lệ
        return validRatio > 0.5;
    }

    // CompareStatus
    private ComparisonDTO getCompareStatus(int wordCount) {
        int benchmarkWords = 60;
        String compareStatus;
        if (wordCount < benchmarkWords * 0.5) {
            compareStatus = "Below Average";
        } else if (wordCount > benchmarkWords * 1.5) {
            compareStatus = "Above Average";
        } else {
            compareStatus = "Average";
        }

        return ComparisonDTO.builder()
                .avgWords(wordCount)
                .benchmarkWords(benchmarkWords)
                .status(compareStatus)
                .build();
    }


}
