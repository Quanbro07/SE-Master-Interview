package com.test.backend.dto.question;

import com.test.backend.entity.question.Difficulty;

public enum InsertDifficulty {
    Fresher(Difficulty.EASY),
    Experienced(Difficulty.HARD);

    private final Difficulty difficulty;

    InsertDifficulty(Difficulty difficulty) {
        this.difficulty = difficulty;
    }

    public Difficulty toDifficulty() {
        return difficulty;
    }
}
