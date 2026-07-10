package com.test.backend.dto.evaluation;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AnalysisDTO {
    private DepthDTO depth;
    private RelevanceDTO relevance;
    private ConfidenceDTO confidence;
    private ComparisonDTO comparison;
    private List<String> recurringPatterns;
    private List<String> smartSuggestions;
}
