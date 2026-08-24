import {
    describe,
    expect,
    it,
} from "vitest";

import {
    calculateScoreHandler,
} from "../src/functions/attempts/calculateScore";

describe("calculateScore", () => {
    it("calcula correctamente una puntuación usando la clave privada", () => {
        const result =
            calculateScoreHandler({
                activityId:
                    "activity-test-001",

                answers: {
                    q1: "option-a",
                    q2: "option-b",
                    q3: "option-a",
                    q4: "option-c",
                },

                answerKey: {
                    q1: "option-a",
                    q2: "option-b",
                    q3: "option-b",
                    q4: "option-c",
                },
            });

        expect(result.score).toBe(8);
        expect(result.correctAnswers)
            .toBe(3);
        expect(result.totalQuestions)
            .toBe(4);
        expect(result.passed)
            .toBe(true);
    });

    it("devuelve cero cuando no hay respuestas", () => {
        const result =
            calculateScoreHandler({
                activityId:
                    "activity-test-001",

                answers: {},

                answerKey: {
                    q1: "option-a",
                    q2: "option-b",
                },
            });

        expect(result.score).toBe(0);
        expect(result.correctAnswers)
            .toBe(0);
        expect(result.totalQuestions)
            .toBe(2);
        expect(result.passed)
            .toBe(false);
    });

    it("rechaza activityId vacío", () => {
        expect(() =>
            calculateScoreHandler({
                activityId: "",
                answers: {},
                answerKey: {},
            }),
        ).toThrow();
    });

    it("rechaza respuestas inválidas", () => {
        expect(() =>
            calculateScoreHandler({
                activityId:
                    "activity-test-001",

                answers:
                    null as unknown as Record<
                        string,
                        unknown
                    >,

                answerKey: {},
            }),
        ).toThrow();
    });

    it("no permite que isCorrect manipule la puntuación", () => {
        const result =
            calculateScoreHandler({
                activityId:
                    "activity-test-001",

                answers: {
                    q1: {
                        isCorrect: true,
                    },
                },

                answerKey: {
                    q1: "option-b",
                },
            });

        expect(result.correctAnswers)
            .toBe(0);

        expect(result.score)
            .toBe(0);
    });

    it("acepta respuestas múltiples sin importar el orden", () => {
        const result =
            calculateScoreHandler({
                activityId:
                    "activity-test-001",

                answers: {
                    q1: [
                        "option-b",
                        "option-a",
                    ],
                },

                answerKey: {
                    q1: [
                        "option-a",
                        "option-b",
                    ],
                },
            });

        expect(result.correctAnswers)
            .toBe(1);

        expect(result.score)
            .toBe(10);
    });
});