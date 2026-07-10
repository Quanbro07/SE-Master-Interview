package com.test.backend.dto.evaluation;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RelevanceDTO {
    private int matchedKeywords;
    private int totalKeywords;
    private String status;
}
