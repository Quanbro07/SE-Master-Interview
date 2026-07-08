package com.test.backend.dto.evaluation;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConfidenceDTO {
    private int uncertainWordsCount;
    private int confidentWordsCount;
    private String status;
}
