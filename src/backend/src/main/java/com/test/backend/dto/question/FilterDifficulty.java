package com.test.backend.dto.question;

import com.test.backend.entity.question.Difficulty;

public enum FilterDifficulty {
    EASY(Difficulty.EASY),
    MEDIUM(Difficulty.MEDIUM),
    HARD(Difficulty.HARD),
    MIXED(null);

    private final Difficulty difficulty;

    FilterDifficulty(Difficulty difficulty) {
        this.difficulty = difficulty;
    }

    public Difficulty toDifficulty() {
        return difficulty;
    }
}
