package com.test.backend.dto.evaluation;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DepthDTO {
    private int specificDetailsCount;
    private int usedExamplesPercentage;
    private String rating;
}
