package com.test.backend.dto.evaluation;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ComparisonDTO {
    private int avgWords;
    private int benchmarkWords;
    private String status;
}
