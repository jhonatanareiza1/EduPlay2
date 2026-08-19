import { describe, expect, it } from "vitest";

import {
    calculateScoreHandler,
} from "../src/functions/attempts/calculateScore";

describe("calculateScore", () => {
    it("calcula correctamente una puntuación", () => {
        const result = calculateScoreHandler({
            activityId: "activity-test-001",
            answers: {
                q1: { isCorrect: true },
                q2: { isCorrect: true },
                q3: { isCorrect: false },
                q4: { isCorrect: true },
            },
        });

        expect(result).toEqual({
            score: 8,
            correctAnswers: 3,
            totalAnswers: 4,
        });
    });

    it("devuelve cero cuando no hay respuestas", () => {
        const result = calculateScoreHandler({
            activityId: "activity-test-001",
            answers: {},
        });

        expect(result).toEqual({
            score: 0,
            correctAnswers: 0,
            totalAnswers: 0,
        });
    });

    it("rechaza activityId vacío", () => {
        expect(() =>
            calculateScoreHandler({
                activityId: "",
                answers: {},
            }),
        ).toThrow();
    });

    it("rechaza respuestas inválidas", () => {
        expect(() =>
            calculateScoreHandler({
                activityId: "activity-test-001",
                answers: null as unknown as Record<
                    string,
                    unknown
                >,
            }),
        ).toThrow();
    });
});