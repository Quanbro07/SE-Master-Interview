package com.test.backend.service;

import com.test.backend.dto.evaluation.*;
import com.test.backend.entity.answerKeyword.AnswerKeyword;
import com.test.backend.entity.question.Question;
import com.test.backend.repository.AnswerKeywordRepository;
import com.test.backend.repository.QuestionRepository;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityNotFoundException;
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

    private final QuestionRepository questionRepository;

    private static final int DEFAULT_BENCHMARK_WORDS = 60;

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

    public List<EvaluationResultDTO> evaluateAllAnswers(EvaluationRequest request) {
        return request.evaluationDTOList().stream()
                .map(re -> this.evaluateAnswer(re.questionId(), re.answer()))
                .toList();
    }

    // Main Function
    private EvaluationResultDTO evaluateAnswer(Long questionId, String originalAnswer) {
        String cleanAnswer = originalAnswer.toLowerCase().replaceAll("[.,!?;:()\"'-]", "");
        String[] answerWords = cleanAnswer.split("\\s+");
        int wordCount = answerWords.length;

        // 2. Lấy dữ liệu từ DB và phân tích các chỉ số
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new EntityNotFoundException("Question not found"));

        List<AnswerKeyword> keywordList = answerKeywordRepository.findAllByQuestion_QuestionId(questionId);

        int benchmarkWords = resolveBenchmarkWords(question.getSuggestionAnswer());
        Set<String> keywordWordSet = buildKeywordWordSet(keywordList);

        RelevanceDTO relevance = getIndustryRelevant(originalAnswer.toLowerCase(), keywordList);
        ConfidenceDTO confidence = getConfidentLevel(answerWords);
        DepthDTO depth = getAnswerDepth(originalAnswer.toLowerCase(), wordCount);
        boolean isEnglishValid = checkEnglishValidation(answerWords, keywordWordSet);
        ComparisonDTO comparison = getCompareStatus(wordCount, benchmarkWords);

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

    private RelevanceDTO getIndustryRelevant(String originalAnswerLower, List<AnswerKeyword> keywordList) {
        BigDecimal totalWeight = BigDecimal.ZERO;
        BigDecimal matchedWeight = BigDecimal.ZERO;
        int matchedCount = 0;

        for (AnswerKeyword keyword : keywordList) {
            BigDecimal weight = keyword.getWeight();
            totalWeight = totalWeight.add(weight);

            String kw = keyword.getKeyword().toLowerCase();
            if (containsWholeWord(originalAnswerLower, kw)) {
                matchedWeight = matchedWeight.add(weight);
                matchedCount++;
            }
        }

        BigDecimal scorePercentage = (totalWeight.compareTo(BigDecimal.ZERO) == 0)
                ? BigDecimal.ZERO
                : matchedWeight.divide(totalWeight, 2, RoundingMode.HALF_UP);

        String status = "Low Relevance";
        if (scorePercentage.doubleValue() >= 0.7) status = "High Relevance";
        else if (scorePercentage.doubleValue() >= 0.4) status = "Moderate Relevance";

        return RelevanceDTO.builder()
                .matchedKeywords(matchedCount)
                .totalKeywords(keywordList.size())
                .status(status)
                .build();
    }

    // match theo cụm từ, có word-boundary, không phân biệt hoa/thường
    private boolean containsWholeWord(String text, String phrase) {
        String regex = "\\b" + Pattern.quote(phrase) + "\\b";
        return Pattern.compile(regex).matcher(text).find();
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

    private boolean checkEnglishValidation(String[] answerWords, Set<String> industryKeywordsLower) {
        if (answerWords.length == 0) return false;

        int validWordCount = 0;
        int checkedWordCount = 0;

        for (String word : answerWords) {
            if (industryKeywordsLower.contains(word)) {
                // từ chuyên ngành -> không tính vào tử số kiểm tra "tiếng Anh"
                continue;
            }
            checkedWordCount++;
            if (englishDictionary.contains(word)) {
                validWordCount++;
            }
        }

        if (checkedWordCount == 0) return true; // toàn bộ là thuật ngữ ngành -> coi như hợp lệ
        double validRatio = (double) validWordCount / checkedWordCount;
        return validRatio > 0.5;
    }

    // CompareStatus
    private ComparisonDTO getCompareStatus(int wordCount, int benchmarkWords) {
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

    // Lấy số từ trong suggestion_answer làm chuẩn so sánh.
    // Nếu câu hỏi chưa có suggestion_answer thì fallback về số mặc định.

    private int resolveBenchmarkWords(String suggestionAnswer) {
        if (suggestionAnswer == null || suggestionAnswer.isBlank()) {
            return DEFAULT_BENCHMARK_WORDS;
        }
        return suggestionAnswer.trim().split("\\s+").length;
    }

    // Tách các keyword (có thể là cụm nhiều từ) thành tập từ đơn, lowercase,
    // dùng để loại trừ thuật ngữ chuyên ngành khỏi phép kiểm tra "tiếng Anh"

    private Set<String> buildKeywordWordSet(List<AnswerKeyword> keywordList) {
        Set<String> result = new HashSet<>();
        for (AnswerKeyword keyword : keywordList) {
            String kw = keyword.getKeyword().toLowerCase();
            for (String w : kw.split("\\s+")) {
                result.add(w);
            }
        }
        return result;
    }

}
